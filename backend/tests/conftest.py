#  테스트 전반에 공유되는 설정과 Fixture(준비물)를 넣는 곳
import pytest
from fastapi.testclient import TestClient

from ..src.backend.main import app  # 실제 FastAPI 인스턴스 위치


# 1. 테스트용 클라이언트 Fixture
# def test_read_root(client): 로 바로 주입 가능
@pytest.fixture
def client():
    """FastAPI 테스트 클라이언트를 반환합니다."""
    with TestClient(app) as c:
        yield c


# 2. 테스트 환경 변수 설정 (필요 시)
@pytest.fixture(scope="session", autouse=True)
def setup_test_env():
    """테스트 시작 전 환경 변수 등을 세팅합니다."""
    import os

    os.environ["DATABASE_URL"] = "sqlite:///:memory:"  # 예시
    yield
