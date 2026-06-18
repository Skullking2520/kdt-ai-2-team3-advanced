from __future__ import annotations

# ruff: noqa: E402, I001

import argparse
import os
from pathlib import Path

import pandas as pd


DEFAULT_RESULTS_DIR = Path(__file__).resolve().parents[1] / "results"
DEFAULT_MPL_CONFIG_DIR = DEFAULT_RESULTS_DIR / ".matplotlib_cache"
os.environ.setdefault("MPLCONFIGDIR", str(DEFAULT_MPL_CONFIG_DIR))

import matplotlib.pyplot as plt  # noqa: E402

METRIC_COLUMNS = ["test_f1", "test_precision", "test_recall", "test_acc"]
CONFUSION_COLUMNS = ["test_fp", "test_fn", "test_tp", "test_tn"]


def load_results(results_dir: Path) -> pd.DataFrame:
    final_path = results_dir / "experiment_comparison_final.csv"
    partial_path = results_dir / "experiment_comparison_partial.csv"
    csv_path = final_path if final_path.exists() else partial_path

    if not csv_path.exists():
        raise FileNotFoundError(
            "No experiment comparison CSV found. Expected "
            f"{final_path} or {partial_path}."
        )

    return pd.read_csv(csv_path)


def experiment_labels(df: pd.DataFrame) -> list[str]:
    return [
        name.replace("focal_positive_oversampling_", "focal_os_")
        for name in df["experiment_name"].astype(str)
    ]


def plot_metric_bars(df: pd.DataFrame, output_path: Path) -> None:
    labels = experiment_labels(df)
    plot_df = df.set_index(pd.Index(labels))[METRIC_COLUMNS]

    ax = plot_df.plot(kind="bar", figsize=(13, 6), width=0.82)
    ax.set_title("Encoder Experiment Metrics")
    ax.set_xlabel("Experiment")
    ax.set_ylabel("Score")
    ax.set_ylim(0, 1)
    ax.legend(["F1", "Precision", "Recall", "Accuracy"], loc="lower right")
    ax.grid(axis="y", alpha=0.25)
    plt.xticks(rotation=35, ha="right")
    plt.tight_layout()
    plt.savefig(output_path, dpi=180)
    plt.close()


def plot_confusion_counts(df: pd.DataFrame, output_path: Path) -> None:
    labels = experiment_labels(df)
    plot_df = df.set_index(pd.Index(labels))[CONFUSION_COLUMNS]

    ax = plot_df.plot(kind="bar", figsize=(13, 6), width=0.82)
    ax.set_title("Encoder Test Confusion Counts")
    ax.set_xlabel("Experiment")
    ax.set_ylabel("Count")
    ax.legend(["FP", "FN", "TP", "TN"], loc="upper right")
    ax.grid(axis="y", alpha=0.25)
    plt.xticks(rotation=35, ha="right")
    plt.tight_layout()
    plt.savefig(output_path, dpi=180)
    plt.close()


def write_markdown_summary(df: pd.DataFrame, output_path: Path) -> None:
    ordered = df.sort_values(
        by=["test_f1", "test_recall", "test_precision"],
        ascending=False,
    )
    best = ordered.iloc[0]
    summary_cols = [
        "experiment_name",
        "positive_oversampling_ratio",
        "test_f1",
        "test_precision",
        "test_recall",
        "test_acc",
        "test_fp",
        "test_fn",
    ]

    lines = [
        "# Encoder Experiment Visualization Summary",
        "",
        "## Best By F1",
        "",
        f"- Experiment: `{best['experiment_name']}`",
        f"- F1: `{best['test_f1']:.4f}`",
        f"- Precision: `{best['test_precision']:.4f}`",
        f"- Recall: `{best['test_recall']:.4f}`",
        "",
        "## Ranking",
        "",
        ordered[summary_cols].to_markdown(index=False),
        "",
    ]
    output_path.write_text("\n".join(lines), encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Create local plots from encoder experiment results."
    )
    parser.add_argument("--results-dir", type=Path, default=DEFAULT_RESULTS_DIR)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    plots_dir = args.results_dir / "plots"
    plots_dir.mkdir(parents=True, exist_ok=True)

    df = load_results(args.results_dir)
    plot_metric_bars(df, plots_dir / "metric_comparison.png")
    plot_confusion_counts(df, plots_dir / "confusion_counts.png")
    write_markdown_summary(df, plots_dir / "summary.md")

    print(f"Saved plots to {plots_dir}")


if __name__ == "__main__":
    main()
