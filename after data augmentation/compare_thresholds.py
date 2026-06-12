from __future__ import annotations

import argparse
from pathlib import Path

import pandas as pd
from encoder_analysis_utils import (
    LABEL_COL,
    TEXT_COL,
    compute_threshold_metrics,
    load_labeled_dataset,
    predict_texts,
    split_dataset,
)

SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_DATA_PATH = SCRIPT_DIR / "cleaned_dataset.jsonl"
DEFAULT_MODEL_PATH = (
    SCRIPT_DIR
    / "results_hard_mixed_v3"
    / "focal_no_oversampling"
    / "final_model"
)
DEFAULT_OUTPUT_DIR = SCRIPT_DIR / "outputs" / "encoder_error_analysis"
DEFAULT_THRESHOLDS = (0.50, 0.60, 0.70, 0.80, 0.90)


def parse_threshold_comparison_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Compare encoder metrics across phishing thresholds."
    )
    parser.add_argument("--data-path", type=Path, default=DEFAULT_DATA_PATH)
    parser.add_argument("--model-path", type=Path, default=DEFAULT_MODEL_PATH)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--max-length", type=int, default=128)
    parser.add_argument(
        "--thresholds",
        nargs="*",
        type=float,
        default=list(DEFAULT_THRESHOLDS),
    )
    return parser.parse_args()


def main() -> None:
    args = parse_threshold_comparison_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)

    df = load_labeled_dataset(args.data_path)
    _train_df, _valid_df, test_df = split_dataset(df)
    test_df = test_df.reset_index(drop=True)

    probabilities, _default_predictions = predict_texts(
        args.model_path,
        test_df[TEXT_COL].tolist(),
        args.batch_size,
        args.max_length,
    )
    labels = test_df[LABEL_COL].to_numpy(dtype=int)

    rows = [
        compute_threshold_metrics(labels, probabilities, threshold)
        for threshold in args.thresholds
    ]
    output_path = args.output_dir / "threshold_comparison.csv"
    pd.DataFrame(rows).to_csv(output_path, index=False, encoding="utf-8-sig")

    print(f"Test samples: {len(test_df):,}")
    print(f"Saved threshold comparison: {output_path}")


if __name__ == "__main__":
    main()
