from __future__ import annotations

import argparse
import csv
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
from generate_cleanlab_pred_probs import load_jsonl, predict_probabilities
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    precision_recall_fscore_support,
)


def compute_metrics(
    labels: np.ndarray,
    pred_probs: np.ndarray,
    *,
    threshold: float,
) -> dict[str, float | int]:
    probabilities = pred_probs[:, 1]
    predictions = (probabilities >= threshold).astype(int)
    accuracy = accuracy_score(labels, predictions)
    precision, recall, f1, _ = precision_recall_fscore_support(
        labels,
        predictions,
        average="binary",
        pos_label=1,
        zero_division=0,
    )
    tn, fp, fn, tp = confusion_matrix(
        labels,
        predictions,
        labels=[0, 1],
    ).ravel()
    normal_count = int((labels == 0).sum())
    phishing_count = int((labels == 1).sum())
    return {
        "accuracy": float(accuracy),
        "precision": float(precision),
        "recall": float(recall),
        "f1": float(f1),
        "true_negative": int(tn),
        "false_positive": int(fp),
        "false_negative": int(fn),
        "true_positive": int(tp),
        "false_positive_rate": float(fp / normal_count) if normal_count else 0.0,
        "false_negative_rate": (
            float(fn / phishing_count) if phishing_count else 0.0
        ),
    }


def evaluate_model(
    *,
    rows: list[dict[str, Any]],
    model_name_or_path: str,
    batch_size: int,
    max_length: int,
    device: str,
    threshold: float,
) -> tuple[dict[str, Any], np.ndarray]:
    labels = np.asarray([row["label"] for row in rows], dtype=int)
    pred_probs, metadata = predict_probabilities(
        rows=rows,
        model_name_or_path=model_name_or_path,
        batch_size=batch_size,
        max_length=max_length,
        device=device,
    )
    metrics = compute_metrics(labels, pred_probs, threshold=threshold)
    return {
        "model_name_or_path": model_name_or_path,
        "threshold": threshold,
        **metrics,
        "metadata": metadata,
    }, pred_probs


def should_promote(
    *,
    baseline: dict[str, Any],
    candidate: dict[str, Any],
    min_f1_delta: float,
    max_fp_increase: int,
    max_fn_increase: int,
) -> bool:
    f1_delta = float(candidate["f1"]) - float(baseline["f1"])
    fp_delta = int(candidate["false_positive"]) - int(baseline["false_positive"])
    fn_delta = int(candidate["false_negative"]) - int(baseline["false_negative"])
    return (
        f1_delta >= min_f1_delta
        and fp_delta <= max_fp_increase
        and fn_delta <= max_fn_increase
    )


def write_metric_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    fieldnames = [
        "role",
        "model_name_or_path",
        "threshold",
        "accuracy",
        "precision",
        "recall",
        "f1",
        "true_negative",
        "false_positive",
        "false_negative",
        "true_positive",
        "false_positive_rate",
        "false_negative_rate",
    ]
    with path.open("w", encoding="utf-8", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow({field: row[field] for field in fieldnames})


def compare_models(
    *,
    test_path: Path,
    baseline_model: str,
    candidate_model: str,
    output_dir: Path,
    threshold: float,
    min_f1_delta: float,
    max_fp_increase: int,
    max_fn_increase: int,
    batch_size: int,
    max_length: int,
    device: str,
) -> dict[str, Any]:
    rows = load_jsonl(test_path)
    output_dir.mkdir(parents=True, exist_ok=False)
    baseline, baseline_probs = evaluate_model(
        rows=rows,
        model_name_or_path=baseline_model,
        batch_size=batch_size,
        max_length=max_length,
        device=device,
        threshold=threshold,
    )
    candidate, candidate_probs = evaluate_model(
        rows=rows,
        model_name_or_path=candidate_model,
        batch_size=batch_size,
        max_length=max_length,
        device=device,
        threshold=threshold,
    )
    baseline["role"] = "baseline"
    candidate["role"] = "candidate"

    promotion_recommended = should_promote(
        baseline=baseline,
        candidate=candidate,
        min_f1_delta=min_f1_delta,
        max_fp_increase=max_fp_increase,
        max_fn_increase=max_fn_increase,
    )
    deltas = {
        "accuracy_delta": float(candidate["accuracy"]) - float(baseline["accuracy"]),
        "precision_delta": (
            float(candidate["precision"]) - float(baseline["precision"])
        ),
        "recall_delta": float(candidate["recall"]) - float(baseline["recall"]),
        "f1_delta": float(candidate["f1"]) - float(baseline["f1"]),
        "false_positive_delta": (
            int(candidate["false_positive"]) - int(baseline["false_positive"])
        ),
        "false_negative_delta": (
            int(candidate["false_negative"]) - int(baseline["false_negative"])
        ),
    }

    np.save(output_dir / "baseline_pred_probs.npy", baseline_probs)
    np.save(output_dir / "candidate_pred_probs.npy", candidate_probs)
    write_metric_csv(output_dir / "model_comparison.csv", [baseline, candidate])
    summary = {
        "created_at": datetime.now(timezone.utc).isoformat(),
        "test_path": str(test_path),
        "sample_count": len(rows),
        "threshold": threshold,
        "promotion_recommended": promotion_recommended,
        "promotion_policy": {
            "min_f1_delta": min_f1_delta,
            "max_fp_increase": max_fp_increase,
            "max_fn_increase": max_fn_increase,
        },
        "deltas": deltas,
        "baseline": baseline,
        "candidate": candidate,
        "files": {
            "metrics": "model_comparison.csv",
            "baseline_pred_probs": "baseline_pred_probs.npy",
            "candidate_pred_probs": "candidate_pred_probs.npy",
        },
    }
    (output_dir / "promotion_manifest.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return summary


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Compare baseline and candidate encoder models."
    )
    parser.add_argument("--test-path", type=Path, required=True)
    parser.add_argument("--baseline-model", required=True)
    parser.add_argument("--candidate-model", required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--threshold", type=float, default=0.5)
    parser.add_argument("--min-f1-delta", type=float, default=0.0)
    parser.add_argument("--max-fp-increase", type=int, default=0)
    parser.add_argument("--max-fn-increase", type=int, default=0)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--max-length", type=int, default=128)
    parser.add_argument(
        "--device",
        choices=("auto", "cpu", "mps", "cuda"),
        default="auto",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if not 0 <= args.threshold <= 1:
        raise ValueError("--threshold must be between 0 and 1")
    if args.batch_size < 1:
        raise ValueError("--batch-size must be at least 1")
    if args.max_length < 1:
        raise ValueError("--max-length must be at least 1")
    summary = compare_models(
        test_path=args.test_path,
        baseline_model=args.baseline_model,
        candidate_model=args.candidate_model,
        output_dir=args.output_dir,
        threshold=args.threshold,
        min_f1_delta=args.min_f1_delta,
        max_fp_increase=args.max_fp_increase,
        max_fn_increase=args.max_fn_increase,
        batch_size=args.batch_size,
        max_length=args.max_length,
        device=args.device,
    )
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
