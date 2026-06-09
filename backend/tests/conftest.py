from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

from ..src.backend import main as backend_main


@pytest.fixture
def client(monkeypatch):
    """DB 접속 없이 FastAPI 라우트를 테스트한다."""
    monkeypatch.setattr(
        backend_main,
        "create_db_tables",
        AsyncMock(),
    )
    with TestClient(backend_main.app) as c:
        yield c
