"""AWS S3 접속 확인 스크립트.

`.env`에 AWS 자격증명 설정 후 실행.
"""

import io
import json
import os
from datetime import datetime

import boto3
from botocore.exceptions import ClientError
from dotenv import load_dotenv

load_dotenv()

BUCKET = os.getenv("S3_BUCKET", "smishing-dev-newbies-2026")
REGION = os.getenv("AWS_DEFAULT_REGION", "ap-northeast-2")


def main() -> None:
    print(f"1. S3 클라이언트 생성 (region={REGION})")
    s3 = boto3.client("s3", region_name=REGION)

    print(f"\n2. 버킷 확인: {BUCKET}")
    try:
        s3.head_bucket(Bucket=BUCKET)
        print(f"   버킷 접근 가능")
    except ClientError as e:
        print(f"   ERROR: 버킷 접근 실패 - {e}")
        return

    print(f"\n3. 기존 객체 목록 (최대 10건)")
    response = s3.list_objects_v2(Bucket=BUCKET, MaxKeys=10)
    objects = response.get("Contents", [])
    if not objects:
        print("   (비어있음)")
    else:
        for obj in objects:
            print(f"   - {obj['Key']} ({obj['Size']} bytes)")

    print(f"\n4. 테스트 JSONL 업로드")
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    test_key = f"raw/_test/test_{timestamp}.jsonl"

    sample_records = [
        {"id": "test-001", "text": "테스트 SMS 1", "source": "test"},
        {"id": "test-002", "text": "테스트 SMS 2", "source": "test"},
    ]

    buf = io.StringIO()
    for rec in sample_records:
        buf.write(json.dumps(rec, ensure_ascii=False))
        buf.write("\n")

    s3.put_object(
        Bucket=BUCKET,
        Key=test_key,
        Body=buf.getvalue().encode("utf-8"),
        ContentType="application/x-ndjson",
    )
    print(f"   업로드 완료: s3://{BUCKET}/{test_key}")

    print(f"\n5. 방금 업로드한 파일 다운로드")
    response = s3.get_object(Bucket=BUCKET, Key=test_key)
    body = response["Body"].read().decode("utf-8")
    print(f"   다운로드 내용:")
    for line in body.strip().split("\n"):
        print(f"     {line}")

    print(f"\n6. 테스트 파일 삭제")
    s3.delete_object(Bucket=BUCKET, Key=test_key)
    print(f"   삭제 완료: {test_key}")

    print(f"\n[OK] S3 연결 확인 완료.")


if __name__ == "__main__":
    main()