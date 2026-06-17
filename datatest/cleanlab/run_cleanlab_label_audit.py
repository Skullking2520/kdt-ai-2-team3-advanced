"""
Cleanlab label-noise audit for SMS phishing dataset.

두 가지 모드:
  A) K-fold CV (기본, 정확)
     - beomi/KcELECTRA-base를 각 fold마다 새로 fine-tune
     - 각 샘플은 자신을 학습에 사용하지 않은 모델이 예측 (out-of-sample)
     - 시간: ~5시간 (91K, 5-fold, MPS)

  B) Direct inference (--direct-inference, 빠름, 편향 주의)
     - 이미 학습된 HuggingFace 모델로 1회 추론
     - 학습 데이터와 동일한 데이터셋이면 in-sample 편향 발생
     - 명백한 레이블 오류는 잡히지만 누락 많음
     - 시간: ~5-10분

Usage:
  # 빠른 테스트 (1000개, 3-fold)
  python run_cleanlab_label_audit.py \\
      --data-path "/path/to/final_data.jsonl" \\
      --subsample 1000 --n-splits 3 --use-mlflow

  # 전체 실행 (91K, 5-fold)
  python run_cleanlab_label_audit.py \\
      --data-path "/path/to/final_data.jsonl" \\
      --use-mlflow

  # 직접 추론 모드 (빠름)
  python run_cleanlab_label_audit.py \\
      --data-path "/path/to/final_data.jsonl" \\
      --direct-inference --use-mlflow

  # pred_probs 캐시 재사용
  python run_cleanlab_label_audit.py \\
      --data-path "/path/to/final_data.jsonl" \\
      --use-cached-probs --use-mlflow

MLflow UI 실행:
  mlflow ui --backend-store-uri datatest/cleanlab/mlruns
  → http://localhost:5000
"""
from __future__ import annotations

import argparse
import gc
import json
import os
import warnings
from pathlib import Path
from typing import Any

import datetime
import logging

import boto3
import numpy as np
import pandas as pd
import torch
from datasets import Dataset
from sklearn.model_selection import StratifiedKFold
from transformers import (
    AutoModelForSequenceClassification,
    AutoTokenizer,
    DataCollatorWithPadding,
    Trainer,
    TrainingArguments,
    set_seed,
)

warnings.filterwarnings("ignore")
os.environ.setdefault("PYTORCH_ENABLE_MPS_FALLBACK", "1")

BASE_MODEL = "beomi/KcELECTRA-base"
FINETUNED_MODEL = "kdt-2-team4-newbiz/kcelectra-smishing-classifier"
NUM_LABELS = 2
SEED = 42
DEFAULT_OUTPUT_DIR = Path(__file__).resolve().parent / "results"
S3_BUCKET = "smishing-dev-newbies-2026"
S3_PREFIX = "cleanlab-audit"


def get_device() -> str:
    if torch.backends.mps.is_available():
        return "mps"
    if torch.cuda.is_available():
        return "cuda"
    return "cpu"


DEVICE = get_device()


def clear_memory() -> None:
    gc.collect()
    if DEVICE == "mps":
        torch.mps.empty_cache()
    elif torch.cuda.is_available():
        torch.cuda.empty_cache()


def load_jsonl(path: Path) -> pd.DataFrame:
    rows: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            try:
                row = json.loads(line)
            except json.JSONDecodeError:
                print(f"Bad JSON skipped: line {line_num}")
                continue
            text = row.get("text")
            label = _normalize_label(row.get("label"))
            if text is None or str(text).strip() == "" or label is None:
                continue
            rows.append({"text": str(text), "label": label})
    if not rows:
        raise ValueError(f"No usable rows in {path}")
    return pd.DataFrame(rows)


def _normalize_label(raw: Any) -> int | None:
    if raw in [0, 0.0, "0", "0.0"]:
        return 0
    if raw in [1, 1.0, "1", "1.0"]:
        return 1
    return None


def _tokenize_df(tokenizer: AutoTokenizer, df: pd.DataFrame, max_length: int) -> Dataset:
    ds = Dataset.from_pandas(df.reset_index(drop=True))
    ds = ds.map(
        lambda batch: tokenizer(batch["text"], truncation=True, max_length=max_length),
        batched=True,
        remove_columns=["text"],
    )
    return ds.rename_column("label", "labels")


def generate_pred_probs_direct(
    df: pd.DataFrame,
    tokenizer: AutoTokenizer,
    max_length: int,
    batch_size: int,
) -> np.ndarray:
    """
    이미 학습된 모델로 전체 데이터셋에 1회 추론.
    주의: 학습 데이터와 동일하면 in-sample 편향 발생.
    명백한 레이블 오류만 탐지 가능.
    """
    print(f"Loading fine-tuned model: {FINETUNED_MODEL}")
    model = AutoModelForSequenceClassification.from_pretrained(
        FINETUNED_MODEL, num_labels=NUM_LABELS
    )
    model.to(DEVICE)
    model.eval()

    ds = _tokenize_df(tokenizer, df, max_length)

    args = TrainingArguments(
        output_dir=str(DEFAULT_OUTPUT_DIR / "direct_inference_tmp"),
        per_device_eval_batch_size=batch_size * 2,
        report_to="none",
        seed=SEED,
    )
    trainer = Trainer(
        model=model,
        args=args,
        data_collator=DataCollatorWithPadding(tokenizer),
    )

    raw = trainer.predict(ds)
    logits = torch.tensor(raw.predictions)
    pred_probs = torch.softmax(logits, dim=-1).numpy().astype(np.float32)

    del trainer, model, ds
    clear_memory()
    return pred_probs


def generate_pred_probs_kfold(
    df: pd.DataFrame,
    tokenizer: AutoTokenizer,
    output_dir: Path,
    n_splits: int,
    params: dict[str, Any],
) -> np.ndarray:
    """
    K-fold 교차검증으로 out-of-sample pred_probs (N, 2) 생성.
    각 샘플은 자신을 학습하지 않은 모델이 예측 → Cleanlab에 적합.
    """
    pred_probs = np.zeros((len(df), NUM_LABELS), dtype=np.float32)
    labels = df["label"].values
    skf = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=SEED)

    for fold, (train_idx, val_idx) in enumerate(skf.split(np.zeros(len(df)), labels)):
        print(f"\n--- Fold {fold + 1}/{n_splits} | train={len(train_idx):,} val={len(val_idx):,} ---")

        train_df = df.iloc[train_idx].reset_index(drop=True)
        val_df = df.iloc[val_idx].reset_index(drop=True)

        train_ds = _tokenize_df(tokenizer, train_df, params["max_length"])
        val_ds = _tokenize_df(tokenizer, val_df, params["max_length"])

        model = AutoModelForSequenceClassification.from_pretrained(
            BASE_MODEL, num_labels=NUM_LABELS
        )
        model.to(DEVICE)

        args = TrainingArguments(
            output_dir=str(output_dir / f"fold_{fold}"),
            num_train_epochs=params["epochs"],
            per_device_train_batch_size=params["batch_size"],
            per_device_eval_batch_size=params["batch_size"] * 2,
            learning_rate=params["learning_rate"],
            weight_decay=0.01,
            warmup_ratio=0.06,
            eval_strategy="epoch",
            save_strategy="no",
            logging_strategy="epoch",
            load_best_model_at_end=False,
            seed=SEED,
            report_to="none",
        )
        trainer = Trainer(
            model=model,
            args=args,
            train_dataset=train_ds,
            eval_dataset=val_ds,
            data_collator=DataCollatorWithPadding(tokenizer),
        )
        trainer.train()

        raw = trainer.predict(val_ds)
        logits = torch.tensor(raw.predictions)
        softmax = torch.softmax(logits, dim=-1).numpy()
        pred_probs[val_idx] = softmax

        del trainer, model, train_ds, val_ds
        clear_memory()

    pred_probs = np.clip(pred_probs, 1e-6, 1 - 1e-6)
    pred_probs /= pred_probs.sum(axis=1, keepdims=True)
    return pred_probs


def run_cleanlab_audit(
    df: pd.DataFrame,
    pred_probs: np.ndarray,
    mlflow_run: Any | None,
) -> pd.DataFrame:
    from cleanlab.filter import find_label_issues
    from cleanlab.rank import get_label_quality_scores

    labels = df["label"].values

    issue_indices = find_label_issues(
        labels=labels,
        pred_probs=pred_probs,
        return_indices_ranked_by="self_confidence",
    )
    quality_scores = get_label_quality_scores(labels=labels, pred_probs=pred_probs)

    report_df = df.copy()
    report_df["label_quality_score"] = quality_scores
    report_df["is_label_issue"] = False
    report_df.loc[issue_indices, "is_label_issue"] = True
    report_df["pred_prob_normal"] = pred_probs[:, 0]
    report_df["pred_prob_smishing"] = pred_probs[:, 1]

    n_issues = len(issue_indices)
    n_total = len(df)
    issue_rate = n_issues / n_total
    issues_by_label = report_df[report_df["is_label_issue"]].groupby("label").size().to_dict()

    print(f"\n=== Cleanlab 결과 ===")
    print(f"전체 샘플     : {n_total:,}")
    print(f"노이즈 의심   : {n_issues:,} ({issue_rate:.2%})")
    print(f"  label=0 (정상) 의심   : {issues_by_label.get(0, 0):,}")
    print(f"  label=1 (피싱) 의심   : {issues_by_label.get(1, 0):,}")
    print(f"정제 후 남은 샘플 : {n_total - n_issues:,}")

    if mlflow_run is not None:
        import mlflow

        mlflow.log_metrics({
            "cleanlab/n_total": n_total,
            "cleanlab/n_label_issues": n_issues,
            "cleanlab/issue_rate": round(issue_rate, 4),
            "cleanlab/n_clean": n_total - n_issues,
            "cleanlab/issues_label_0_normal": issues_by_label.get(0, 0),
            "cleanlab/issues_label_1_smishing": issues_by_label.get(1, 0),
        })

        clean_df = report_df[~report_df["is_label_issue"]]
        mlflow.log_metrics({
            "cleanlab/clean_label_0": int((clean_df["label"] == 0).sum()),
            "cleanlab/clean_label_1": int((clean_df["label"] == 1).sum()),
        })

        # 품질 점수 분포를 히스토그램 이미지로 저장
        try:
            import matplotlib
            matplotlib.use("Agg")
            import matplotlib.pyplot as plt
            fig, ax = plt.subplots(figsize=(8, 4))
            ax.hist(quality_scores, bins=50, color="steelblue", edgecolor="white")
            ax.set_xlabel("Label Quality Score")
            ax.set_ylabel("Count")
            ax.set_title("Label Quality Score Distribution")
            mlflow.log_figure(fig, "label_quality_score_dist.png")
            plt.close(fig)
        except Exception:
            pass

        # 상위 노이즈 샘플 CSV 아티팩트
        top_noisy = (
            report_df[report_df["is_label_issue"]]
            .nsmallest(min(300, n_issues), "label_quality_score")[
                ["text", "label", "label_quality_score", "pred_prob_normal", "pred_prob_smishing"]
            ]
        )
        if len(top_noisy) > 0:
            import tempfile
            with tempfile.NamedTemporaryFile(suffix=".csv", delete=False, mode="w", encoding="utf-8") as tmp:
                top_noisy.to_csv(tmp.name, index=False)
                mlflow.log_artifact(tmp.name, artifact_path="cleanlab")

    return report_df


def upload_to_s3(output_dir: Path, run_name: str, summary: dict[str, Any]) -> None:
    """결과 파일 + 메타데이터 로그를 S3에 업로드."""
    s3 = boto3.client("s3")
    timestamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    s3_run_prefix = f"{S3_PREFIX}/{run_name}/{timestamp}"

    # 메타데이터 로그 저장 (로컬 + S3)
    log_path = output_dir / "audit_log.json"
    log_data = {"run_name": run_name, "timestamp": timestamp, **summary}
    with log_path.open("w", encoding="utf-8") as f:
        json.dump(log_data, f, ensure_ascii=False, indent=2, default=str)

    upload_targets = [
        "pred_probs.npy",
        "label_audit_report.csv",
        "suspected_noisy_labels.csv",
        "cleaned_dataset.jsonl",
        "audit_log.json",
    ]

    print(f"\n=== S3 업로드: s3://{S3_BUCKET}/{s3_run_prefix}/ ===")
    for filename in upload_targets:
        local_path = output_dir / filename
        if not local_path.exists():
            print(f"  스킵 (없음): {filename}")
            continue
        s3_key = f"{s3_run_prefix}/{filename}"
        s3.upload_file(str(local_path), S3_BUCKET, s3_key)
        print(f"  업로드: s3://{S3_BUCKET}/{s3_key}")


def save_artifacts(report_df: pd.DataFrame, output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)

    report_path = output_dir / "label_audit_report.csv"
    report_df.to_csv(report_path, index=False, encoding="utf-8-sig")
    print(f"전체 리포트  : {report_path}")

    noise_df = (
        report_df[report_df["is_label_issue"]]
        .sort_values("label_quality_score")
        .reset_index(drop=True)
    )
    noise_path = output_dir / "suspected_noisy_labels.csv"
    noise_df.to_csv(noise_path, index=False, encoding="utf-8-sig")
    print(f"노이즈 목록  : {noise_path} ({len(noise_df):,}개)")

    clean_df = (
        report_df[~report_df["is_label_issue"]][["text", "label"]]
        .reset_index(drop=True)
    )
    clean_path = output_dir / "cleaned_dataset.jsonl"
    with clean_path.open("w", encoding="utf-8") as f:
        for row in clean_df.itertuples(index=False):
            f.write(json.dumps({"text": row.text, "label": int(row.label)}, ensure_ascii=False) + "\n")
    print(f"정제 데이터  : {clean_path} ({len(clean_df):,}개)")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Cleanlab SMS 레이블 노이즈 탐지")
    parser.add_argument("--data-path", type=Path, required=True, help="JSONL 데이터셋 경로")
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    # K-fold 파라미터
    parser.add_argument("--n-splits", type=int, default=5, help="K-fold 수 (빠른 실행: 3)")
    parser.add_argument("--epochs", type=int, default=2)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--max-length", type=int, default=128)
    parser.add_argument("--learning-rate", type=float, default=3e-5)
    # 모드 선택
    parser.add_argument(
        "--direct-inference",
        action="store_true",
        help=(
            "K-fold 대신 기존 fine-tuned 모델로 1회 추론. "
            "빠르지만 학습 데이터와 동일하면 in-sample 편향 주의."
        ),
    )
    parser.add_argument(
        "--use-cached-probs",
        action="store_true",
        help="output-dir/pred_probs.npy 캐시 재사용 (K-fold/추론 스킵)",
    )
    parser.add_argument(
        "--subsample",
        type=int,
        default=None,
        help="N개만 사용 (stratified). 빠른 테스트용.",
    )
    # MLflow
    parser.add_argument("--use-mlflow", action="store_true")
    parser.add_argument("--mlflow-experiment", default="smishing-cleanlab-audit")
    parser.add_argument("--mlflow-run-name", default="cleanlab_audit")
    parser.add_argument(
        "--mlflow-tracking-uri",
        default=None,
        help="MLflow tracking URI. 기본값: output-dir/mlruns (로컬)",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    set_seed(SEED)

    params = {
        "epochs": args.epochs,
        "batch_size": args.batch_size,
        "max_length": args.max_length,
        "learning_rate": args.learning_rate,
    }
    mode = "direct_inference" if args.direct_inference else f"kfold_{args.n_splits}"

    print(f"Device : {DEVICE}")
    print(f"Data   : {args.data_path}")
    print(f"Mode   : {mode}")
    print(f"Output : {args.output_dir}")

    df = load_jsonl(args.data_path)
    print(f"\n로드: {len(df):,}개 레이블 샘플")
    print(df["label"].value_counts().to_string())

    if args.subsample and args.subsample < len(df):
        from sklearn.model_selection import train_test_split
        df, _ = train_test_split(
            df, train_size=args.subsample, stratify=df["label"], random_state=SEED
        )
        df = df.reset_index(drop=True)
        print(f"서브샘플: {len(df):,}개")

    tokenizer = AutoTokenizer.from_pretrained(FINETUNED_MODEL)

    mlflow_run = None
    if args.use_mlflow:
        import mlflow
        tracking_uri = args.mlflow_tracking_uri or f"sqlite:///{args.output_dir / 'mlflow.db'}"
        mlflow.set_tracking_uri(tracking_uri)
        mlflow.set_experiment(args.mlflow_experiment)
        mlflow_run = mlflow.start_run(run_name=args.mlflow_run_name)
        mlflow.log_params({
            "data_path": str(args.data_path),
            "mode": mode,
            "base_model": BASE_MODEL,
            "finetuned_model": FINETUNED_MODEL,
            "n_samples": len(df),
            "device": DEVICE,
            "label_0_normal": int((df["label"] == 0).sum()),
            "label_1_smishing": int((df["label"] == 1).sum()),
            **params,
        })
        print(f"MLflow tracking URI : {tracking_uri}")
        print(f"MLflow experiment   : {args.mlflow_experiment}")
        print(f"MLflow run name     : {args.mlflow_run_name}")

    # Step 1: pred_probs 생성 또는 캐시 로드
    pred_probs_path = args.output_dir / "pred_probs.npy"
    if args.use_cached_probs and pred_probs_path.exists():
        print(f"\n캐시 로드: {pred_probs_path}")
        pred_probs = np.load(str(pred_probs_path))
        if pred_probs.shape[0] != len(df):
            raise ValueError(
                f"캐시 shape {pred_probs.shape} != 데이터 크기 {len(df)}. "
                "--use-cached-probs 제거 후 재실행."
            )
    elif args.direct_inference:
        print("\n=== Direct Inference 모드 (in-sample 편향 주의) ===")
        pred_probs = generate_pred_probs_direct(
            df, tokenizer, params["max_length"], params["batch_size"]
        )
        args.output_dir.mkdir(parents=True, exist_ok=True)
        np.save(str(pred_probs_path), pred_probs)
        print(f"pred_probs 저장: {pred_probs_path}")
    else:
        print(f"\n=== K-fold CV ({args.n_splits}-fold, out-of-sample) ===")
        args.output_dir.mkdir(parents=True, exist_ok=True)
        pred_probs = generate_pred_probs_kfold(
            df, tokenizer, args.output_dir, args.n_splits, params
        )
        np.save(str(pred_probs_path), pred_probs)
        print(f"pred_probs 저장: {pred_probs_path}")

    # Step 2: Cleanlab 분석
    print("\n=== Cleanlab 노이즈 탐지 ===")
    report_df = run_cleanlab_audit(df, pred_probs, mlflow_run)

    # Step 3: 결과 저장
    print("\n=== 결과 저장 ===")
    save_artifacts(report_df, args.output_dir)

    # MLflow에 결과 파일 아티팩트 업로드
    if mlflow_run is not None:
        import mlflow
        for fname in ("label_audit_report.csv", "suspected_noisy_labels.csv", "cleaned_dataset.jsonl"):
            fpath = args.output_dir / fname
            if fpath.exists():
                mlflow.log_artifact(str(fpath), artifact_path="results")
        mlflow.end_run()
        print(f"\nMLflow UI: mlflow ui --backend-store-uri {tracking_uri}")
        print("→ http://localhost:5000")

    # S3 업로드
    n_issues = int(report_df["is_label_issue"].sum())
    n_total = len(report_df)
    upload_to_s3(
        args.output_dir,
        run_name=args.mlflow_run_name if args.use_mlflow else f"audit_{mode}",
        summary={
            "mode": mode,
            "data_path": str(args.data_path),
            "n_total": n_total,
            "n_label_issues": n_issues,
            "issue_rate": round(n_issues / n_total, 4),
            "n_clean": n_total - n_issues,
            "n_splits": args.n_splits,
            "subsample": args.subsample,
            **params,
        },
    )

    print("\n완료.")



if __name__ == "__main__":
    main()
