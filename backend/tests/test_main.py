"""backend 서비스의 메인 라우트 및 기본 엔드포인트 동작을 테스트하는 모듈입니다.

FastAPI의 기본 루트(/) 엔드포인트 호출 시 정상적으로 응답을 반환하는지 확인합니다.
"""


def test_read_root(client):
    """FastAPI 루트 경로('/')에 GET 요청을 보냈을 때 올바른 메시지와 응답 상태를 반환하는지 테스트합니다.

    Args:
        client (TestClient): backend/tests/conftest.py에서 정의된 테스트용 클라이언트 픽스처.
    """
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Hello!"}
