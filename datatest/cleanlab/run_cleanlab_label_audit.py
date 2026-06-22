"""
Cleanlab label-noise audit for SMS phishing dataset.

두 가지 모드:
  A) K-fold CV (기본, 정확)
     - beomi/KcELECTRA-base를 각 fold마다 새로 fine-tune
     - 각 샘플은 자신을 학습하지 않은 모델이 예측 (out-of-sample)
     - 시간: ~5시간 (91K, 5-fold, MPS)

  B) Direct inference (--direct-inference, 빠름, 편향 주의)
     - 이미 학습된 HuggingFace 모델로 1회 추론
     - 학습 데이터와 동일한 데이터셋이면 in-sample 편향 발생
     - 시간: ~10분

Usage:
  # 빠른 테스트 (1000개, 3-fold)
  python run_cleanlab_label_audit.py \
      --data-path "/path/to/final_data.jsonl" \
      --subsample 1000 --n-splits 3

  # 전체 실행 (91K, 5-fold)
  python run_cleanlab_label_audit.py \
      --data-path "/path/to/final_data.jsonl"

  # 직접 추론 모드 (빠름)
  python run_cleanlab_label_audit.py \
      --data-path "/path/to/final_data.jsonl" \
      --direct-inference

  # pred_probs 캐시 재사용 (K-fold 스킵)
  python run_cleanlab_label_audit.py \
      --data-path "/path/to/final_data.jsonl" \
      --use-cached-probs

  # S3 업로드 포함
  python run_cleanlab_label_audit.py \
      --data-path "/path/to/final_data.jsonl" \
      --upload-s3
"""
from __future__ import annotations

import argparse
import datetime
import json
import os
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
from transformers import AutoTokenizer, set_seed

from ._device import DEVICE
from ._io import S3_BUCKET, load_jsonl, save_artifacts, upload_to_s3
from ._trainer import FINETUNED_MODEL, SEED, generate_pred_probs_direct, generate_pred_probs_kfold

warnings.filterwarnings("ignore")
os.environ.setdefault("PYTORCH_ENABLE_MPS_FALLBACK", "1")

DEFAULT_OUTPUT_DIR = Path(__file__).resolve().parent / "results"


def run_cleanlab_audit(df: pd.DataFrame, pred_probs: np.ndarray) -> pd.DataFrame:
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

    return report_df


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Cleanlab SMS 레이블 노이즈 탐지")
    parser.add_argument("--data-path", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--n-splits", type=int, default=5)
    parser.add_argument("--epochs", type=int, default=2)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--max-length", type=int, default=128)
    parser.add_argument("--learning-rate", type=float, default=3e-5)
    parser.add_argument("--direct-inference", action="store_true")
    parser.add_argument("--use-cached-probs", action="store_true")
    parser.add_argument("--subsample", type=int, default=None)
    parser.add_argument("--run-name", default=None, help="S3 업로드 run 이름. 기본값: audit_{mode}")
    parser.add_argument("--upload-s3", action="store_true", help="결과를 S3에 업로드 (기본값: 로컬 저장만)")
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
    run_name = args.run_name or f"audit_{mode}"

    print(f"Device : {DEVICE}")
    print(f"Data   : {args.data_path}")
    print(f"Mode   : {mode}")
    print(f"Output : {args.output_dir}")

    df = load_jsonl(args.data_path)
    print(f"\n로드: {len(df):,}개 레이블 샘플")
    print(df["label"].value_counts().to_string())

    if args.subsample and args.subsample < len(df):
        from sklearn.model_selection import train_test_split
        df, _ = train_test_split(df, train_size=args.subsample, stratify=df["label"], random_state=SEED)
        df = df.reset_index(drop=True)
        print(f"서브샘플: {len(df):,}개")

    tokenizer = AutoTokenizer.from_pretrained(FINETUNED_MODEL)

    pred_probs_path = args.output_dir / "pred_probs.npy"
    if args.use_cached_probs and pred_probs_path.exists():
        print(f"\n캐시 로드: {pred_probs_path}")
        pred_probs = np.load(str(pred_probs_path))
        if pred_probs.shape[0] != len(df):
            raise ValueError(f"캐시 shape {pred_probs.shape} != 데이터 크기 {len(df)}.")
    elif args.direct_inference:
        print("\n=== Direct Inference 모드 (in-sample 편향 주의) ===")
        args.output_dir.mkdir(parents=True, exist_ok=True)
        pred_probs = generate_pred_probs_direct(
            df, tokenizer, params["max_length"], params["batch_size"],
            tmp_dir=args.output_dir / "direct_inference_tmp",
        )
        np.save(str(pred_probs_path), pred_probs)
    else:
        print(f"\n=== K-fold CV ({args.n_splits}-fold, out-of-sample) ===")
        args.output_dir.mkdir(parents=True, exist_ok=True)
        pred_probs = generate_pred_probs_kfold(df, tokenizer, args.output_dir, args.n_splits, params)
        np.save(str(pred_probs_path), pred_probs)
    print(f"pred_probs 저장: {pred_probs_path}")

    print("\n=== Cleanlab 노이즈 탐지 ===")
    report_df = run_cleanlab_audit(df, pred_probs)

    print("\n=== 결과 저장 ===")
    save_artifacts(report_df, args.output_dir)

    n_issues = int(report_df["is_label_issue"].sum())
    n_total = len(report_df)
    timestamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    summary = {
        "mode": mode,
        "data_path": str(args.data_path),
        "n_total": n_total,
        "n_label_issues": n_issues,
        "issue_rate": round(n_issues / n_total, 4),
        "n_clean": n_total - n_issues,
        "n_splits": args.n_splits,
        "subsample": args.subsample,
        **params,
    }
    log_data = {"run_name": run_name, "timestamp": timestamp, **summary}
    with (args.output_dir / "audit_log.json").open("w", encoding="utf-8") as f:
        json.dump(log_data, f, ensure_ascii=False, indent=2, default=str)
    print(f"감사 로그: {args.output_dir / 'audit_log.json'}")

    if args.upload_s3:
        upload_to_s3(args.output_dir, run_name=run_name, summary={**summary, "timestamp": timestamp})
    else:
        print("\nS3 업로드 스킵 (--upload-s3 플래그 없음). 로컬 저장만 완료.")
        if S3_BUCKET:
            print("업로드하려면: python run_cleanlab_label_audit.py ... --upload-s3")

    print("\n완료.")


if __name__ == "__main__":
    main()
