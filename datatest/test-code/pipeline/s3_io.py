"""S3 입출력 헬퍼.

JSONL 형식으로 한 줄씩 쓰고, line_no로 위치 추적 가능.
배치 저장: 파이프라인 100건, VT 1000건 단위로 flush.
"""

import io
import json
from datetime import datetime

import boto3

from .config import S3_BUCKET, S3_REGION, BATCH_SIZE_PIPELINE, BATCH_SIZE_VT

_client = None


def get_client():
    """싱글톤 S3 클라이언트."""
    global _client
    if _client is None:
        _client = boto3.client("s3", region_name=S3_REGION)
    return _client


def make_batch_key(stage: str, batch_id: str) -> str:
    """배치 파일 S3 키 생성.

    예: stage='raw', batch_id='20260601_153000'
        -> raw/2026/06/01/batch_20260601_153000.jsonl
    """
    now = datetime.now()
    return (
        f"{stage}/{now.year:04d}/{now.month:02d}/{now.day:02d}/"
        f"batch_{batch_id}.jsonl"
    )


def put_jsonl(key: str, records: list[dict]) -> str:
    """레코드 리스트를 JSONL로 S3 업로드.

    Returns:
        s3://bucket/key 형식의 전체 경로
    """
    client = get_client()
    buf = io.StringIO()
    for rec in records:
        buf.write(json.dumps(rec, ensure_ascii=False))
        buf.write("\n")

    client.put_object(
        Bucket=S3_BUCKET,
        Key=key,
        Body=buf.getvalue().encode("utf-8"),
        ContentType="application/x-ndjson",
    )
    return f"s3://{S3_BUCKET}/{key}"


def get_jsonl(key: str) -> list[dict]:
    """S3 JSONL 파일을 읽어 dict 리스트로 반환."""
    client = get_client()
    response = client.get_object(Bucket=S3_BUCKET, Key=key)
    body = response["Body"].read().decode("utf-8")
    return [json.loads(line) for line in body.strip().split("\n") if line]


def delete_object(key: str) -> None:
    """S3 객체 삭제 (정리용)."""
    client = get_client()
    client.delete_object(Bucket=S3_BUCKET, Key=key)


# ─────────────────────────────────────────────────
# 배치 저장
# ─────────────────────────────────────────────────

def _make_daily_key(stage: str, batch_no: int) -> str:
    """배치 번호 기반 S3 키 생성.

    예: stage='raw', batch_no=1
        -> raw/2026/06/04/batch_001.jsonl
    """
    now = datetime.now()
    return (
        f"{stage}/{now.year:04d}/{now.month:02d}/{now.day:02d}/"
        f"batch_{batch_no:03d}.jsonl"
    )


def _get_current_batch_key(stage: str, batch_size: int) -> tuple[str, list[dict]]:
    client = get_client()
    now = datetime.now()
    prefix = f"{stage}/{now.year:04d}/{now.month:02d}/{now.day:02d}/"

    response = client.list_objects_v2(Bucket=S3_BUCKET, Prefix=prefix)
    objects = response.get("Contents", [])

    # batch_NNN.jsonl 형식만 필터링
    batch_files = sorted(
        o["Key"] for o in objects
        if o["Key"].split("/")[-1].startswith("batch_")
        and o["Key"].split("/")[-1].replace("batch_", "").replace(".jsonl", "").isdigit()
    )

    if not batch_files:
        return _make_daily_key(stage, 1), []

    latest_key = batch_files[-1]
    existing = get_jsonl(latest_key)

    if len(existing) >= batch_size:
        batch_no = len(batch_files) + 1
        return _make_daily_key(stage, batch_no), []

    return latest_key, existing


def append_to_batch(stage: str, records: list[dict], batch_size: int) -> str:
    """배치 파일에 레코드 추가.

    batch_size 초과 시 자동으로 다음 파일 생성.

    Args:
        stage:      's3 폴더명' (raw/labeled/processed/reason/analytics/virustotal/auto 등)
        records:    추가할 레코드 리스트
        batch_size: 파일당 최대 건수

    Returns:
        저장된 s3://bucket/key 경로
    """
    key, existing = _get_current_batch_key(stage, batch_size)
    return put_jsonl(key, existing + records)


def append_pipeline(stage: str, records: list[dict]) -> str:
    """파이프라인 결과 배치 저장 (100건 단위)."""
    return append_to_batch(stage, records, BATCH_SIZE_PIPELINE)


def append_vt(mode: str, records: list[dict]) -> str:
    """VT 조회 결과 배치 저장 (1000건 단위)."""
    stage = f"analytics/virustotal/{mode}"
    return append_to_batch(stage, records, BATCH_SIZE_VT)