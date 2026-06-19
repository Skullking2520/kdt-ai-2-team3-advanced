"""
Cleanlab 정제 데이터셋 → encoder_retraining 스키마로 변환.

입력: cleaned_dataset.jsonl (Cleanlab 노이즈 제거 완료)
출력: encoder_retraining/data/prepared/<dataset_version>/
  ├── cleaned_train.jsonl
  ├── valid.jsonl
  ├── test.jsonl
  └── manifest.json

Usage:
  python prepare_dataset.py \
      --cleaned-data results/stage3/cleaned_dataset.jsonl \
      --dataset-version encoder-v4 \
      --output-root ../../encoder_retraining/data/prepared
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from datetime import datetime, timezone
from pathlib import Path

import boto3
import pandas as pd
from dotenv import load_dotenv
from sklearn.model_selection import train_test_split

load_dotenv(override=True)

S3_BUCKET     = os.environ.get("S3_BUCKET", "smishing-s3-bucket")
S3_DATA_ROOT  = "encoder_retraining"

SEED = 42
# train 80% / valid 10% / test 10%
VALID_RATIO = 0.10
TEST_RATIO = 0.10


def load_jsonl(path: Path) -> pd.DataFrame:
    rows = []
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return pd.DataFrame(rows)


def save_jsonl(df: pd.DataFrame, path: Path) -> None:
    with path.open("w", encoding="utf-8") as f:
        for row in df[["text", "label"]].itertuples(index=False):
            f.write(json.dumps({"text": row.text, "label": int(row.label)}, ensure_ascii=False) + "\n")


def _file_sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def prepare(cleaned_data: Path, dataset_version: str, output_root: Path) -> None:
    df = load_jsonl(cleaned_data)
    print(f"로드: {len(df):,}개")
    print(df["label"].value_counts().to_string())

    # train / temp 분리
    train_df, temp_df = train_test_split(
        df,
        test_size=VALID_RATIO + TEST_RATIO,
        stratify=df["label"],
        random_state=SEED,
    )
    # valid / test 분리 (temp의 50/50)
    valid_df, test_df = train_test_split(
        temp_df,
        test_size=TEST_RATIO / (VALID_RATIO + TEST_RATIO),
        stratify=temp_df["label"],
        random_state=SEED,
    )

    out_dir = output_root / dataset_version
    out_dir.mkdir(parents=True, exist_ok=True)

    save_jsonl(train_df, out_dir / "cleaned_train.jsonl")
    save_jsonl(valid_df, out_dir / "valid.jsonl")
    save_jsonl(test_df, out_dir / "test.jsonl")

    # audit_log.json이 같은 디렉터리에 있으면 run_id 추출
    audit_log_path = cleaned_data.parent / "audit_log.json"
    audit_run_id: str | None = None
    if audit_log_path.exists():
        try:
            log = json.loads(audit_log_path.read_text(encoding="utf-8"))
            audit_run_id = f"{log.get('run_name','')}_{log.get('timestamp','')}"
        except Exception:
            pass

    manifest = {
        "dataset_version": dataset_version,
        "created_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "created_by": "preprocessing_cleanlab_pipeline",
        "source": {
            "filename": cleaned_data.name,
            "sha256": _file_sha256(cleaned_data),
            "cleanlab_run_id": audit_run_id,
        },
        "label_mapping": {"0": "normal", "1": "phishing"},
        "split_ratio": {"train": 0.80, "valid": 0.10, "test": 0.10},
        "files": {
            "train": "cleaned_train.jsonl",
            "valid": "valid.jsonl",
            "test": "test.jsonl",
        },
        "sample_counts": {
            "train": {
                "total": len(train_df),
                "normal": int((train_df["label"] == 0).sum()),
                "phishing": int((train_df["label"] == 1).sum()),
            },
            "valid": {
                "total": len(valid_df),
                "normal": int((valid_df["label"] == 0).sum()),
                "phishing": int((valid_df["label"] == 1).sum()),
            },
            "test": {
                "total": len(test_df),
                "normal": int((test_df["label"] == 0).sum()),
                "phishing": int((test_df["label"] == 1).sum()),
            },
            "total": len(df),
        },
        "notes": "Preprocessed and Cleanlab-filtered dataset for encoder retraining.",
    }

    manifest_path = out_dir / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"\n출력: {out_dir}")
    print(f"  train : {len(train_df):,}개")
    print(f"  valid : {len(valid_df):,}개")
    print(f"  test  : {len(test_df):,}개")
    print(f"  manifest: {manifest_path}")

    # S3 업로드
    s3_prefix = f"{S3_DATA_ROOT}/{dataset_version}"
    s3 = boto3.client("s3")
    for local_file in [
        out_dir / "cleaned_train.jsonl",
        out_dir / "valid.jsonl",
        out_dir / "test.jsonl",
        manifest_path,
    ]:
        s3_key = f"{s3_prefix}/{local_file.name}"
        s3.upload_file(str(local_file), S3_BUCKET, s3_key)
        print(f"  S3 업로드: s3://{S3_BUCKET}/{s3_key}")

    print(f"\nS3: s3://{S3_BUCKET}/{s3_prefix}/")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--cleaned-data",
        type=Path,
        default=Path(__file__).resolve().parent / "results" / "stage3" / "cleaned_dataset.jsonl",
    )
    parser.add_argument("--dataset-version", default="encoder-v4")
    parser.add_argument(
        "--output-root",
        type=Path,
        default=Path(__file__).resolve().parents[2] / "encoder_retraining" / "data" / "prepared",
    )
    args = parser.parse_args()
    prepare(args.cleaned_data, args.dataset_version, args.output_root)


if __name__ == "__main__":
    main()
