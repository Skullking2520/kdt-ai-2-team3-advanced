from __future__ import annotations

import argparse
import csv
import json
from collections import Counter
from pathlib import Path
from typing import Any

import numpy as np

AUTO_DROP_SOURCES = {"HIGH_CONFIDENCE_NORMAL"}


def load_jsonl(path: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as file:
        for line_number, line in enumerate(file, start=1):
            line = line.strip()
            if not line:
                continue
            try:
                row = json.loads(line)
                row["text"] = str(row["text"]).strip()
                row["label"] = int(row["label"])
            except (json.JSONDecodeError, KeyError, TypeError, ValueError) as exc:
                raise ValueError(f"Invalid row at {path}:{line_number}") from exc
            if row["label"] not in (0, 1):
                raise ValueError(f"Unsupported label at {path}:{line_number}")
            if row["text"]:
                rows.append(row)
    if not rows:
        raise ValueError(f"No usable rows found in {path}")
    return rows


def load_pred_probs(path: Path, expected_rows: int) -> np.ndarray:
    if path.suffix == ".npy":
        pred_probs = np.load(path)
    else:
        pred_probs = np.asarray(json.loads(path.read_text(encoding="utf-8")))

    return validate_pred_probs(pred_probs, expected_rows)


def validate_pred_probs(
    pred_probs: Any,
    expected_rows: int,
) -> np.ndarray:
    pred_probs = np.asarray(pred_probs, dtype=float)
    if pred_probs.shape != (expected_rows, 2):
        raise ValueError(
            "Prediction probabilities must have shape "
            f"({expected_rows}, 2), got {pred_probs.shape}"
        )
    if not np.isfinite(pred_probs).all():
        raise ValueError("Prediction probabilities contain non-finite values")
    if (pred_probs < 0).any() or (pred_probs > 1).any():
        raise ValueError("Prediction probabilities must be between 0 and 1")
    if not np.allclose(pred_probs.sum(axis=1), 1.0, atol=1e-5):
        raise ValueError("Each prediction probability row must sum to 1")
    return pred_probs


def build_mock_pred_probs(rows: list[dict[str, Any]]) -> np.ndarray:
    probabilities: list[list[float]] = []
    for row in rows:
        configured = row.get("mock_pred_probs")
        if configured is not None:
            probabilities.append(configured)
        elif row["label"] == 0:
            probabilities.append([0.98, 0.02])
        else:
            probabilities.append([0.02, 0.98])
    return validate_pred_probs(probabilities, len(rows))


def find_issues_with_cleanlab(
    labels: np.ndarray,
    pred_probs: np.ndarray,
) -> tuple[np.ndarray, np.ndarray]:
    try:
        from cleanlab.filter import find_label_issues
        from cleanlab.rank import get_label_quality_scores
    except ImportError as exc:
        raise RuntimeError(
            "Cleanlab mode requires the cleanlab package. "
            "Install the ai-service dependencies first."
        ) from exc

    quality_scores = get_label_quality_scores(
        labels=labels,
        pred_probs=pred_probs,
    )
    issue_result = np.asarray(
        find_label_issues(
            labels=labels,
            pred_probs=pred_probs,
            n_jobs=1,
        )
    )
    if issue_result.dtype == bool:
        issue_mask = issue_result
    else:
        issue_mask = np.zeros(len(labels), dtype=bool)
        issue_mask[issue_result.astype(int)] = True
    return np.asarray(quality_scores, dtype=float), issue_mask


def find_issues_in_mock(
    labels: np.ndarray,
    pred_probs: np.ndarray,
) -> tuple[np.ndarray, np.ndarray]:
    quality_scores = pred_probs[np.arange(len(labels)), labels]
    issue_mask = pred_probs.argmax(axis=1) != labels
    return quality_scores, issue_mask


def write_jsonl(path: Path, rows: list[dict[str, Any]]) -> None:
    with path.open("w", encoding="utf-8") as file:
        for row in rows:
            file.write(json.dumps(row, ensure_ascii=False) + "\n")


def run_quality_check(
    *,
    train_path: Path,
    output_dir: Path,
    mode: str,
    pred_probs_path: Path | None,
    drop_all_issues: bool,
) -> dict[str, Any]:
    rows = load_jsonl(train_path)
    labels = np.asarray([row["label"] for row in rows], dtype=int)

    if mode == "mock":
        pred_probs = build_mock_pred_probs(rows)
        quality_scores, issue_mask = find_issues_in_mock(labels, pred_probs)
    elif mode == "pred-probs":
        if pred_probs_path is None:
            raise ValueError("--pred-probs-path is required in pred-probs mode")
        pred_probs = load_pred_probs(pred_probs_path, len(rows))
        quality_scores, issue_mask = find_issues_with_cleanlab(
            labels,
            pred_probs,
        )
    else:
        raise ValueError(f"Unsupported mode: {mode}")

    output_dir.mkdir(parents=True, exist_ok=False)
    kept_rows: list[dict[str, Any]] = []
    issue_rows: list[dict[str, Any]] = []
    dropped_by_source = Counter()
    review_by_source = Counter()

    for index, row in enumerate(rows):
        is_issue = bool(issue_mask[index])
        source = str(row.get("source") or "UNKNOWN")
        should_drop = is_issue and (
            drop_all_issues or source in AUTO_DROP_SOURCES
        )
        if not should_drop:
            kept_rows.append(row)
        if not is_issue:
            continue

        action = "drop" if should_drop else "review"
        if should_drop:
            dropped_by_source[source] += 1
        else:
            review_by_source[source] += 1
        issue_rows.append(
            {
                "row_index": index,
                "text": row["text"],
                "given_label": row["label"],
                "predicted_label": int(pred_probs[index].argmax()),
                "prob_normal": float(pred_probs[index][0]),
                "prob_phishing": float(pred_probs[index][1]),
                "label_quality_score": float(quality_scores[index]),
                "source": source,
                "action": action,
            }
        )

    cleaned_path = output_dir / "cleaned_train.jsonl"
    issues_path = output_dir / "cleanlab_issues.csv"
    summary_path = output_dir / "cleanlab_summary.json"
    write_jsonl(cleaned_path, kept_rows)
    with issues_path.open("w", encoding="utf-8", newline="") as file:
        fieldnames = [
            "row_index",
            "text",
            "given_label",
            "predicted_label",
            "prob_normal",
            "prob_phishing",
            "label_quality_score",
            "source",
            "action",
        ]
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(issue_rows)

    summary = {
        "mode": mode,
        "input_path": str(train_path),
        "input_count": len(rows),
        "cleaned_count": len(kept_rows),
        "issue_count": len(issue_rows),
        "dropped_count": sum(dropped_by_source.values()),
        "review_count": sum(review_by_source.values()),
        "drop_all_issues": drop_all_issues,
        "auto_drop_sources": sorted(AUTO_DROP_SOURCES),
        "dropped_by_source": dict(sorted(dropped_by_source.items())),
        "review_by_source": dict(sorted(review_by_source.items())),
    }
    summary_path.write_text(
        json.dumps(summary, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return summary


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Review encoder training labels with Cleanlab."
    )
    parser.add_argument("--train-path", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument(
        "--mode",
        choices=("mock", "pred-probs"),
        default="mock",
    )
    parser.add_argument("--pred-probs-path", type=Path)
    parser.add_argument("--drop-all-issues", action="store_true")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    summary = run_quality_check(
        train_path=args.train_path,
        output_dir=args.output_dir,
        mode=args.mode,
        pred_probs_path=args.pred_probs_path,
        drop_all_issues=args.drop_all_issues,
    )
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
