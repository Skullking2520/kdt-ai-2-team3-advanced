# tests/test_main.py
from fastapi.testclient import TestClient

from ..src.backend.main import app  # src 폴더부터 시작하는 경로 사용

# backend폴더에서 uv run pytest 가정한 import

client = TestClient(app)


def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Hello from uv monorepo!"}


def test_read_item():
    response = client.get("/items/42")
    assert response.status_code == 200
    assert response.json() == {"item_id": 42}
