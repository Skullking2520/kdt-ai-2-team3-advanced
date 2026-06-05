"""VirusTotal 연동 테스트.

실행:
uv run python test_virustotal.py



테스트 항목:
    1) 할당량 확인 (can_call)
    2) 도메인 조회 + 요약 (process_vt_result)
    3) S3 저장 확인
    4) MySQL blacklist 갱신 확인
"""

import pprint
from pipeline.virustotal_io import can_call, process_vt_result
from pipeline.mysql_io import get_conn
from pipeline.s3_io import get_jsonl
from pipeline.config import S3_BUCKET

# 테스트용 도메인 (알려진 악성 도메인)
TEST_DOMAIN = "063501.com"


def test_can_call() -> None:
    """1) 할당량 확인."""
    print("\n" + "=" * 50)
    print("[Test 1] 할당량 확인")
    print("=" * 50)

    ok_auto, reason_auto = can_call("auto")
    ok_manual, reason_manual = can_call("manual")

    print(f"  자동   호출 가능: {ok_auto}   {reason_auto or ''}")
    print(f"  수동   호출 가능: {ok_manual}  {reason_manual or ''}")

    assert ok_auto or reason_auto, "can_call auto 응답 없음"
    assert ok_manual or reason_manual, "can_call manual 응답 없음"
    print("  [OK] 할당량 확인 통과")


def test_process_vt_result() -> dict:
    """2) 도메인 조회 + 요약."""
    print("\n" + "=" * 50)
    print(f"[Test 2] 도메인 조회: {TEST_DOMAIN}")
    print("=" * 50)

    summary = process_vt_result(
        pattern_type="domain",
        pattern_value=TEST_DOMAIN,
        mode="manual",
        blacklist_id=3,   # None 이면 blacklist DB 갱신 없이 조회만
    )

    assert summary is not None, "VT 조회 실패 (할당량 초과 또는 API 오류)"

    print(f"  위험점수     : {summary['위험점수']}")
    print(f"  위험등급     : {summary['위험등급']}")
    print(f"  최초등록     : {summary['최초등록']}")
    print(f"  마지막업데이트: {summary['마지막업데이트']}")
    print(f"  탐지엔진수   : {summary['탐지엔진수']}")
    print(f"  S3 경로      : {summary['s3_path']}")
    print(f"\n  탐지 엔진 목록:")
    for engine in summary["탐지엔진"]:
        print(f"    - {engine['엔진']}: {engine['판정']}")

    print("  [OK] 도메인 조회 통과")
    return summary


def test_s3_saved(summary: dict) -> None:
    """3) S3 저장 확인."""
    print("\n" + "=" * 50)
    print("[Test 3] S3 저장 확인")
    print("=" * 50)

    s3_path = summary.get("s3_path", "")
    assert s3_path, "S3 경로 없음"

    key = s3_path.replace(f"s3://{S3_BUCKET}/", "")
    records = get_jsonl(key)

    assert len(records) > 0, "S3 파일이 비어있음"
    assert records[0]["pattern_value"] == TEST_DOMAIN, "도메인 불일치"

    print(f"  경로    : {s3_path}")
    print(f"  레코드  : {len(records)}건")
    print(f"  도메인  : {records[0]['pattern_value']} ✓")
    print("  [OK] S3 저장 확인 통과")


def test_quota_incremented() -> None:
    """4) 할당량 카운트 증가 확인."""
    print("\n" + "=" * 50)
    print("[Test 4] 할당량 카운트 확인")
    print("=" * 50)

    from datetime import date
    today = date.today()

    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT auto_used, manual_used FROM vt_quota WHERE date = %s",
            (today,),
        )
        row = cur.fetchone()

    assert row is not None, "vt_quota 테이블에 오늘 행 없음"
    print(f"  자동 사용량  : {row['auto_used']}")
    print(f"  수동 사용량  : {row['manual_used']}")
    assert row["manual_used"] >= 1, "수동 호출 카운트 증가 안 됨"
    print("  [OK] 할당량 카운트 확인 통과")


def main() -> None:
    print("=" * 50)
    print("VirusTotal 연동 테스트")
    print("=" * 50)

    test_can_call()
    summary = test_process_vt_result()
    test_s3_saved(summary)
    test_quota_incremented()

    print("\n" + "=" * 50)
    print("[OK] 전체 테스트 통과")
    print("=" * 50)


if __name__ == "__main__":
    main()
