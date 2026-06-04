"""APScheduler 기반 VirusTotal 자동 조회 스케줄러.

매일 새벽 2시에 MySQL blacklist에서 URL/도메인을 가져와
VirusTotal API로 조회하고 결과를 S3 + MySQL에 저장한다.

실행:
    uv run python pipeline/scheduler.py
"""

import json
import logging
from datetime import datetime
from zoneinfo import ZoneInfo

from apscheduler.schedulers.blocking import BlockingScheduler

from .config import S3_BUCKET
from .mysql_io import get_conn, update_blacklist_vt
from .s3_io import put_jsonl, make_batch_key
from .virustotal_io import check_domain, check_url, summarize_report, can_call

KST = ZoneInfo("Asia/Seoul")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)


# ─────────────────────────────────────────────────
# 블랙리스트 조회
# ─────────────────────────────────────────────────

def fetch_blacklist_targets() -> list[dict]:
    """MySQL blacklist에서 VT 조회 대상 가져오기.

    vt_last_checked가 NULL이거나 7일 이상 지난 항목만 대상.
    """
    sql = """
        SELECT id, pattern_type, pattern_value
        FROM blacklist
        WHERE is_active = TRUE
          AND pattern_type IN ('url', 'domain')
          AND (
              vt_last_checked IS NULL
              OR vt_last_checked < NOW() - INTERVAL 7 DAY
          )
        ORDER BY vt_last_checked ASC
        LIMIT 400
    """
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(sql)
        return cur.fetchall()


# ─────────────────────────────────────────────────
# 단건 처리
# ─────────────────────────────────────────────────

def process_one(target: dict, batch_records: list) -> None:
    """블랙리스트 항목 1건 VT 조회 + 결과 저장."""
    pattern_type = target["pattern_type"]
    pattern_value = target["pattern_value"]
    blacklist_id = target["id"]

    log.info(f"[VT] 조회 중: {pattern_type} / {pattern_value}")

    # VT API 호출
    if pattern_type == "url":
        raw = check_url(pattern_value, mode="auto")
    else:
        raw = check_domain(pattern_value, mode="auto")

    if raw is None:
        log.warning(f"[VT] 할당량 초과 또는 호출 실패: {pattern_value}")
        return

    # 요약본 생성
    summary = summarize_report(raw)

    # MySQL blacklist 갱신
    update_blacklist_vt(
        blacklist_id=blacklist_id,
        vt_score=int(summary["위험점수"].split(" / ")[0]),
        vt_total=int(summary["위험점수"].split(" / ")[1]),
        vt_risk=summary["위험등급"],
    )

    # 배치 레코드에 추가 (S3 저장용)
    batch_records.append({
        "blacklist_id": blacklist_id,
        "pattern_type": pattern_type,
        "pattern_value": pattern_value,
        "summary": summary,
        "checked_at": datetime.now(KST).isoformat(),
    })

    log.info(f"[VT] 완료: {pattern_value} → {summary['위험등급']} ({summary['위험점수']})")


# ─────────────────────────────────────────────────
# 스케줄러 작업
# ─────────────────────────────────────────────────

def job_vt_auto_scan() -> None:
    """매일 새벽 2시 실행되는 자동 VT 스캔 작업."""
    log.info("=" * 50)
    log.info("[Scheduler] VT 자동 스캔 시작")
    log.info("=" * 50)

    # 할당량 확인
    ok, reason = can_call("auto")
    if not ok:
        log.warning(f"[Scheduler] 오늘 자동 할당량 소진: {reason}")
        return

    targets = fetch_blacklist_targets()
    log.info(f"[Scheduler] 조회 대상: {len(targets)}건")

    if not targets:
        log.info("[Scheduler] 조회할 항목 없음. 종료.")
        return

    batch_records = []
    success = 0
    fail = 0

    for target in targets:
        # 할당량 재확인 (중간에 소진될 수 있음)
        ok, reason = can_call("auto")
        if not ok:
            log.warning(f"[Scheduler] 할당량 소진으로 중단: {reason}")
            break

        try:
            process_one(target, batch_records)
            success += 1
        except Exception as e:
            log.error(f"[Scheduler] 오류: {target['pattern_value']} → {e}")
            fail += 1

    # S3 배치 저장
    if batch_records:
        batch_id = datetime.now(KST).strftime("%Y%m%d_%H%M%S")
        key = f"analytics/virustotal/{datetime.now(KST).year:04d}/{datetime.now(KST).month:02d}/{datetime.now(KST).day:02d}/batch_{batch_id}.jsonl"
        put_jsonl(key, batch_records)
        log.info(f"[Scheduler] S3 저장 완료: s3://{S3_BUCKET}/{key}")

    log.info(f"[Scheduler] 완료 — 성공: {success}건 / 실패: {fail}건")


# ─────────────────────────────────────────────────
# 메인
# ─────────────────────────────────────────────────

def main() -> None:
    scheduler = BlockingScheduler(timezone=KST)

    # 매일 새벽 2시 실행
    scheduler.add_job(
        job_vt_auto_scan,
        trigger="cron",
        hour=2,
        minute=0,
        id="vt_auto_scan",
        name="VirusTotal 자동 스캔",
        max_instances=1,           # 중복 실행 방지
        misfire_grace_time=3600,   # 1시간 내 재실행 허용
    )

    log.info("[Scheduler] 시작 — 매일 02:00 KST에 VT 자동 스캔 실행")
    log.info("[Scheduler] 종료: Ctrl+C")

    try:
        scheduler.start()
    except KeyboardInterrupt:
        log.info("[Scheduler] 종료")


if __name__ == "__main__":
    main()
