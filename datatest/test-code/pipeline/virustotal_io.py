"""VirusTotal API 헬퍼.

무료 플랜 기준:
- 분당 4회 제한
- 하루 500회 제한
  → 자동(APScheduler): 400회
  → 수동(사용자 요청):  100회

S3 저장 경로:
    analytics/virustotal/auto/YYYY/MM/DD/batch_YYYYMMDD_HHMMSS.jsonl
    analytics/virustotal/manual/YYYY/MM/DD/batch_YYYYMMDD_HHMMSS.jsonl

주요 함수:
    process_vt_result()  : 통합 프로세스 (조회 → 요약 → S3 → MySQL)
    can_call(mode)       : 할당량 확인
    summarize_report()   : 원본 응답 → 한글 요약본
"""

import base64
import time
from datetime import date, datetime, timezone
from typing import Literal

import requests

from .config import (
    S3_BUCKET,
    VT_API_KEY,
    VT_DAILY_AUTO_LIMIT,
    VT_DAILY_MANUAL_LIMIT,
    VT_RATE_LIMIT_PER_MIN,
)
from .mysql_io import get_conn, update_blacklist_vt
from .s3_io import append_vt

# ─────────────────────────────────────────────────
# 상수
# ─────────────────────────────────────────────────
VT_BASE_URL = "https://www.virustotal.com/api/v3"
MODE = Literal["auto", "manual"]

_MIN_INTERVAL = 60 / VT_RATE_LIMIT_PER_MIN  # 분당 4회 → 15초 간격
_last_call_time: float = 0.0


# ─────────────────────────────────────────────────
# 할당량 관리
# ─────────────────────────────────────────────────

def _get_quota(today: date) -> dict:
    """오늘 사용량 조회. 없으면 0으로 초기화."""
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT auto_used, manual_used FROM vt_quota WHERE date = %s",
            (today,),
        )
        row = cur.fetchone()
        if row is None:
            cur.execute(
                "INSERT INTO vt_quota (date, auto_used, manual_used) VALUES (%s, 0, 0)",
                (today,),
            )
            return {"auto_used": 0, "manual_used": 0}
        return row


def _increment_quota(today: date, mode: MODE) -> None:
    """사용량 1 증가."""
    col = "auto_used" if mode == "auto" else "manual_used"
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            f"UPDATE vt_quota SET {col} = {col} + 1 WHERE date = %s",
            (today,),
        )


def can_call(mode: MODE) -> tuple[bool, str]:
    """호출 가능 여부 확인.

    Returns:
        (가능 여부, 불가 시 이유)
    """
    today = date.today()
    quota = _get_quota(today)

    if mode == "auto":
        if quota["auto_used"] >= VT_DAILY_AUTO_LIMIT:
            return False, f"자동 할당량 소진 ({VT_DAILY_AUTO_LIMIT}회/일)"
    else:
        if quota["manual_used"] >= VT_DAILY_MANUAL_LIMIT:
            return False, f"수동 할당량 소진 ({VT_DAILY_MANUAL_LIMIT}회/일)"

    return True, ""


# ─────────────────────────────────────────────────
# API 호출
# ─────────────────────────────────────────────────

def _rate_limited_get(endpoint: str) -> dict:
    """분당 4회 제한을 지키며 GET 요청."""
    global _last_call_time

    elapsed = time.time() - _last_call_time
    if elapsed < _MIN_INTERVAL:
        time.sleep(_MIN_INTERVAL - elapsed)

    headers = {"x-apikey": VT_API_KEY}
    response = requests.get(
        f"{VT_BASE_URL}{endpoint}",
        headers=headers,
        timeout=10,
    )
    _last_call_time = time.time()
    response.raise_for_status()
    return response.json()


def _call_url(url: str) -> dict:
    """URL 단건 VT 조회."""
    url_id = base64.urlsafe_b64encode(url.encode()).decode().rstrip("=")
    return _rate_limited_get(f"/urls/{url_id}")


def _call_domain(domain: str) -> dict:
    """도메인 단건 VT 조회."""
    return _rate_limited_get(f"/domains/{domain}")


# ─────────────────────────────────────────────────
# 요약 (한글화)
# ─────────────────────────────────────────────────

def summarize_report(raw: dict) -> dict:
    """VT 원본 응답 → 한글 요약본.

    Detections 탭 기준:
    - 위험 점수 (악성 탐지 수 / 전체 엔진 수)
    - 위험 등급
    - 최초 등록 / 마지막 업데이트
    - 탐지 엔진 목록 (악성 판정만)
    """
    try:
        attrs = raw["data"]["attributes"]
    except KeyError:
        return {"오류": "응답 형식이 올바르지 않습니다."}

    # 점수
    stats = attrs.get("last_analysis_stats", {})
    malicious = stats.get("malicious", 0)
    total = sum(stats.values())

    # 위험 등급
    if malicious >= 10:
        risk = "매우 위험"
    elif malicious >= 5:
        risk = "위험"
    elif malicious >= 1:
        risk = "의심"
    else:
        risk = "정상"

    # 탐지 엔진 목록 (악성/의심만)
    engines = attrs.get("last_analysis_results", {})
    detected = [
        {
            "엔진": engine,
            "판정": _translate_verdict(info.get("category", "")),
        }
        for engine, info in engines.items()
        if info.get("category") in ("malicious", "suspicious")
    ]

    return {
        "위험점수":      f"{malicious} / {total}",
        "위험등급":      risk,
        "최초등록":      _format_timestamp(attrs.get("creation_date")),
        "마지막업데이트": _format_timestamp(attrs.get("last_modification_date")),
        "탐지엔진수":    f"{malicious}개 엔진에서 악성 탐지",
        "탐지엔진":      detected,
        "원본응답":      raw,
    }


def _translate_verdict(category: str) -> str:
    """VT 판정 영어 → 한글."""
    return {
        "malicious":  "악성",
        "suspicious": "의심",
        "harmless":   "정상",
        "undetected": "미탐지",
        "timeout":    "시간초과",
    }.get(category, category)


def _format_timestamp(ts: int | None) -> str:
    """Unix timestamp → 읽기 쉬운 날짜 문자열."""
    if ts is None:
        return "정보 없음"
    dt = datetime.fromtimestamp(ts, tz=timezone.utc)
    return dt.strftime("%Y-%m-%d %H:%M UTC")


# ─────────────────────────────────────────────────
# S3 저장
# ─────────────────────────────────────────────────

def _save_to_s3(
    pattern_value: str,
    raw: dict,
    summary: dict,
    mode: MODE,
) -> str:
    record = {
        "pattern_value": pattern_value,
        "summary":       summary,
        "checked_at":    datetime.now(timezone.utc).isoformat(),
    }
    return append_vt(mode, [record])

def process_vt_result(
    pattern_type: str,
    pattern_value: str,
    mode: MODE = "manual",
    blacklist_id: int | None = None,
) -> dict | None:
    """VT 조회 → 요약 → S3 저장 → MySQL 갱신 통합 프로세스.

    Args:
        pattern_type:  'url' | 'domain'
        pattern_value: 검사할 URL 또는 도메인
        mode:          'auto' (스케줄러) | 'manual' (사용자 요청)
        blacklist_id:  blacklist 테이블 PK (없으면 MySQL 갱신 생략)

    Returns:
        한글 요약본 dict, 할당량 초과 또는 오류 시 None
    """
    # 1) 할당량 확인
    ok, reason = can_call(mode)
    if not ok:
        print(f"[VT] 호출 불가: {reason}")
        return None

    # 2) API 호출
    try:
        if pattern_type == "url":
            raw = _call_url(pattern_value)
        else:
            raw = _call_domain(pattern_value)
    except requests.HTTPError as e:
        print(f"[VT] API 오류: {e}")
        return None

    _increment_quota(date.today(), mode)

    # 3) 요약
    summary = summarize_report(raw)

    # 4) S3 저장
    s3_path = _save_to_s3(pattern_value, raw, summary, mode)
    summary["s3_path"] = s3_path

    # 5) MySQL 갱신 (blacklist 항목일 때만)
    if blacklist_id is not None:
        score_str = summary["위험점수"].split(" / ")
        update_blacklist_vt(
            blacklist_id=blacklist_id,
            vt_score=int(score_str[0]),
            vt_total=int(score_str[1]),
            vt_risk=summary["위험등급"],
            vt_report_path=s3_path,
        )

    return summary