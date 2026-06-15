from __future__ import annotations

import argparse
from pathlib import Path

import pandas as pd
from encoder_analysis_utils import (
    DEFAULT_KEYWORDS,
    LABEL_COL,
    TEXT_COL,
    detect_keywords,
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


def parse_error_analysis_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Extract encoder false positives and false negatives."
    )
    parser.add_argument("--data-path", type=Path, default=DEFAULT_DATA_PATH)
    parser.add_argument("--model-path", type=Path, default=DEFAULT_MODEL_PATH)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--max-length", type=int, default=128)
    parser.add_argument("--threshold", type=float, default=0.5)
    return parser.parse_args()


def build_keyword_fp_summary(predictions_df: pd.DataFrame) -> pd.DataFrame:
    rows = []
    normal_df = predictions_df[predictions_df["true_label"] == 0]
    false_positive_df = normal_df[normal_df["pred_label"] == 1]

    for keyword in DEFAULT_KEYWORDS:
        normal_keyword_count = int(
            normal_df["detected_keywords"].str.contains(keyword, regex=False).sum()
        )
        fp_keyword_count = int(
            false_positive_df["detected_keywords"]
            .str.contains(keyword, regex=False)
            .sum()
        )
        rows.append(
            {
                "keyword": keyword,
                "normal_sample_count": normal_keyword_count,
                "false_positive_count": fp_keyword_count,
                "false_positive_rate": (
                    fp_keyword_count / normal_keyword_count
                    if normal_keyword_count
                    else 0.0
                ),
            }
        )

    return pd.DataFrame(rows)


def main() -> None:
    args = parse_error_analysis_args()
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
    pred_labels = (probabilities >= args.threshold).astype(int)

    predictions_df = pd.DataFrame(
        {
            "text": test_df[TEXT_COL],
            "true_label": test_df[LABEL_COL].astype(int),
            "pred_label": pred_labels.astype(int),
            "confidence": probabilities,
        }
    )
    predictions_df["detected_keywords"] = predictions_df["text"].apply(
        lambda text: ", ".join(detect_keywords(str(text)))
    )

    false_positives = predictions_df[
        (predictions_df["true_label"] == 0)
        & (predictions_df["pred_label"] == 1)
    ]
    false_negatives = predictions_df[
        (predictions_df["true_label"] == 1)
        & (predictions_df["pred_label"] == 0)
    ]
    keyword_summary = build_keyword_fp_summary(predictions_df)

    false_positives.to_csv(
        args.output_dir / "false_positives.csv",
        index=False,
        encoding="utf-8-sig",
    )
    false_negatives.to_csv(
        args.output_dir / "false_negatives.csv",
        index=False,
        encoding="utf-8-sig",
    )
    keyword_summary.to_csv(
        args.output_dir / "keyword_fp_summary.csv",
        index=False,
        encoding="utf-8-sig",
    )

    print(f"Test samples: {len(test_df):,}")
    print(f"False positives: {len(false_positives):,}")
    print(f"False negatives: {len(false_negatives):,}")
    print(f"Saved outputs to {args.output_dir}")


if __name__ == "__main__":
    main()
