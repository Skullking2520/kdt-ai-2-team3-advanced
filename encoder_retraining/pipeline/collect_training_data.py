from __future__ import annotations

import argparse
import asyncio
import csv
import hashlib
import json
import os
import re
import unicodedata
from collections import Counter
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

DEFAULT_MANUAL_PATH = (
    Path(__file__).resolve().parents[1] / "data" / "incoming" / "manual_incidents.csv"
)
DEFAULT_OUTPUT_ROOT = Path(__file__).resolve().parents[1] / "data" / "collected"
WHITESPACE_PATTERN = re.compile(r"\s+")


@dataclass(frozen=True)
class TrainingSample:
    text: str
    label: int
    source: str
    source_id: str
    confidence: float | None
    collected_at: str | None


def normalize_text_key(value: str) -> str:
    normalized = unicodedata.normalize("NFKC", value)
    return WHITESPACE_PATTERN.sub(" ", normalized).strip().casefold()


def sample_hash(value: str) -> str:
    return hashlib.sha256(normalize_text_key(value).encode("utf-8")).hexdigest()


def parse_label(value: Any, *, default: int = 1) -> int:
    if value in (None, ""):
        return default
    if str(value).strip() in {"0", "0.0"}:
        return 0
    if str(value).strip() in {"1", "1.0"}:
        return 1
    raise ValueError(f"Unsupported label: {value!r}")


def load_manual_incidents(path: Path) -> list[TrainingSample]:
    if not path.exists():
        return []

    samples: list[TrainingSample] = []
    with path.open("r", encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)
        if not reader.fieldnames or "text" not in reader.fieldnames:
            raise ValueError(f"{path} must contain a 'text' column")

        for row_number, row in enumerate(reader, start=2):
            message = (row.get("text") or "").strip()
            if not message:
                continue
            label = parse_label(row.get("label"), default=1)
            if label != 1:
                raise ValueError(
                    f"{path}:{row_number} manual incidents must use label=1"
                )
            samples.append(
                TrainingSample(
                    text=message,
                    label=label,
                    source="MANUAL_INCIDENT",
                    source_id=(row.get("source_id") or f"row-{row_number}").strip(),
                    confidence=1.0,
                    collected_at=(row.get("collected_at") or None),
                )
            )
    return samples


async def load_database_samples(
    database_url: str,
    *,
    normal_confidence: float,
) -> list[TrainingSample]:
    engine = create_async_engine(database_url, pool_pre_ping=True)
    query = text(
        """
        SELECT
            id,
            content,
            is_smishing,
            detection_type,
            ai_score,
            static_url_match,
            created_at
        FROM smishing_logs
        WHERE input_type = 'SMS'
          AND consent_for_training = TRUE
          AND (
              (
                  detection_type = 'STATIC_PATTERN'
                  AND is_smishing = TRUE
                  AND static_url_match = TRUE
              )
              OR (
                  detection_type = 'ENCODER'
                  AND is_smishing = FALSE
                  AND ai_score >= :normal_confidence
              )
          )
        ORDER BY id
        """
    )

    try:
        async with engine.connect() as connection:
            rows = (await connection.execute(
                query,
                {"normal_confidence": normal_confidence},
            )).mappings()
            samples = []
            for row in rows:
                message = str(row["content"]).strip()
                if not message:
                    continue
                is_static_positive = bool(row["static_url_match"])
                samples.append(
                    TrainingSample(
                        text=message,
                        label=1 if is_static_positive else 0,
                        source=(
                            "STATIC_URL_FILTER"
                            if is_static_positive
                            else "HIGH_CONFIDENCE_NORMAL"
                        ),
                        source_id=f"smishing_log:{row['id']}",
                        confidence=(
                            1.0
                            if is_static_positive
                            else float(row["ai_score"])
                        ),
                        collected_at=(
                            row["created_at"].isoformat()
                            if row["created_at"]
                            else None
                        ),
                    )
                )
            return samples
    finally:
        await engine.dispose()


def deduplicate_samples(
    samples: list[TrainingSample],
) -> tuple[list[TrainingSample], list[dict[str, Any]]]:
    by_hash: dict[str, TrainingSample] = {}
    conflicts: list[dict[str, Any]] = []

    for sample in samples:
        key = sample_hash(sample.text)
        existing = by_hash.get(key)
        if existing is None:
            by_hash[key] = sample
            continue
        if existing.label != sample.label:
            conflicts.append(
                {
                    "text_hash": key,
                    "text": sample.text,
                    "first_label": existing.label,
                    "first_source": existing.source,
                    "second_label": sample.label,
                    "second_source": sample.source,
                }
            )
            by_hash.pop(key, None)
            continue

        existing_confidence = existing.confidence or 0.0
        sample_confidence = sample.confidence or 0.0
        if sample_confidence > existing_confidence:
            by_hash[key] = sample

    conflict_hashes = {row["text_hash"] for row in conflicts}
    deduplicated = [
        sample
        for key, sample in by_hash.items()
        if key not in conflict_hashes
    ]
    deduplicated.sort(key=lambda sample: (sample.label, sample.source, sample.text))
    return deduplicated, conflicts


def write_jsonl(path: Path, rows: list[dict[str, Any]]) -> None:
    with path.open("w", encoding="utf-8") as file:
        for row in rows:
            file.write(json.dumps(row, ensure_ascii=False) + "\n")


def write_collection(
    samples: list[TrainingSample],
    conflicts: list[dict[str, Any]],
    *,
    output_root: Path,
    normal_confidence: float,
) -> Path:
    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    output_dir = output_root / run_id
    output_dir.mkdir(parents=True, exist_ok=False)

    rows = [asdict(sample) for sample in samples]
    write_jsonl(output_dir / "incremental_training_data.jsonl", rows)
    write_jsonl(output_dir / "label_conflicts.jsonl", conflicts)

    source_counts = Counter(sample.source for sample in samples)
    label_counts = Counter(str(sample.label) for sample in samples)
    manifest = {
        "run_id": run_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "normal_confidence_threshold": normal_confidence,
        "sample_count": len(samples),
        "conflict_count": len(conflicts),
        "source_counts": dict(sorted(source_counts.items())),
        "label_counts": dict(sorted(label_counts.items())),
        "data_file": "incremental_training_data.jsonl",
        "conflict_file": "label_conflicts.jsonl",
    }
    (output_dir / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return output_dir


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Collect consented encoder retraining samples."
    )
    parser.add_argument(
        "--database-url",
        default=os.getenv("DATABASE_URL"),
        help="SQLAlchemy async MySQL URL. Defaults to DATABASE_URL.",
    )
    parser.add_argument(
        "--manual-path",
        type=Path,
        default=DEFAULT_MANUAL_PATH,
    )
    parser.add_argument(
        "--output-root",
        type=Path,
        default=DEFAULT_OUTPUT_ROOT,
    )
    parser.add_argument(
        "--normal-confidence",
        type=float,
        default=0.98,
    )
    return parser.parse_args()


async def async_main() -> None:
    args = parse_args()
    if not 0.0 <= args.normal_confidence <= 1.0:
        raise ValueError("--normal-confidence must be between 0 and 1")

    samples = load_manual_incidents(args.manual_path)
    if args.database_url:
        samples.extend(
            await load_database_samples(
                args.database_url,
                normal_confidence=args.normal_confidence,
            )
        )
    elif not samples:
        raise ValueError(
            "DATABASE_URL is not set and no manual incident file was found"
        )

    deduplicated, conflicts = deduplicate_samples(samples)
    output_dir = write_collection(
        deduplicated,
        conflicts,
        output_root=args.output_root,
        normal_confidence=args.normal_confidence,
    )
    print(f"Collected samples: {len(deduplicated)}")
    print(f"Label conflicts excluded: {len(conflicts)}")
    print(f"Output directory: {output_dir}")


def main() -> None:
    asyncio.run(async_main())


if __name__ == "__main__":
    main()
