"""backend 서비스의 테스트 환경을 설정하기 위한 Pytest conftest 파일입니다.

이 모듈은 FastAPI 애플리케이션의 테스트용 HTTP 클라이언트를 설정하고,
테스트 중 실제 데이터베이스에 접속하지 않도록 애플리케이션 시작 시 수행되는
테이블 생성 작업을 모의 처리합니다.
"""

from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

from ..src.backend import main as backend_main


@pytest.fixture
def client(monkeypatch):
    """DB 접속 없이 FastAPI 라우트를 테스트하는 클라이언트를 반환합니다."""
    monkeypatch.setattr(
        backend_main,
        "create_db_tables",
        AsyncMock(),
    )
    monkeypatch.setattr(
        backend_main,
        "_warmup_ocr",
        AsyncMock(),
    )
    monkeypatch.setattr(
        backend_main,
        "_start_vt_worker",
        AsyncMock(),
    )
    with TestClient(backend_main.app) as c:
        yield c
