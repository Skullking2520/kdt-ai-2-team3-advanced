"""backend 서비스의 테스트 환경을 설정하기 위한 Pytest conftest 파일입니다.

이 모듈은 FastAPI 애플리케이션의 테스트용 HTTP 클라이언트를 설정하고,
테스트 세션 전반에 걸쳐 사용되는 임시 데이터베이스 환경 변수 등 공통 설정들을 정의합니다.
"""

import pytest
from fastapi.testclient import TestClient

from ..src.backend.main import app


@pytest.fixture
def client():
    """FastAPI 애플리케이션 엔드포인트 테스트를 위한 HTTP 클라이언트 픽스처입니다.

    FastAPI TestClient 컨텍스트 내에서 테스트를 실행할 수 있도록 보장합니다.

    Yields:
        TestClient: FastAPI 라우트를 테스트할 수 있는 클라이언트 인스턴스.
    """
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="session", autouse=True)
def setup_test_env():
    """테스트 실행 세션이 시작될 때 환경 변수를 모의 설정하는 자동 적용(autouse) 픽스처입니다.

    이 픽스처는 로컬 데이터베이스 또는 프로덕션 데이터베이스를 침범하지 않도록
    테스트용 SQLite 인메모리 데이터베이스 URL 등으로 환경 변수를 교체합니다.

    Yields:
        None
    """
    import os

    os.environ["DATABASE_URL"] = "sqlite:///:memory:"  # 테스트용 임시 메모리 DB 설정 예시
    yield
