from __future__ import annotations

import datetime
import json
import os
from pathlib import Path
from typing import Any

import boto3
import pandas as pd

S3_BUCKET = os.getenv("CLEANLAB_S3_BUCKET", "smishing-s3-bucket")
S3_PREFIX = os.getenv("CLEANLAB_S3_PREFIX", "cleanlab-audit")


def _normalize_label(raw: Any) -> int | None:
    if raw in [0, 0.0, "0", "0.0"]:
        return 0
    if raw in [1, 1.0, "1", "1.0"]:
        return 1
    return None


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


def save_artifacts(report_df: pd.DataFrame, output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)

    report_df.to_csv(output_dir / "label_audit_report.csv", index=False, encoding="utf-8-sig")
    print(f"전체 리포트  : {output_dir / 'label_audit_report.csv'}")

    noise_df = (
        report_df[report_df["is_label_issue"]]
        .sort_values("label_quality_score")
        .reset_index(drop=True)
    )
    noise_df.to_csv(output_dir / "suspected_noisy_labels.csv", index=False, encoding="utf-8-sig")
    print(f"노이즈 목록  : {output_dir / 'suspected_noisy_labels.csv'} ({len(noise_df):,}개)")

    clean_df = report_df[~report_df["is_label_issue"]][["text", "label"]].reset_index(drop=True)
    with (output_dir / "cleaned_dataset.jsonl").open("w", encoding="utf-8") as f:
        for row in clean_df.itertuples(index=False):
            f.write(json.dumps({"text": row.text, "label": int(row.label)}, ensure_ascii=False) + "\n")
    print(f"정제 데이터  : {output_dir / 'cleaned_dataset.jsonl'} ({len(clean_df):,}개)")


def upload_to_s3(output_dir: Path, run_name: str, summary: dict[str, Any]) -> None:
    s3 = boto3.client("s3")
    timestamp = summary.get("timestamp") or datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    s3_run_prefix = f"{S3_PREFIX}/{run_name}/{timestamp}"

    print(f"\n=== S3 업로드: s3://{S3_BUCKET}/{s3_run_prefix}/ ===")
    for filename in ("pred_probs.npy", "label_audit_report.csv", "suspected_noisy_labels.csv", "cleaned_dataset.jsonl", "audit_log.json"):
        local_path = output_dir / filename
        if not local_path.exists():
            print(f"  스킵 (없음): {filename}")
            continue
        s3_key = f"{s3_run_prefix}/{filename}"
        s3.upload_file(str(local_path), S3_BUCKET, s3_key)
        print(f"  업로드: s3://{S3_BUCKET}/{s3_key}")
