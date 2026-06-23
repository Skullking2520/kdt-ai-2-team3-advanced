"""ai_service의 API 라우트(health check, LangGraph invoke, VectorDB upsert/retrieve)를 테스트하는 모듈입니다.

이 모듈은 FastAPI TestClient를 활용하여 실제 HTTP 요청/응답 시나리오를 시뮬레이션하고,
외부 의존성(Ollama API 연결을 위한 urlopen, LangGraph 엔진, VectorDB)을 Mocking(또는 Stubbing)하여
각 API 엔드포인트의 통합 동작 및 예외 처리 로직을 검증합니다.
"""

import json

import pytest
from fastapi.testclient import TestClient

from ai_service.main import app


class FakeUrlOpenResponse:
    """urllib.request.urlopen 호출 시 반환되는 모의(Mock) 응답 클래스.

    health check API 내에서 Ollama 서비스 연결 상태를 확인하기 위해
    외부 URL로의 실제 네트워크 요청을 수행하지 않고 200 OK 응답을 흉내 냅니다.
    """

    status = 200

    def __enter__(self):
        """컨텍스트 매니저 진입 시 자기 자신을 반환합니다.

        Returns:
            FakeUrlOpenResponse: 모의 응답 객체 자체.
        """
        return self

    def __exit__(self, exc_type, exc, traceback):
        """컨텍스트 매니저 종료 시 예외를 전파하지 않고 정리 작업을 흉내 냅니다."""
        return False


class FakeGraphApp:
    """LangGraph 애플리케이션의 동작을 모방하는 모의(Mock) 클래스.

    테스트 대상 API가 LangGraph를 호출(invoke)할 때 발생하는 입력 상태의 전달 상태를 기록하고,
    미리 설정된 결과값(result)을 반환하거나 의도된 예외(exc)를 발생시킵니다.
    """

    def __init__(self, result=None, exc: Exception | None = None):
        """FakeGraphApp의 생성자 함수.

        Args:
            result (Any, optional): invoke 호출 시 반환할 결과 데이터 딕셔너리. Defaults to None.
            exc (Exception, optional): invoke 호출 시 의도적으로 발생시킬 예외 객체. Defaults to None.
        """
        self.result = result
        self.exc = exc
        self.received_state = None

    def invoke(self, state):
        """실제 LangGraph의 invoke 메소드를 모방하여 호출 정보를 기록하고 결과를 반환합니다.

        Args:
            state (dict): 그래프 실행 시작 시 전달받은 입력 상태(State).

        Raises:
            Exception: 초기화 시 전달된 exc 예외 객체가 존재할 경우 예외를 던집니다.

        Returns:
            dict: 설정된 결과(self.result) 데이터.
        """
        self.received_state = state
        if self.exc:
            raise self.exc
        return self.result


@pytest.fixture
def client() -> TestClient:
    """FastAPI 애플리케이션의 테스트 전용 HTTP 클라이언트를 생성하는 픽스처입니다.

    Returns:
        TestClient: FastAPI 엔드포인트를 호출할 수 있는 테스트용 클라이언트 객체.
    """
    return TestClient(app)
# pytest는 fixture 이름을 보고 client인자에 자동으로 주입합니다.
# monkeypatch: pytest 내장 fixture
# 각 함수 인자의 순서는 중요하지 않고, 이름이 일치하는 게 핵심이에요.

def test_health_returns_json_status(monkeypatch, client):
    """Health check 엔드포인트(/api/v1/health)가 올바른 JSON 상태와 정상 여부를 응답하는지 테스트합니다.

    urllib.request.urlopen을 모의(Mocking)하여 Ollama 서비스와의 상태 확인부가
    정상 동작하는 환경을 구축한 후 200 OK 및 기대했던 시스템 상태 명세들을 검증합니다.

    Args:
        monkeypatch (pytest.MonkeyPatch): 런타임 중 모듈 속성을 일시적으로 조작하기 위한 Pytest 빌트인 픽스처.
        client (TestClient): FastAPI 테스트 클라이언트 픽스처.
    """
    # Arrange
    from ai_service.api import routes

    monkeypatch.setattr(routes, "urlopen", lambda *args, **kwargs: FakeUrlOpenResponse())

    # Act
    response = client.get("/api/v1/health")
    body = response.json()

    # Assert
    assert response.status_code == 200
    assert body["status"] == "ok"
    assert body["ollama"]["ok"] is True
    assert "base_url" in body["ollama"]
    assert body["vectordb"]["provider"] in {"chroma", "pinecone"}
    assert body["vectordb"]["embedding_model"]


@pytest.mark.parametrize(
    ("route_override", "context"), # 매개변수 이름들을 정의
    [ # 각각의 튜플이 테스트 케이스 하나의 인자 값
        ("zero_day", "택배 사칭 악성 앱 설치 사례"),
        ("general", None),
    ], # 각각의 튜플이 테스트 케이스 하나의 인자 값
)
def test_graph_invoke_returns_parseable_json(monkeypatch, client, route_override, context):
    """LangGraph 호출 엔드포인트(/api/v1/graph/invoke)가 응답 메시지를 JSON 파싱하여 올바르게 반환하는지 테스트합니다.

    `route_override` 옵션의 유무에 따라 LangGraph 호출 시 분기 정보가 어떻게 전달되는지,
    그리고 반환된 문자열 결과가 내부적으로 어떻게 JSON 파싱되어 `parsed_output`에 반영되는지 검증합니다.

    Args:
        monkeypatch (pytest.MonkeyPatch): 런타임 속성 변경용 픽스처.
        client (TestClient): FastAPI 테스트 클라이언트 픽스처.
        route_override (str): 강제로 적용할 라우팅 모드 ("zero_day" 또는 "general").
        context (str | None): VectorDB RAG 등으로 조회된 사전 컨텍스트 내용.
    """
    # Arrange
    from ai_service.api import routes

    final_output = json.dumps(
        {"is_smishing": True, "reason": "의심스러운 링크를 포함합니다."},
        ensure_ascii=False,
    )
    fake_graph = FakeGraphApp(
        result={
            "final_output": final_output,
            "context": context,
        }
    )
    monkeypatch.setattr(routes, "langgraph_app", fake_graph)

    payload = {
        "text": "[택배] 배송 주소 오류 확인 http://fake.example",
        "ocr_text": "CJ대한통운 로고",
        "route_override": route_override,
    }

    # Act
    response = client.post("/api/v1/graph/invoke", json=payload)
    body = response.json()

    # Assert
    assert response.status_code == 200
    assert body["final_output"] == {
        "is_smishing": True,
        "reason": "의심스러운 링크를 포함합니다.",
    }
    assert body["parsed_output"] == {
        "is_smishing": True,
        "reason": "의심스러운 링크를 포함합니다.",
    }
    assert body["context"] == context
    assert body["route_override"] == route_override
    assert fake_graph.received_state is not None
    assert fake_graph.received_state["route_override"] == route_override
    assert "[OCR 추출 텍스트]" in fake_graph.received_state["messages"][0].content


def test_graph_invoke_falls_back_to_last_message_content(monkeypatch, client):
    """LangGraph의 최종 결과 상태에 `final_output` 키가 명시적으로 없는 경우,

    가장 마지막 AI 메시지의 텍스트 본문(content)을 폴백(Fallback) 수단으로 삼아
    결과를 파싱하는지 확인하는 테스트입니다.

    Args:
        monkeypatch (pytest.MonkeyPatch): 런타임 속성 변경용 픽스처.
        client (TestClient): FastAPI 테스트 클라이언트 픽스처.
    """
    # Arrange
    from langchain_core.messages import AIMessage

    from ai_service.api import routes

    final_output = '{"is_smishing": false, "reason": "정상 안내로 판단됩니다."}'
    fake_graph = FakeGraphApp(result={"messages": [AIMessage(content=final_output)]})
    monkeypatch.setattr(routes, "langgraph_app", fake_graph)

    # Act
    response = client.post("/api/v1/graph/invoke", json={"text": "정상 안내 문자"})
    body = response.json()

    # Assert
    assert response.status_code == 200
    assert body["final_output"] == {
        "is_smishing": False,
        "reason": "정상 안내로 판단됩니다.",
    }
    assert body["parsed_output"]["is_smishing"] is False
    assert body["parsed_output"]["reason"] == "정상 안내로 판단됩니다."


def test_graph_invoke_returns_500_when_graph_fails(monkeypatch, client):
    """LangGraph 실행 시 예외가 발생할 때, API 엔드포인트가 HTTP 500 에러와 적절한 실패 상세 메시지를 반환하는지 테스트합니다.

    Args:
        monkeypatch (pytest.MonkeyPatch): 런타임 속성 변경용 픽스처.
        client (TestClient): FastAPI 테스트 클라이언트 픽스처.
    """
    # Arrange
    from ai_service.api import routes

    monkeypatch.setattr(routes, "langgraph_app", FakeGraphApp(exc=RuntimeError("boom")))

    # Act
    response = client.post("/api/v1/graph/invoke", json={"text": "테스트 문자"})
    body = response.json()

    # Assert
    assert response.status_code == 500
    assert "LangGraph 실행 실패" in body["detail"]
    assert "boom" in body["detail"]


def test_vectordb_upsert_and_retrieve_use_chroma_fixture(monkeypatch, client, chroma_db):
    """VectorDB(Chroma)에 새로운 유해/스미싱 사례 문서를 업서트(Upsert)한 후 유사 데이터를 정상적으로 조회(Retrieve)할 수 있는지 확인합니다.

    실제 외부 데이터베이스를 호출하지 않고, conftest에 설정된 로컬 임시 Chroma DB 인스턴스를 주입받아 수행합니다.

    Args:
        monkeypatch (pytest.MonkeyPatch): 런타임 속성 변경용 픽스처.
        client (TestClient): FastAPI 테스트 클라이언트 픽스처.
        chroma_db (ChromaClient): conftest.py에서 준비된 임시 Chroma DB 클라이언트 객체.
    """
    # Arrange
    from ai_service.api import routes

    monkeypatch.setattr(routes, "get_vector_db", lambda: chroma_db)
    upsert_payload = {
        "documents": [
            "택배 배송 조회를 사칭해 악성 앱 설치 링크를 보내는 스미싱 사례",
            "공공기관 과태료 납부를 사칭한 링크 유도 사례",
        ],
        "metadatas": [
            {"source": "test", "category": "delivery"},
            {"source": "test", "category": "public"},
        ],
        "ids": ["delivery-case", "public-case"],
    }

    # Act
    upsert_response = client.post("/api/v1/vectordb/upsert", json=upsert_payload)
    retrieve_response = client.post(
        "/api/v1/vectordb/retrieve",
        json={"query": "택배 배송 링크", "k": 2},
    )
    retrieve_body = retrieve_response.json()

    # Assert
    assert upsert_response.status_code == 200
    assert upsert_response.json() == {"upserted": 2}
    assert retrieve_response.status_code == 200
    assert retrieve_body["query"] == "택배 배송 링크"
    assert len(retrieve_body["results"]) >= 1
    assert retrieve_body["results"][0]["page_content"]
    assert "metadata" in retrieve_body["results"][0]
    assert "score" in retrieve_body["results"][0]


@pytest.mark.parametrize(
    "payload",
    [
        {"documents": [], "metadatas": []},
        {"documents": ["문서"], "ids": ["one", "two"]},
    ],
)
def test_vectordb_upsert_validates_bad_requests(monkeypatch, client, chroma_db, payload):
    """VectorDB 업서트 시 잘못된 데이터 형식(빈 문서 리스트 혹은 리스트 길이 불일치 등)을 입력할 경우,

    FastAPI의 데이터 검증 시스템(Pydantic) 또는 서버 비즈니스 로직에 의해 422 또는 500에러를 반환하는지 테스트합니다.

    Args:
        monkeypatch (pytest.MonkeyPatch): 런타임 속성 변경용 픽스처.
        client (TestClient): FastAPI 테스트 클라이언트 픽스처.
        chroma_db (ChromaClient): conftest.py에서 준비된 임시 Chroma DB 클라이언트 객체.
        payload (dict): 잘못된 요청 페이로드 예시들.
    """
    # Arrange
    from ai_service.api import routes

    monkeypatch.setattr(routes, "get_vector_db", lambda: chroma_db)

    # Act
    response = client.post("/api/v1/vectordb/upsert", json=payload)
    body = response.json()

    # Assert
    assert response.status_code in {422, 500}
    assert "detail" in body

