# tests/test_main.py
# from fastapi.testclient import TestClient
# from ..src.backend.main import app  # src 폴더부터 시작하는 경로 사용
# backend폴더에서 uv run pytest 가정한 import
# client = TestClient(app)


def test_read_root(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Hello!"}


def test_admin_url_candidates_requires_configured_key(
    client,
    monkeypatch,
):
    from backend.src.backend.core import security

    monkeypatch.setattr(security.settings, "ADMIN_API_KEY", None)

    response = client.get("/admin/url-candidates")

    assert response.status_code == 503


def test_admin_url_candidates_rejects_invalid_key(client, monkeypatch):
    from backend.src.backend.core import security

    monkeypatch.setattr(security.settings, "ADMIN_API_KEY", "expected")

    response = client.get(
        "/admin/url-candidates",
        headers={"X-Admin-API-Key": "wrong"},
    )

    assert response.status_code == 401
