"""APScheduler 기반 자동 스케줄러.

스케줄:
    - 매일 00:00 KST : OpenPhish + URLhaus 크롤링 → blacklist 저장
    - 매일 00:30 KST : S3 manual_input/ 감시 → blacklist 저장
    - 매일 02:00 KST : blacklist URL VirusTotal 자동 스캔

수동 URL 입력 방법:
    1) CLI: uv run python -c "from pipeline.crawler import insert_from_file; insert_from_file('urls.txt')"
    2) S3:  s3://smishing-dev-newbies-2026/manual_input/urls_YYYYMMDD.txt 업로드
            → 00:30 스케줄러가 자동 감지 후 처리

실행:
    uv run python -m pipeline.scheduler
"""

import logging
import os
import tempfile
import time
from datetime import datetime
from zoneinfo import ZoneInfo

import boto3
from apscheduler.schedulers.blocking import BlockingScheduler

from .config import S3_BUCKET, S3_REGION
from .crawler import insert_from_file, run_all_crawlers
from .mysql_io import get_conn, update_blacklist_vt
from .s3_io import append_vt
from .virustotal_io import can_call, check_domain, check_url, summarize_report

KST = ZoneInfo("Asia/Seoul")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)

S3_MANUAL_INPUT_PREFIX = "manual_input/"
S3_MANUAL_PROCESSED_PREFIX = "manual_input/processed/"


# ─────────────────────────────────────────────────
# 블랙리스트 조회
# ─────────────────────────────────────────────────

def fetch_blacklist_targets() -> list[dict]:
    """MySQL blacklist에서 VT 미처리 항목 가져오기 (최대 400건)."""
    sql = """
        SELECT id, pattern_type, pattern_value
        FROM blacklist
        WHERE is_active = TRUE
          AND pattern_type IN ('url', 'domain')
          AND vt_last_checked IS NULL
        ORDER BY created_at ASC
        LIMIT 400
    """
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(sql)
        return cur.fetchall()


# ─────────────────────────────────────────────────
# 단건 VT 처리
# ─────────────────────────────────────────────────

def process_one(target: dict) -> bool:
    """블랙리스트 항목 1건 VT 조회 → MySQL 갱신 → S3 즉시 append.

    Returns:
        True: 성공, False: 호출 실패 (재시도 가능)
    """
    pattern_type = target["pattern_type"]
    pattern_value = target["pattern_value"]
    blacklist_id = target["id"]

    log.info(f"[VT] 조회 중: {pattern_type} / {pattern_value}")

    if pattern_type == "url":
        raw = check_url(pattern_value, mode="auto")
    else:
        raw = check_domain(pattern_value, mode="auto")

    if raw is None:
        log.warning(f"[VT] 할당량 초과 또는 호출 실패: {pattern_value}")
        return False

    summary = summarize_report(raw)

    # S3 먼저 append — summary(한글)와 raw 분리 저장
    record = {
        "blacklist_id": blacklist_id,
        "pattern_type": pattern_type,
        "pattern_value": pattern_value,
        "summary": summary,
        "raw": raw,
        "checked_at": datetime.now(KST).isoformat(),
    }
    s3_path = None
    try:
        s3_path = append_vt("auto", [record])
    except Exception as e:
        log.error(f"[VT] S3 append 실패 ({pattern_value}): {e}")

    update_blacklist_vt(
        blacklist_id=blacklist_id,
        vt_score=int(summary["위험점수"].split(" / ")[0]),
        vt_total=int(summary["위험점수"].split(" / ")[1]),
        vt_risk=summary["위험등급"],
        vt_report_path=s3_path,
    )

    log.info(f"[VT] 완료: {pattern_value} → {summary['위험등급']} ({summary['위험점수']})")
    return True


# ─────────────────────────────────────────────────
# Job 1: URL 크롤링 (00:00)
# ─────────────────────────────────────────────────

def job_crawl_blacklist() -> None:
    """매일 자정: OpenPhish + URLhaus 크롤링 → blacklist 저장."""
    log.info("=" * 50)
    log.info("[Scheduler] URL 크롤링 시작")
    log.info("=" * 50)

    try:
        result = run_all_crawlers()
    except Exception as e:
        log.error(f"[Scheduler] 크롤링 전체 실패 (run_all_crawlers): {e}")
        return

    # crawl_openphish/crawl_urlhaus 실패 시 해당 key가 result에 없음 (빈 리스트 반환 후 skip)
    for source in ("openphish", "urlhaus"):
        stats = result.get(source)
        if stats is None:
            log.warning(f"[Scheduler] {source} → 수집 결과 없음 (크롤링 실패 또는 0건)")
        else:
            log.info(
                f"[Scheduler] {source} → "
                f"수집 {stats['collected']}건 / "
                f"신규 {stats['inserted']}건 / "
                f"중복 {stats['skipped']}건"
            )


# ─────────────────────────────────────────────────
# Job 2: S3 수동 입력 감시 (00:30)
# ─────────────────────────────────────────────────

def job_process_s3_manual() -> None:
    """매일 00:30: S3 manual_input/ 폴더 감시 → blacklist INSERT → processed/ 이동."""
    log.info("=" * 50)
    log.info("[Scheduler] S3 수동 입력 처리 시작")
    log.info("=" * 50)

    try:
        client = boto3.client("s3", region_name=S3_REGION)
        response = client.list_objects_v2(
            Bucket=S3_BUCKET,
            Prefix=S3_MANUAL_INPUT_PREFIX,
        )
        objects = response.get("Contents", [])

        # processed/ 폴더 제외, .txt 파일만
        files = [
            o["Key"] for o in objects
            if not o["Key"].startswith(S3_MANUAL_PROCESSED_PREFIX)
            and o["Key"].endswith(".txt")
        ]

        if not files:
            log.info("[Scheduler] 처리할 수동 입력 파일 없음")
            return

        success_files = 0
        fail_files = 0
        for key in files:
            log.info(f"[Scheduler] 처리 중: {key}")
            tmp_path = None
            try:
                # S3 다운로드
                obj = client.get_object(Bucket=S3_BUCKET, Key=key)
                content = obj["Body"].read().decode("utf-8")

                # 임시 파일 → DB INSERT
                with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False) as f:
                    f.write(content)
                    tmp_path = f.name

                ins, skip = insert_from_file(tmp_path)
                log.info(f"[Scheduler] {key} → 신규 {ins}건 / 중복 {skip}건")

                # INSERT 성공 시에만 processed/ 이동
                filename = key.split("/")[-1]
                processed_key = f"{S3_MANUAL_PROCESSED_PREFIX}{filename}"
                client.copy_object(
                    Bucket=S3_BUCKET,
                    CopySource={"Bucket": S3_BUCKET, "Key": key},
                    Key=processed_key,
                )
                client.delete_object(Bucket=S3_BUCKET, Key=key)
                log.info(f"[Scheduler] 처리 완료: {key} → {processed_key}")
                success_files += 1

            except Exception as e:
                log.error(f"[Scheduler] 파일 처리 실패 ({key}): {e} — 다음 파일 계속")
                fail_files += 1
            finally:
                if tmp_path and os.path.exists(tmp_path):
                    os.unlink(tmp_path)

        log.info(f"[Scheduler] S3 수동 입력 완료 — 성공: {success_files}건 / 실패: {fail_files}건")

    except Exception as e:
        log.error(f"[Scheduler] S3 수동 입력 처리 실패 (S3 연결/목록 조회): {e}")


# ─────────────────────────────────────────────────
# Job 3: VT 자동 스캔 (02:00)
# ─────────────────────────────────────────────────

_VT_MAX_RETRIES = 3
_VT_RETRY_DELAY = 30  # seconds


def job_vt_auto_scan() -> None:
    """매일 02:00: blacklist VT 미처리 항목 스캔 (최대 400건)."""
    log.info("=" * 50)
    log.info("[Scheduler] VT 자동 스캔 시작")
    log.info("=" * 50)

    ok, reason = can_call("auto")
    if not ok:
        log.warning(f"[Scheduler] 오늘 자동 할당량 소진: {reason}")
        return

    try:
        targets = fetch_blacklist_targets()
    except Exception as e:
        log.error(f"[Scheduler] blacklist 조회 실패 (MySQL): {e}")
        return

    log.info(f"[Scheduler] 조회 대상: {len(targets)}건")

    if not targets:
        log.info("[Scheduler] 조회할 항목 없음. 종료.")
        return

    success = 0
    fail = 0
    retry_queue: list[tuple[dict, int]] = []  # (target, attempt)

    for target in targets:
        ok, reason = can_call("auto")
        if not ok:
            log.warning(f"[Scheduler] 할당량 소진으로 중단: {reason}")
            break

        try:
            if process_one(target):
                success += 1
            else:
                retry_queue.append((target, 1))
        except Exception as e:
            log.error(f"[Scheduler] 오류: {target['pattern_value']} → {e}")
            retry_queue.append((target, 1))

    # 실패 항목 당일 재시도
    while retry_queue:
        target, attempt = retry_queue.pop(0)

        if attempt > _VT_MAX_RETRIES:
            log.warning(f"[Scheduler] 최대 재시도 초과 ({_VT_MAX_RETRIES}회): {target['pattern_value']}")
            fail += 1
            continue

        ok, reason = can_call("auto")
        if not ok:
            log.warning(f"[Scheduler] 재시도 중 할당량 소진: {reason}")
            fail += 1 + len(retry_queue)
            break

        log.info(f"[Scheduler] 재시도 {attempt}/{_VT_MAX_RETRIES}: {target['pattern_value']} ({_VT_RETRY_DELAY}초 대기)")
        time.sleep(_VT_RETRY_DELAY)

        try:
            if process_one(target):
                success += 1
            else:
                retry_queue.append((target, attempt + 1))
        except Exception as e:
            log.error(f"[Scheduler] 재시도 오류: {target['pattern_value']} → {e}")
            retry_queue.append((target, attempt + 1))

    log.info(f"[Scheduler] 완료 — 성공: {success}건 / 실패: {fail}건")


# ─────────────────────────────────────────────────
# 메인
# ─────────────────────────────────────────────────

def main() -> None:
    scheduler = BlockingScheduler(timezone=KST)

    scheduler.add_job(
        job_crawl_blacklist,
        trigger="cron",
        hour=0, minute=0,
        id="crawl_blacklist",
        name="URL 크롤링",
        max_instances=1,
        misfire_grace_time=3600,
    )

    scheduler.add_job(
        job_process_s3_manual,
        trigger="cron",
        hour=0, minute=30,
        id="process_s3_manual",
        name="S3 수동 입력 처리",
        max_instances=1,
        misfire_grace_time=3600,
    )

    scheduler.add_job(
        job_vt_auto_scan,
        trigger="cron",
        hour=2, minute=0,
        id="vt_auto_scan",
        name="VirusTotal 자동 스캔",
        max_instances=1,
        misfire_grace_time=3600,
    )

    log.info("[Scheduler] 시작")
    log.info("[Scheduler] 00:00 KST → URL 크롤링 (OpenPhish + URLhaus)")
    log.info("[Scheduler] 00:30 KST → S3 수동 입력 처리")
    log.info("[Scheduler] 02:00 KST → VT 자동 스캔 (최대 400건)")
    log.info("[Scheduler] 종료: Ctrl+C")

    try:
        scheduler.start()
    except KeyboardInterrupt:
        log.info("[Scheduler] 종료")


if __name__ == "__main__":
    main()