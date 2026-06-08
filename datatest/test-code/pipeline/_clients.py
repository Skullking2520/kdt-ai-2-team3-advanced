"""공유 클라이언트 싱글톤.

Logger와 s3_io 양쪽에서 사용하는 S3 클라이언트를 단일 지점에서 관리.
테스트 시 _s3_client를 직접 교체하거나 get_s3_client를 mock하면 양쪽 커버 가능.
"""

import boto3

from .config import S3_REGION

_s3_client = None


def get_s3_client():
    """싱글톤 S3 클라이언트."""
    global _s3_client
    if _s3_client is None:
        _s3_client = boto3.client("s3", region_name=S3_REGION)
    return _s3_client
