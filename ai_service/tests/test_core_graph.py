"""ai_service의 LangGraph 핵심 노드 및 유틸리티 함수의 동작을 단위 테스트하는 모듈입니다.

이 모듈은 LangGraph 노드(router_node, naive_rag_node, simple_reason_node), 조건부 엣지 함수(route_after_router),
그리고 문자열 포맷팅 및 JSON 가공 유틸리티(_normalize_json_output, _response_content_into_str, _try_parse_json, _build_user_content)가
요구 사양에 맞춰 입력값을 가공하고 다음 상태나 노드로 올바르게 전이하는지 검증합니다.
"""

import json

import pytest
from langchain_core.messages import AIMessage, HumanMessage

from ai_service.core.graph import route_after_router, SmishingGraphState 
from ai_service.core.nodes import naive_rag_node, router_node, simple_reason_node
from ai_service.utils.json_utils import (
    _normalize_json_output,
    _response_content_into_str,
    _try_parse_json,
)
from ai_service.utils.rag_content import _build_user_content


class FakeJsonLLM:
    """테스트를 위해 일관된 응답을 제공하는 모의(Mock) JSON LLM 클래스.

    실제 원격 LLM 서버(예: Ollama 등)를 연동하지 않고, 생성자에 지정된 고정 문자열
    결과를 리턴하도록 구현하여 빠른 테스트 속도와 일관된 테스트 결과를 유도합니다.
    """

    def __init__(self, response_content: str):
        """FakeJsonLLM 인스턴스를 생성하고 반환 값을 지정합니다.

        Args:
            response_content (str): invoke 호출 시 LLM 응답 메시지에 담아 보낼 고정 문자열 내용.
        """
        self.response_content = response_content
        self.received_prompt = None

    def invoke(self, prompt):
        """실제 LLM의 invoke 메소드를 모방하여 수신한 프롬프트를 기록하고 고정 메시지를 반환합니다.

        Args:
            prompt (Any): LLM 체인이나 프롬프트 템플릿에 의해 포맷팅되어 인입된 원본 입력값.

        Returns:
            AIMessage: 미리 정의된 response_content 본문을 갖는 LangChain AI 메시지 객체.
        """
        self.received_prompt = prompt
        return AIMessage(content=self.response_content)


@pytest.mark.parametrize(
    ("route_override", "expected_content", "expected_route"),
    [
        ("zero_day", "ZERODAY_SMISHING_PATTERN", "zero_day"),
        ("general", "GENERAL_SMISHING_REASON", "general"),
    ],
)
def test_router_node_route_override_controls_next_edge(
    route_override,
    expected_content,
    expected_route,
):
    """라우터 노드가 강제 분기(route_override) 설정값에 따라 메시지 본문을 조작하고 알맞은 다음 엣지 경로를 지정하는지 테스트합니다.

    Args:
        route_override (str): 상태에서 지정된 강제 라우팅 설정 ("zero_day" 또는 "general").
        expected_content (str): 라우터 실행 후 최종 메시지에 들어가야 할 예상 예약 지시어.
        expected_route (str): 조건부 엣지 함수(route_after_router)가 반환해야 하는 다음 경로명.
    """
    # Arrange
    state: SmishingGraphState = {
        "messages": [HumanMessage(content="배송 주소 오류 확인 요청")],
        "route_override": route_override,
    }

    # Act
    result = router_node(state)
    next_route = route_after_router({"messages": result["messages"]})

    # Assert
    assert result["messages"][0].content == expected_content
    assert next_route == expected_route


@pytest.mark.parametrize(
    ("message_content", "expected_route"),
    [
        ("ZERODAY_SMISHING_PATTERN", "zero_day"),
        ("GENERAL_SMISHING_REASON", "general"),
        ("모델이 애매하게 답변한 경우", "general"),
    ],
)
def test_route_after_router_maps_message_content(message_content, expected_route):
    """라우터 노드가 출력한 AI 메시지 내용에 따라 적절한 엣지 분기명(조건부 엣지)을 반환하는지 테스트합니다.

    Args:
        message_content (str): 라우터 결과로 저장된 AI 메시지 텍스트.
        expected_route (str): route_after_router 함수가 결과로 도출해야 할 최종 노드 ID.
    """
    # Arrange
    state: SmishingGraphState = {"messages": [AIMessage(content=message_content)]}

    # Act
    route = route_after_router(state)

    # Assert
    assert route == expected_route


@pytest.mark.parametrize(
    ("raw_content", "expected"),
    [
        (
            '분석 결과:\n{"is_smishing": True, "reason": "택배 사칭"}',
            {"is_smishing": True, "reason": "택배 사칭"},
        ),
        (
            '첫 후보 {"is_smishing": false, "reason": "정상"} 마지막 {"is_smishing": true, "reason": "링크 의심"}',
            {"is_smishing": True, "reason": "링크 의심"},
        ),
        (
            '{"is_smishing": false, "reason": "공식 발신"}',
            {"is_smishing": False, "reason": "공식 발신"},
        ),
        (
            'ZERODAY_SMISHING_PATTERN_ANALYSIS_RESULT\n{"is_smishing": true, "reason": "링크 의심"}',
            {"is_smishing": True, "reason": "링크 의심"},
        ),
        (
            '{"is_smishing": true, "reason": "문자 내용에서 "모바일 청첩장"이라는 사칭을 통해 링크 클릭을 유도합니다."}',
            {"is_smishing": True, "reason": "문자 내용에서 \"모바일 청첩장\"이라는 사칭을 통해 링크 클릭을 유도합니다."},
        ),
    ],
)
def test_normalize_json_output_extracts_parseable_json(raw_content, expected):
    """LLM이 반환한 잡음 섞인 문자열에서 가장 마지막에 위치한 유효한 JSON 블록을 추출 및 정규화하는지 테스트합니다.

    또한 `_try_parse_json` 유틸리티 함수가 이 정규화 과정을 거쳐 딕셔너리로 정상 파싱을 수행하는지 확인합니다.

    Args:
        raw_content (str): LLM이 반환하여 앞뒤로 텍스트나 노이즈가 섞인 원본 텍스트.
        expected (dict): 추출 후 최종 복원되어야 할 파이썬 딕셔너리 데이터.
    """
    # Arrange
    # Act
    normalized = _normalize_json_output(raw_content)
    parsed = json.loads(normalized)

    # Assert
    assert parsed == expected
    assert _try_parse_json(normalized) == expected


@pytest.mark.parametrize(
    ("content", "expected"),
    [
        ("문자열", "문자열"),
        (["문자", {"type": "text"}], "문자 {\"type\": \"text\"}"),
        ({"content": "값"}, "{\"content\": \"값\"}"),
    ],
)
def test_response_content_into_str_handles_supported_content_types(content, expected):
    """LangChain의 메시지 content 데이터 타입(str, list, dict)에 관계없이

    이를 가공하기 좋은 하나의 결합된 문자열(str) 형태로 일관되게 변환하는지 검증합니다.

    Args:
        content (Any): 변환 대상 메시지 콘텐츠 객체.
        expected (str): 최종 정규화 및 가공 완료된 포맷 문자열.
    """
    # Arrange
    # Act
    result = _response_content_into_str(content)

    # Assert
    assert result == expected


def test_build_user_content_appends_ocr_block():
    """RAG 등에서 사용될 사용자 입력 가공 함수가 기존 SMS 텍스트 하단에

    스캔된 이미지의 OCR 추출 텍스트 영역을 적절히 결합해 반환하는지 테스트합니다.
    """
    # Arrange
    text = "배송 주소 오류 확인 요청"
    ocr_text = "택배사 로고와 QR 코드"

    # Act
    result = _build_user_content(text, ocr_text)

    # Assert
    assert result.startswith(text)
    assert "[OCR 추출 텍스트]" in result
    assert result.endswith(ocr_text)


def test_naive_rag_node_returns_context_and_normalized_json(monkeypatch):
    """Zero-Day 탐지 경로(RAG) 노드 실행 시, VectorDB 사례 검색 결과를 결합하고

    LLM 호출을 거쳐 최종 정규화된 JSON 판단 결과를 반환하는지 검증합니다.

    Args:
        monkeypatch (pytest.MonkeyPatch): 싱글톤 LLM 팩토리 및 VectorDB 검색 함수 모킹용 픽스처.
    """
    # Arrange
    from ai_service.core import nodes

    fake_llm = FakeJsonLLM(
        '설명 접두사\n{"is_smishing": True, "reason": "택배 사칭 링크와 유사합니다."}'
    )
    monkeypatch.setattr(nodes, "get_singleton_json_llm", lambda: fake_llm)
    monkeypatch.setattr(nodes, "_search_zeroday_logic", lambda query: [{"page_content": "택배 사칭 악성 앱 설치 사례"}])

    state: SmishingGraphState = {
        "messages": [
            HumanMessage(content="[CJ대한통운] 배송 주소 오류 확인 http://fake.example"),
            AIMessage(content="ZERODAY_SMISHING_PATTERN"),
        ]
    }

    # Act
    result = naive_rag_node(state)
    parsed_output = json.loads(result["final_output"])

    # Assert
    assert result["context"] == "택배 사칭 악성 앱 설치 사례"
    assert parsed_output == {
        "is_smishing": True,
        "reason": "택배 사칭 링크와 유사합니다.",
    }
    assert result["messages"][0].content == fake_llm.response_content
    assert fake_llm.received_prompt is not None


def test_simple_reason_node_filters_human_messages_and_returns_json(monkeypatch):
    """일반(General) 분석 노드 실행 시, 메시지 히스토리 중 유효한 HumanMessage만을 추출하여

    LLM에 전달하고, 반환된 결과를 받아 정상적으로 가공 및 저장하는지 테스트합니다.

    Args:
        monkeypatch (pytest.MonkeyPatch): 싱글톤 LLM 팩토리 모킹용 픽스처.
    """
    # Arrange
    from ai_service.core import nodes

    fake_llm = FakeJsonLLM('{"is_smishing": true, "reason": "기관 사칭 링크입니다."}')
    monkeypatch.setattr(nodes, "get_singleton_json_llm", lambda: fake_llm)

    state: SmishingGraphState = {
        "messages": [
            HumanMessage(content="[대법원] 사건 접수 확인 http://fake.example"),
            AIMessage(content="GENERAL_SMISHING_REASON"),
        ]
    }

    # Act
    result = simple_reason_node(state)
    parsed_output = json.loads(result["final_output"])

    # Assert
    assert parsed_output["is_smishing"] is True
    assert parsed_output["reason"] == "기관 사칭 링크입니다."
    assert fake_llm.received_prompt is not None
