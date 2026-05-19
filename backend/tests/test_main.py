# tests/test_main.py
# from fastapi.testclient import TestClient
# from ..src.backend.main import app  # src 폴더부터 시작하는 경로 사용
# backend폴더에서 uv run pytest 가정한 import
# client = TestClient(app)


def test_read_root(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Hello!"}
