from __future__ import annotations

import argparse
from pathlib import Path

import pandas as pd
from encoder_analysis_utils import (
    LABEL_COL,
    TEXT_COL,
    compute_group_metrics,
    load_labeled_dataset,
    predict_texts,
)

SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_CHALLENGE_PATH = SCRIPT_DIR / "data" / "generated" / "keyword_challenge_set.csv"
DEFAULT_MODEL_PATH = (
    SCRIPT_DIR
    / "results_hard_mixed_v3"
    / "focal_no_oversampling"
    / "final_model"
)
DEFAULT_OUTPUT_DIR = SCRIPT_DIR / "outputs" / "encoder_error_analysis"


def parse_keyword_challenge_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Evaluate encoder on a keyword challenge set."
    )
    parser.add_argument("--challenge-path", type=Path, default=DEFAULT_CHALLENGE_PATH)
    parser.add_argument("--model-path", type=Path, default=DEFAULT_MODEL_PATH)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--max-length", type=int, default=128)
    parser.add_argument("--threshold", type=float, default=0.5)
    return parser.parse_args()


def main() -> None:
    args = parse_keyword_challenge_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)

    challenge_df = load_labeled_dataset(args.challenge_path).reset_index(drop=True)
    if "keyword_group" not in challenge_df.columns:
        raise ValueError("challenge set must include keyword_group column")

    probabilities, _default_predictions = predict_texts(
        args.model_path,
        challenge_df[TEXT_COL].tolist(),
        args.batch_size,
        args.max_length,
    )
    challenge_df["confidence"] = probabilities
    challenge_df["pred_label"] = (probabilities >= args.threshold).astype(int)
    challenge_df["true_label"] = challenge_df[LABEL_COL].astype(int)

    metrics_rows = []
    for keyword_group, group_df in challenge_df.groupby("keyword_group"):
        metrics_rows.append(
            {
                "keyword_group": keyword_group,
                **compute_group_metrics(group_df),
            }
        )

    predictions_path = args.output_dir / "keyword_challenge_predictions.csv"
    metrics_path = args.output_dir / "keyword_challenge_metrics.csv"
    challenge_df[
        [
            TEXT_COL,
            "true_label",
            "pred_label",
            "confidence",
            "keyword_group",
        ]
    ].to_csv(predictions_path, index=False, encoding="utf-8-sig")
    pd.DataFrame(metrics_rows).to_csv(
        metrics_path,
        index=False,
        encoding="utf-8-sig",
    )

    print(f"Challenge samples: {len(challenge_df):,}")
    print(f"Saved predictions: {predictions_path}")
    print(f"Saved metrics: {metrics_path}")


if __name__ == "__main__":
    main()
