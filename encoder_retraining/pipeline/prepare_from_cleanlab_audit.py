from __future__ import annotations

import argparse
import csv
import hashlib
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from sklearn.model_selection import train_test_split

SEED = 42


def normalize_label(value: Any) -> int:
    if value in (0, 0.0, "0", "0.0", "normal", "정상"):
        return 0
    if value in (1, 1.0, "1", "1.0", "phishing", "smishing", "스미싱"):
        return 1
    raise ValueError(f"Unsupported label: {value!r}")


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def load_cleaned_rows(path: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as file:
        for line_number, line in enumerate(file, start=1):
            line = line.strip()
            if not line:
                continue
            try:
                row = json.loads(line)
                text = str(row["text"]).strip()
                label = normalize_label(row["label"])
            except (json.JSONDecodeError, KeyError, ValueError) as exc:
                raise ValueError(f"Invalid row at {path}:{line_number}") from exc
            if not text:
                continue
            rows.append({**row, "text": text, "label": label})
    if not rows:
        raise ValueError(f"No usable rows found in {path}")
    return rows


def deduplicate_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_text: dict[str, dict[str, Any]] = {}
    conflicts: set[str] = set()
    for row in rows:
        key = " ".join(row["text"].split()).casefold()
        if key in conflicts:
            continue
        existing = by_text.get(key)
        if existing is None:
            by_text[key] = row
            continue
        if existing["label"] != row["label"]:
            by_text.pop(key, None)
            conflicts.add(key)
    return list(by_text.values())


def split_rows(
    rows: list[dict[str, Any]],
    *,
    valid_size: float,
    test_size: float,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    if valid_size <= 0 or test_size <= 0 or valid_size + test_size >= 1:
        raise ValueError("valid_size and test_size must be positive and sum below 1")

    labels = [row["label"] for row in rows]
    train_rows, temp_rows = train_test_split(
        rows,
        test_size=valid_size + test_size,
        random_state=SEED,
        stratify=labels,
    )
    temp_labels = [row["label"] for row in temp_rows]
    relative_test_size = test_size / (valid_size + test_size)
    valid_rows, test_rows = train_test_split(
        temp_rows,
        test_size=relative_test_size,
        random_state=SEED,
        stratify=temp_labels,
    )
    return train_rows, valid_rows, test_rows


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


def count_csv_rows(path: Path) -> int:
    if not path.exists():
        return 0
    with path.open("r", encoding="utf-8-sig", newline="") as file:
        return sum(1 for _ in csv.DictReader(file))


def label_counts(rows: list[dict[str, Any]]) -> dict[str, int]:
    counts = Counter(str(row["label"]) for row in rows)
    return dict(sorted(counts.items()))


def build_manifest(
    *,
    dataset_version: str,
    cleaned_data_path: Path,
    audit_dir: Path | None,
    train_path: Path,
    valid_path: Path,
    test_path: Path,
    train_rows: list[dict[str, Any]],
    valid_rows: list[dict[str, Any]],
    test_rows: list[dict[str, Any]],
    valid_size: float,
    test_size: float,
) -> dict[str, Any]:
    audit_log_path = audit_dir / "audit_log.json" if audit_dir else None
    audit_log = (
        load_json(audit_log_path)
        if audit_log_path is not None and audit_log_path.exists()
        else {}
    )
    suspected_path = audit_dir / "suspected_noisy_labels.csv" if audit_dir else None
    report_path = audit_dir / "label_audit_report.csv" if audit_dir else None
    return {
        "dataset_version": dataset_version,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": "encoder_retraining.prepare_from_cleanlab_audit",
        "source_type": "cleanlab_audit",
        "source": {
            "cleaned_dataset_path": str(cleaned_data_path),
            "cleaned_dataset_sha256": file_sha256(cleaned_data_path),
            "audit_dir": str(audit_dir) if audit_dir else None,
            "audit_log": audit_log,
            "label_audit_report_count": (
                count_csv_rows(report_path) if report_path is not None else 0
            ),
            "suspected_noisy_label_count": (
                count_csv_rows(suspected_path) if suspected_path is not None else 0
            ),
        },
        "seed": SEED,
        "label_mapping": {"0": "normal", "1": "phishing"},
        "split_ratio": {
            "train": round(1 - valid_size - test_size, 6),
            "valid": valid_size,
            "test": test_size,
        },
        "train_count": len(train_rows),
        "valid_count": len(valid_rows),
        "test_count": len(test_rows),
        "label_counts": {
            "train": label_counts(train_rows),
            "valid": label_counts(valid_rows),
            "test": label_counts(test_rows),
        },
        "files": {
            "train": {
                "path": "cleaned_train.jsonl",
                "sha256": file_sha256(train_path),
            },
            "valid": {"path": "valid.jsonl", "sha256": file_sha256(valid_path)},
            "test": {"path": "test.jsonl", "sha256": file_sha256(test_path)},
        },
        "notes": (
            "Prepared from Cleanlab cleaned_dataset.jsonl. "
            "Validation and test splits are regenerated with seed 42."
        ),
    }


def prepare_dataset(
    *,
    cleaned_data_path: Path,
    output_dir: Path,
    dataset_version: str,
    audit_dir: Path | None,
    valid_size: float,
    test_size: float,
    overwrite: bool,
) -> dict[str, Any]:
    if output_dir.exists():
        if not overwrite:
            raise FileExistsError(f"Output directory already exists: {output_dir}")
        for path in output_dir.iterdir():
            if path.is_file():
                path.unlink()
            else:
                raise ValueError(f"Refusing to remove nested directory: {path}")
    else:
        output_dir.mkdir(parents=True)

    rows = deduplicate_rows(load_cleaned_rows(cleaned_data_path))
    train_rows, valid_rows, test_rows = split_rows(
        rows,
        valid_size=valid_size,
        test_size=test_size,
    )

    train_path = output_dir / "cleaned_train.jsonl"
    valid_path = output_dir / "valid.jsonl"
    test_path = output_dir / "test.jsonl"
    write_jsonl(train_path, train_rows)
    write_jsonl(valid_path, valid_rows)
    write_jsonl(test_path, test_rows)

    manifest = build_manifest(
        dataset_version=dataset_version,
        cleaned_data_path=cleaned_data_path,
        audit_dir=audit_dir,
        train_path=train_path,
        valid_path=valid_path,
        test_path=test_path,
        train_rows=train_rows,
        valid_rows=valid_rows,
        test_rows=test_rows,
        valid_size=valid_size,
        test_size=test_size,
    )
    (output_dir / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return manifest


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Convert Cleanlab audit output into a prepared encoder dataset."
    )
    parser.add_argument("--cleaned-data-path", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--dataset-version", required=True)
    parser.add_argument("--audit-dir", type=Path)
    parser.add_argument("--valid-size", type=float, default=0.1)
    parser.add_argument("--test-size", type=float, default=0.1)
    parser.add_argument("--overwrite", action="store_true")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    manifest = prepare_dataset(
        cleaned_data_path=args.cleaned_data_path,
        output_dir=args.output_dir,
        dataset_version=args.dataset_version,
        audit_dir=args.audit_dir,
        valid_size=args.valid_size,
        test_size=args.test_size,
        overwrite=args.overwrite,
    )
    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
