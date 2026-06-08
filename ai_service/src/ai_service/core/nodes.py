# 노드 (여기서 vectordb_service를 호출)
# 각 노드가 수행할 python함수들 (llm 호출 노드, 도구 실행 노드 등)
import json
import re

from langchain_core.messages import AIMessage, HumanMessage
from ..config.prompts import RAG_ANSWER_PROMPT, ROUTER_PROMPT, SIMPLE_SMISHING_REASON_PROMPT
from .singleton_llm import get_singleton_json_llm, get_singleton_llm
from .state import SmishingGraphState
from .tools import _search_zeroday_logic


def _response_content_into_str(content: str | list | dict) -> str:
    # 1. 안전하게 str 타입으로 추출합니다.
    if isinstance(content, str):
        raw_content = content
    elif isinstance(content, list):
        # 리스트 형태인 경우 텍스트 요소들을 하나로 합칩니다.
        raw_content = " ".join([item if isinstance(item, str) else str(item) for item in content])
    else:
        raw_content = str(content)
    return raw_content


def _normalize_json_output(content: str) -> str:
    """LLM 응답에서 마지막 JSON 객체를 추출해 표준 JSON 문자열로 변환한다."""
    """
    네, 분석 결과는 다음과 같습니다:
    {
    "is_smishing": true,
    "reason": "택배 사칭"
    }
    위 결과를 참고하세요.

    json이 위와 같이 응답이 나오면 추출해야 되고,

    LLM 에러 출력 예시: {"is_smishing": True} (올바르지 않은 JSON 표준)
    이렇게 true가 아닌 파이썬 True가 나오면 json 에러이므로 변경하기
    """
    candidates = [content, *re.findall(r"\{.*?\}", content, flags=re.DOTALL)]
    for candidate in reversed(candidates): 
        # 마지막에 있는 json응답부터 시도해봄.
        normalized = re.sub(r"\bTrue\b", "true", candidate)
        normalized = re.sub(r"\bFalse\b", "false", normalized)
        try:
            parsed = json.loads(normalized)
        except json.JSONDecodeError:
            continue
        if isinstance(parsed, dict):
            return json.dumps(parsed, ensure_ascii=False)
    return content.strip()

def router_node(state: SmishingGraphState):
    """ 입력 문장이 신종 제로데이 패턴인지, 퓨샷으로 즉시 추론 가능한 일반 패턴인지 분류 """
    route_override = state.get("route_override")
    if route_override == "zero_day":
        return {"messages": [AIMessage(content="ZERODAY_SMISHING_PATTERN")]}
    if route_override == "general":
        return {"messages": [AIMessage(content="GENERAL_SMISHING_REASON")]}

    llm = get_singleton_llm()

    messages = state["messages"]
    prompt = ROUTER_PROMPT.format_prompt(messages=messages)
    response = llm.invoke(prompt)

    return {"messages": [response]}

def naive_rag_node(state: SmishingGraphState):
    """ VectorDB에서 문서를 검색하고, 이를 프롬프트에 주입하여 답변을 생성 """
    llm = get_singleton_json_llm()

    messages = state["messages"]

    # 마지막 유저 메시지 (본문 + OCR 결합 텍스트)를 추출하여 검색 쿼리로 사용
    raw_content = messages[-2].content if len(messages) > 1 else messages[0].content

     # 2. 타입에 따라 안전하게 문자열(str)로 가공합니다.
    if isinstance(raw_content, str):
        user_query = raw_content
    elif isinstance(raw_content, list):
        # 멀티모달(이미지+텍스트) 형태일 경우 텍스트 요소만 합치거나, 통째로 문자열 변환
        user_query = " ".join([str(item) for item in raw_content])
    else:
        user_query = str(raw_content)

    # tools.py의 검색 모듈 실행
    context = _search_zeroday_logic(user_query)
    
    prompt = RAG_ANSWER_PROMPT.format_prompt(context=context, messages=messages)
    # json 답변 후보: lcle 체인으로 langchain_core.output_parsers의 JsonOutputParser?
    response = llm.invoke(prompt)
    content = _response_content_into_str(response.content)
    final_output = _normalize_json_output(content)

    return {"messages": [response], "context": context, "final_output": final_output}

def simple_reason_node(state: SmishingGraphState):
    """ RAG 인덱싱 없이 내장된 퓨샷 기반으로 스미싱 사유를 즉시 json으로 추출 """
    llm = get_singleton_json_llm()

    messages = state["messages"]

    # 라우터의 ai 응답 메시지를 제외하고 오직 유저가 보낸 HumanMessage만 필터링
    user_messages = [m for m in messages if isinstance(m, HumanMessage)]

    prompt = SIMPLE_SMISHING_REASON_PROMPT.format_prompt(messages=user_messages)
    response = llm.invoke(prompt)
    content = _response_content_into_str(response.content)
    
    return {"final_output": _normalize_json_output(content)}



