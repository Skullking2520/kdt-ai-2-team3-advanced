"""S3 입출력 헬퍼.

JSONL 형식으로 한 줄씩 쓰고, line_no로 위치 추적 가능.
"""

import io
import json
from datetime import datetime

import boto3

from .config import S3_BUCKET, S3_REGION

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
