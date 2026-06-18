"""스케줄러 통합 테스트.

실제 네트워크 호출 포함 (OpenPhish, URLhaus, VirusTotal).
각 Job을 직접 호출해서 전체 흐름 검증.

실행:
    uv run python -m tests.test_scheduler

저장 위치:
    [크롤링 결과]
    MySQL blacklist 테이블
    └── pattern_type: 'url'
    └── source: 'openphish' | 'urlhaus'
    └── vt_last_checked: NULL (VT 미처리 상태로 저장)

    [S3 수동 입력]
    s3://smishing-dev-newbies-2026/manual_input/test_urls.txt        ← 업로드
    s3://smishing-dev-newbies-2026/manual_input/processed/test_urls.txt ← 처리 후 이동

    [VT 스캔 결과]
    s3://smishing-dev-newbies-2026/analytics/virustotal/auto/YYYY/MM/DD/batch_NNN.jsonl
    MySQL blacklist 테이블
    └── vt_score, vt_total, vt_risk, vt_last_checked 갱신
"""

import boto3
import io
from datetime import date

from pipeline.scheduler import (
    job_crawl_blacklist,
    job_process_s3_manual,
    job_vt_auto_scan,
    fetch_blacklist_targets,
)
from pipeline.mysql_io import get_conn
from pipeline.s3_io import get_jsonl
from pipeline.config import S3_BUCKET, S3_REGION

# ─────────────────────────────────────────────────
# 테스트용 수동 URL (확실한 악성 도메인)
# ─────────────────────────────────────────────────
TEST_MANUAL_URLS = """http://063501.com
http://fake-delivery.kr
"""


def get_s3_client():
    return boto3.client("s3", region_name=S3_REGION)


# ─────────────────────────────────────────────────
# Test 1: 크롤링
# ─────────────────────────────────────────────────

def test_crawl() -> None:
    """OpenPhish + URLhaus 크롤링 → MySQL blacklist 저장 확인.

    저장: MySQL blacklist (source='openphish' | 'urlhaus')
    """
    print("\n" + "=" * 50)
    print("[Test 1] URL 크롤링")
    print("=" * 50)

    # 크롤링 전 건수
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) as cnt FROM blacklist")
        before = cur.fetchone()["cnt"]

    print(f"  크롤링 전 blacklist: {before}건")

    # 실제 크롤링 실행
    job_crawl_blacklist()

    # 크롤링 후 건수
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) as cnt FROM blacklist")
        after = cur.fetchone()["cnt"]

        # 소스별 확인
        cur.execute("""
            SELECT source, COUNT(*) as cnt
            FROM blacklist
            WHERE source IN ('openphish', 'urlhaus')
            GROUP BY source
        """)
        sources = cur.fetchall()

    print(f"  크롤링 후 blacklist: {after}건 (신규 {after - before}건)")
    for row in sources:
        print(f"  - {row['source']}: {row['cnt']}건")

    assert after >= before, "크롤링 후 건수가 줄어듦"
    print("  [OK] 크롤링 테스트 통과")


# ─────────────────────────────────────────────────
# Test 2: S3 수동 입력
# ─────────────────────────────────────────────────

def test_s3_manual() -> None:
    """S3 manual_input/ 에 파일 업로드 → 처리 → processed/ 이동 확인.

    업로드: s3://smishing-dev-newbies-2026/manual_input/test_urls.txt
    처리 후: s3://smishing-dev-newbies-2026/manual_input/processed/test_urls.txt
    MySQL blacklist (source='manual')
    """
    print("\n" + "=" * 50)
    print("[Test 2] S3 수동 입력 처리")
    print("=" * 50)

    client = get_s3_client()
    test_key = "manual_input/test_urls.txt"
    processed_key = "manual_input/processed/test_urls.txt"

    # 테스트 파일 S3 업로드
    client.put_object(
        Bucket=S3_BUCKET,
        Key=test_key,
        Body=TEST_MANUAL_URLS.encode("utf-8"),
    )
    print(f"  업로드: s3://{S3_BUCKET}/{test_key}")

    # 처리 전 blacklist 수동 입력 건수
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) as cnt FROM blacklist WHERE source = 'manual'")
        before = cur.fetchone()["cnt"]

    # S3 수동 입력 처리 실행
    job_process_s3_manual()

    # 처리 후 확인
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) as cnt FROM blacklist WHERE source = 'manual'")
        after = cur.fetchone()["cnt"]

    print(f"  수동 입력 blacklist: {before}건 → {after}건 (신규 {after - before}건)")

    # processed/ 로 이동됐는지 확인
    try:
        client.head_object(Bucket=S3_BUCKET, Key=processed_key)
        print(f"  처리 완료 이동: s3://{S3_BUCKET}/{processed_key} ✓")
    except Exception:
        assert False, "processed/ 로 이동 안 됨"

    # 원본 파일 삭제됐는지 확인
    try:
        client.head_object(Bucket=S3_BUCKET, Key=test_key)
        assert False, "원본 파일이 삭제 안 됨"
    except client.exceptions.ClientError:
        print(f"  원본 파일 삭제 확인 ✓")

    print("  [OK] S3 수동 입력 테스트 통과")


# ─────────────────────────────────────────────────
# Test 3: VT 스캔
# ─────────────────────────────────────────────────

def test_vt_scan() -> None:
    """VT 미처리 항목 스캔 → S3 저장 + MySQL 갱신 확인.

    저장:
        s3://smishing-dev-newbies-2026/analytics/virustotal/auto/YYYY/MM/DD/batch_NNN.jsonl
        MySQL blacklist.vt_score, vt_total, vt_risk, vt_last_checked 갱신
    """
    print("\n" + "=" * 50)
    print("[Test 3] VT 자동 스캔")
    print("=" * 50)

    # 스캔 전 미처리 건수
    targets_before = fetch_blacklist_targets()
    print(f"  VT 미처리 항목: {len(targets_before)}건")

    if not targets_before:
        print("  (미처리 항목 없음 — 크롤링 먼저 실행 필요)")
        return

    # 실제 VT 스캔 실행
    job_vt_auto_scan()

    # 스캔 후 확인
    targets_after = fetch_blacklist_targets()
    scanned = len(targets_before) - len(targets_after)
    print(f"  스캔 완료: {scanned}건")

    # MySQL 갱신 확인
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("""
            SELECT COUNT(*) as cnt
            FROM blacklist
            WHERE vt_last_checked IS NOT NULL
        """)
        vt_done = cur.fetchone()["cnt"]
    print(f"  VT 완료 항목: {vt_done}건")

    # S3 저장 확인
    from datetime import datetime
    from zoneinfo import ZoneInfo
    now = datetime.now(ZoneInfo("Asia/Seoul"))
    prefix = (
        f"analytics/virustotal/auto/"
        f"{now.year:04d}/{now.month:02d}/{now.day:02d}/"
    )
    client = get_s3_client()
    response = client.list_objects_v2(Bucket=S3_BUCKET, Prefix=prefix)
    files = response.get("Contents", [])

    assert len(files) > 0, "S3 VT 결과 파일 없음"
    latest_key = sorted(o["Key"] for o in files)[-1]
    records = get_jsonl(latest_key)

    print(f"  S3 저장 파일: {latest_key.split('/')[-1]} ({len(records)}건)")

    # 보고서 내용 확인
    sample = records[-1]
    print(f"\n  [샘플 보고서]")
    print(f"  도메인/URL  : {sample['pattern_value']}")
    print(f"  위험점수    : {sample['summary']['위험점수']}")
    print(f"  위험등급    : {sample['summary']['위험등급']}")
    print(f"  탐지엔진수  : {sample['summary']['탐지엔진수']}")

    assert vt_done > 0, "VT 스캔 완료 항목 없음"
    print("\n  [OK] VT 스캔 테스트 통과")


# ─────────────────────────────────────────────────
# vt_quota 확인
# ─────────────────────────────────────────────────

def test_quota() -> None:
    """VT 할당량 카운트 확인.

    저장: MySQL vt_quota (auto_used 증가)
    """
    print("\n" + "=" * 50)
    print("[Test 4] VT 할당량 확인")
    print("=" * 50)

    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("""
            SELECT auto_used, manual_used
            FROM vt_quota
            WHERE date = CURDATE()
        """)
        row = cur.fetchone()

    assert row is not None, "vt_quota 오늘 행 없음"
    print(f"  자동 사용량: {row['auto_used']} / 400회")
    print(f"  수동 사용량: {row['manual_used']} / 100회")
    print("  [OK] 할당량 확인 통과")


# ─────────────────────────────────────────────────
# 메인
# ─────────────────────────────────────────────────

def main() -> None:
    print("=" * 50)
    print("스케줄러 통합 테스트")
    print("=" * 50)
    print("\n주의: 실제 네트워크 호출 포함 (VT API 사용량 소모)")

    test_crawl()
    test_s3_manual()
    test_vt_scan()
    test_quota()

    print("\n" + "=" * 50)
    print("[OK] 전체 스케줄러 테스트 통과")
    print("=" * 50)


if __name__ == "__main__":
    main()