"""배치 저장 테스트.

140건 가짜 데이터를 넣어 100건 단위로 파일이 분리되는지 확인.

실행:
    uv run python -m tests.test_batch
"""

from pipeline.s3_io import append_pipeline, get_jsonl
from pipeline.config import S3_BUCKET

TOTAL_RECORDS = 140


def make_fake_record(i: int) -> dict:
    """가짜 SMS 레코드 생성."""
    return {
        "id": f"test-batch-{i:04d}",
        "text": f"테스트 메시지 {i}번",
        "source": "batch_test",
        "index": i,
    }


def test_batch_split() -> None:
    """140건 넣었을 때 파일이 2개로 분리되는지 확인."""
    print("\n" + "=" * 50)
    print(f"[Test] 배치 저장 테스트 ({TOTAL_RECORDS}건)")
    print("=" * 50)

    saved_paths = set()

    for i in range(1, TOTAL_RECORDS + 1):
        record = make_fake_record(i)
        path = append_pipeline("raw", [record])
        saved_paths.add(path)
        if i % 20 == 0:
            print(f"  {i}건 저장 완료 → {path.split('/')[-1]}")

    print(f"\n  생성된 파일 수: {len(saved_paths)}개")
    for path in sorted(saved_paths):
        print(f"  - {path}")

    # 파일이 2개여야 함 (100건 + 40건)
    assert len(saved_paths) == 2, \
        f"파일 수 기대 2개, 실제 {len(saved_paths)}개"

    print("\n[OK] 파일 2개로 분리 확인")


def test_batch_count() -> None:
    """각 파일의 건수 확인."""
    print("\n" + "=" * 50)
    print("[Test] 각 파일 건수 확인")
    print("=" * 50)

    from datetime import datetime
    now = datetime.now()
    prefix = f"raw/{now.year:04d}/{now.month:02d}/{now.day:02d}/"

    import boto3
    from pipeline.config import S3_REGION
    client = boto3.client("s3", region_name=S3_REGION)
    response = client.list_objects_v2(Bucket=S3_BUCKET, Prefix=prefix)
    objects = response.get("Contents", [])

    # 테스트 배치 파일만 필터
    batch_files = sorted(
        o["Key"] for o in objects
        if "batch_" in o["Key"]
    )

    total = 0
    for key in batch_files:
        records = get_jsonl(key)
        # 테스트 데이터만 카운트
        test_records = [r for r in records if r.get("source") == "batch_test"]
        total += len(test_records)
        print(f"  {key.split('/')[-1]}: {len(test_records)}건")

    assert total == TOTAL_RECORDS, \
        f"총 건수 기대 {TOTAL_RECORDS}건, 실제 {total}건"

    print(f"\n  총 {total}건 확인")
    print("[OK] 건수 확인 통과")


def main() -> None:
    print("=" * 50)
    print("배치 저장 테스트")
    print("=" * 50)

    test_batch_split()
    test_batch_count()

    print("\n" + "=" * 50)
    print("[OK] 전체 배치 테스트 통과")
    print("=" * 50)


if __name__ == "__main__":
    main()
