"""MySQL 헬퍼.

processing_log: 단계별 누적 갱신
blacklist: 정적 필터링 조회
"""

import json
from contextlib import contextmanager
from typing import Any

import pymysql

from .config import MYSQL_CONFIG


@contextmanager
def get_conn():
    """커넥션 컨텍스트 매니저."""
    conn = pymysql.connect(
        **MYSQL_CONFIG,
        cursorclass=pymysql.cursors.DictCursor,
    )
    try:
        yield conn
    finally:
        conn.close()


def insert_processing_log(record: dict) -> None:
    """processing_log에 새 행 삽입 (Stage 0: raw 등록)."""
    sql = """
        INSERT INTO processing_log
            (id, source_text_hash, current_stage,
             stage_completed_at, source)
        VALUES
            (%(id)s, %(source_text_hash)s, %(current_stage)s,
             %(stage_completed_at)s, %(source)s)
    """
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(sql, {
            "id": record["id"],
            "source_text_hash": record.get("source_text_hash"),
            "current_stage": record.get("current_stage", "raw"),
            "stage_completed_at": json.dumps(
                record.get("stage_completed_at", {}),
                ensure_ascii=False,
            ),
            "source": record.get("source"),
        })


def update_stage(
    sms_id: str,
    stage: str,
    s3_path: str | None = None,
    line_no: int | None = None,
    extras: dict[str, Any] | None = None,
) -> None:
    """단계 진행 시 processing_log 업데이트.

    Args:
        sms_id: SMS UUID
        stage: 'labeled' | 'processed' | 'reason'
        s3_path: 해당 단계의 S3 파일 경로
        line_no: 파일 내 행 번호
        extras: 추가 필드 (label, score, risk_level 등)
    """
    sets = ["current_stage = %(stage)s"]
    params = {"id": sms_id, "stage": stage}

    if s3_path is not None:
        col_path = f"s3_{stage}_path"
        sets.append(f"{col_path} = %({col_path})s")
        params[col_path] = s3_path

    if line_no is not None:
        col_line = f"s3_{stage}_line_no"
        sets.append(f"{col_line} = %({col_line})s")
        params[col_line] = line_no

    if extras:
        for k, v in extras.items():
            sets.append(f"{k} = %({k})s")
            params[k] = v

    sql = f"UPDATE processing_log SET {', '.join(sets)} WHERE id = %(id)s"

    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(sql, params)


def lookup_blacklist(urls: list[str], phones: list[str]) -> dict | None:
    """블랙리스트 조회. 매칭되면 첫 매칭 정보 반환.

    Returns:
        {"id": ..., "pattern_type": ..., "pattern_value": ..., "category": ...}
        매칭 없으면 None
    """
    candidates = []
    candidates.extend(("url", v) for v in urls)
    candidates.extend(("phone", v) for v in phones)
    if not candidates:
        return None

    sql = """
        SELECT id, pattern_type, pattern_value, category
        FROM blacklist
        WHERE pattern_value IN %s
          AND is_active = TRUE
        LIMIT 1
    """
    values = tuple(v for _, v in candidates)

    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(sql, (values,))
        return cur.fetchone()


def fetch_log(sms_id: str) -> dict | None:
    """processing_log에서 한 행 조회 (검증용)."""
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT * FROM processing_log WHERE id = %s",
            (sms_id,),
        )
        return cur.fetchone()

def update_blacklist_vt(
    blacklist_id: int,
    vt_score: int,
    vt_total: int,
    vt_risk: str,
    vt_report_path: str | None = None,
) -> None:
    sql = """
        UPDATE blacklist
        SET vt_score        = %(vt_score)s,
            vt_total        = %(vt_total)s,
            vt_risk         = %(vt_risk)s,
            vt_last_checked = NOW(),
            vt_report_path  = %(vt_report_path)s
        WHERE id = %(id)s
    """
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(sql, {
            "id": blacklist_id,
            "vt_score": vt_score,
            "vt_total": vt_total,
            "vt_risk": vt_risk,
            "vt_report_path": vt_report_path,
        })