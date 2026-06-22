from __future__ import annotations

import argparse
import hashlib
import json
import random
import re
import unicodedata
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from sklearn.model_selection import train_test_split

SEED = 42
WHITESPACE_PATTERN = re.compile(r"\s+")


def normalize_text_key(value: str) -> str:
    normalized = unicodedata.normalize("NFKC", value)
    return WHITESPACE_PATTERN.sub(" ", normalized).strip().casefold()


def text_hash(value: str) -> str:
    return hashlib.sha256(normalize_text_key(value).encode("utf-8")).hexdigest()


def normalize_label(value: Any) -> int:
    if value in (0, 0.0, "0", "0.0"):
        return 0
    if value in (1, 1.0, "1", "1.0"):
        return 1
    raise ValueError(f"Unsupported label: {value!r}")


def load_jsonl(path: Path, *, default_source: str) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as file:
        for line_number, line in enumerate(file, start=1):
            line = line.strip()
            if not line:
                continue
            try:
                row = json.loads(line)
                message = str(row["text"]).strip()
                label = normalize_label(row["label"])
            except (json.JSONDecodeError, KeyError, ValueError) as exc:
                raise ValueError(f"Invalid row at {path}:{line_number}") from exc
            if not message:
                continue
            rows.append(
                {
                    **row,
                    "text": message,
                    "label": label,
                    "source": row.get("source") or default_source,
                }
            )
    if not rows:
        raise ValueError(f"No usable rows found in {path}")
    return rows


def deduplicate_rows(
    rows: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    by_hash: dict[str, dict[str, Any]] = {}
    conflicts: list[dict[str, Any]] = []
    conflict_hashes: set[str] = set()

    for row in rows:
        key = text_hash(row["text"])
        if key in conflict_hashes:
            continue
        existing = by_hash.get(key)
        if existing is None:
            by_hash[key] = row
            continue
        if existing["label"] != row["label"]:
            conflicts.append(
                {
                    "text_hash": key,
                    "text": row["text"],
                    "first_label": existing["label"],
                    "first_source": existing["source"],
                    "second_label": row["label"],
                    "second_source": row["source"],
                }
            )
            by_hash.pop(key, None)
            conflict_hashes.add(key)

    return list(by_hash.values()), conflicts


def split_base_rows(
    rows: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    labels = [row["label"] for row in rows]
    train_rows, temp_rows = train_test_split(
        rows,
        test_size=0.2,
        random_state=SEED,
        stratify=labels,
    )
    temp_labels = [row["label"] for row in temp_rows]
    valid_rows, test_rows = train_test_split(
        temp_rows,
        test_size=0.5,
        random_state=SEED,
        stratify=temp_labels,
    )
    return train_rows, valid_rows, test_rows


def merge_incremental_into_train(
    train_rows: list[dict[str, Any]],
    valid_rows: list[dict[str, Any]],
    test_rows: list[dict[str, Any]],
    incremental_rows: list[dict[str, Any]],
    *,
    max_per_source: int | None,
) -> tuple[list[dict[str, Any]], dict[str, int], list[dict[str, Any]]]:
    held_out_hashes = {
        text_hash(row["text"]) for row in [*valid_rows, *test_rows]
    }
    train_by_hash = {text_hash(row["text"]): row for row in train_rows}
    exclusions = Counter()
    conflicts: list[dict[str, Any]] = []
    source_counts = Counter()

    candidates = list(incremental_rows)
    random.Random(SEED).shuffle(candidates)
    for row in candidates:
        key = text_hash(row["text"])
        source = str(row["source"])
        if key in held_out_hashes:
            exclusions["held_out_overlap"] += 1
            continue
        existing = train_by_hash.get(key)
        if existing is not None:
            if existing["label"] != row["label"]:
                exclusions["label_conflict"] += 1
                conflicts.append(
                    {
                        "text_hash": key,
                        "text": row["text"],
                        "base_label": existing["label"],
                        "incremental_label": row["label"],
                        "incremental_source": source,
                    }
                )
            else:
                exclusions["train_duplicate"] += 1
            continue
        if max_per_source is not None and source_counts[source] >= max_per_source:
            exclusions["source_cap"] += 1
            continue

        train_by_hash[key] = row
        source_counts[source] += 1

    merged = list(train_by_hash.values())
    random.Random(SEED).shuffle(merged)
    return merged, dict(exclusions), conflicts


def write_jsonl(path: Path, rows: list[dict[str, Any]]) -> None:
    with path.open("w", encoding="utf-8") as file:
        for row in rows:
            file.write(json.dumps(row, ensure_ascii=False) + "\n")


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def build_dataset(
    *,
    base_path: Path,
    incremental_path: Path,
    output_dir: Path,
    max_per_source: int | None,
) -> dict[str, Any]:
    base_rows, base_conflicts = deduplicate_rows(
        load_jsonl(base_path, default_source="BASE_DATASET")
    )
    incremental_rows, incremental_conflicts = deduplicate_rows(
        load_jsonl(incremental_path, default_source="INCREMENTAL")
    )
    train_rows, valid_rows, test_rows = split_base_rows(base_rows)
    merged_train, exclusions, merge_conflicts = merge_incremental_into_train(
        train_rows,
        valid_rows,
        test_rows,
        incremental_rows,
        max_per_source=max_per_source,
    )

    output_dir.mkdir(parents=True, exist_ok=False)
    train_path = output_dir / "train.jsonl"
    valid_path = output_dir / "valid.jsonl"
    test_path = output_dir / "test.jsonl"
    write_jsonl(train_path, merged_train)
    write_jsonl(valid_path, valid_rows)
    write_jsonl(test_path, test_rows)
    write_jsonl(
        output_dir / "label_conflicts.jsonl",
        [*base_conflicts, *incremental_conflicts, *merge_conflicts],
    )

    source_counts = Counter(str(row["source"]) for row in merged_train)
    label_counts = Counter(str(row["label"]) for row in merged_train)
    manifest = {
        "dataset_version": output_dir.name,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "seed": SEED,
        "base_path": str(base_path),
        "base_sha256": file_sha256(base_path),
        "incremental_path": str(incremental_path),
        "incremental_sha256": file_sha256(incremental_path),
        "max_per_source": max_per_source,
        "train_count": len(merged_train),
        "valid_count": len(valid_rows),
        "test_count": len(test_rows),
        "train_source_counts": dict(sorted(source_counts.items())),
        "train_label_counts": dict(sorted(label_counts.items())),
        "exclusions": exclusions,
        "conflict_count": (
            len(base_conflicts)
            + len(incremental_conflicts)
            + len(merge_conflicts)
        ),
        "files": {
            "train": {"path": "train.jsonl", "sha256": file_sha256(train_path)},
            "valid": {"path": "valid.jsonl", "sha256": file_sha256(valid_path)},
            "test": {"path": "test.jsonl", "sha256": file_sha256(test_path)},
        },
    }
    (output_dir / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return manifest


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build a versioned encoder dataset with fixed held-out splits."
    )
    parser.add_argument("--base-path", type=Path, required=True)
    parser.add_argument("--incremental-path", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--max-per-source", type=int, default=None)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.max_per_source is not None and args.max_per_source < 1:
        raise ValueError("--max-per-source must be at least 1")
    manifest = build_dataset(
        base_path=args.base_path,
        incremental_path=args.incremental_path,
        output_dir=args.output_dir,
        max_per_source=args.max_per_source,
    )
    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
