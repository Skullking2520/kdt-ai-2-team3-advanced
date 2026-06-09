"""S3 기반 로깅 모듈.

모든 파이프라인 모듈에서 공통으로 사용.
로컬 콘솔 출력 + S3 저장 동시 진행.

S3 저장 경로:
    logs/errors/YYYY/MM/DD/error_HHMMSS.jsonl
    logs/pipeline/YYYY/MM/DD/pipeline_HHMMSS.jsonl

사용법:
    from pipeline.logger import log_error, log_info, log_warning

    log_info("vector_io", "upsert_cases", "5건 적재 완료")
    log_error("vector_io", "upsert_cases", "차원 불일치", exc=e)
"""

import json
import traceback
from datetime import datetime
from zoneinfo import ZoneInfo

from .config import S3_BUCKET
from ._clients import get_s3_client

KST = ZoneInfo("Asia/Seoul")


def _get_client():
    return get_s3_client()


def _make_key(log_type: str) -> str:
    """S3 키 생성.

    log_type: 'errors' | 'pipeline'
    """
    now = datetime.now(KST)
    return (
        f"logs/{log_type}/"
        f"{now.year:04d}/{now.month:02d}/{now.day:02d}/"
        f"{log_type}_{now.strftime('%H%M%S')}.jsonl"
    )


def _save_to_s3(log_type: str, record: dict) -> None:
    """S3에 로그 레코드 append 저장.

    오늘 날짜 파일이 있으면 append, 없으면 새로 생성.
    """
    try:
        client = _get_client()
        now = datetime.now(KST)
        key = (
            f"logs/{log_type}/"
            f"{now.year:04d}/{now.month:02d}/{now.day:02d}/"
            f"daily.jsonl"
        )

        # 기존 파일 읽기
        try:
            response = client.get_object(Bucket=S3_BUCKET, Key=key)
            existing = response["Body"].read().decode("utf-8")
        except client.exceptions.NoSuchKey:
            existing = ""
        except Exception:
            existing = ""

        # 기존 내용 + 새 레코드 저장
        new_line = json.dumps(record, ensure_ascii=False)
        body = (existing.rstrip("\n") + "\n" + new_line + "\n").lstrip("\n")

        client.put_object(
            Bucket=S3_BUCKET,
            Key=key,
            Body=body.encode("utf-8"),
            ContentType="application/x-ndjson",
        )
    except Exception as e:
        # 로깅 자체가 실패해도 파이프라인 중단 안 함
        print(f"[Logger] S3 저장 실패: {e}")


def _build_record(
    level: str,
    module: str,
    function: str,
    message: str,
    detail: str | None = None,
) -> dict:
    """로그 레코드 생성."""
    return {
        "timestamp": datetime.now(KST).isoformat(),
        "level":     level,
        "module":    module,
        "function":  function,
        "message":   message,
        "detail":    detail,
    }


# ─────────────────────────────────────────────────
# 공개 함수
# ─────────────────────────────────────────────────

def log_info(module: str, function: str, message: str) -> None:
    """INFO 레벨 로그."""
    record = _build_record("INFO", module, function, message)
    print(f"[INFO] [{module}.{function}] {message}")
    _save_to_s3("pipeline", record)


def log_warning(module: str, function: str, message: str) -> None:
    """WARNING 레벨 로그."""
    record = _build_record("WARNING", module, function, message)
    print(f"[WARNING] [{module}.{function}] {message}")
    _save_to_s3("pipeline", record)


def log_error(
    module: str,
    function: str,
    message: str,
    exc: Exception | None = None,
) -> None:
    """ERROR 레벨 로그.

    exc: 예외 객체 (스택 트레이스 포함)
    """
    detail = traceback.format_exc() if exc else None
    record = _build_record("ERROR", module, function, message, detail)
    print(f"[ERROR] [{module}.{function}] {message}")
    if detail:
        print(detail)
    _save_to_s3("errors", record)
