# 노드 (여기서 vectordb_service를 호출)
# 각 노드가 수행할 python함수들 (llm 호출 노드, 도구 실행 노드 등)

from typing import Any

from langchain_core.messages import AIMessage, HumanMessage
from langfuse import propagate_attributes

from ..config.prompts import RAG_ANSWER_PROMPT, ROUTER_PROMPT, SIMPLE_SMISHING_REASON_PROMPT
from ..core.singleton_llm import get_singleton_json_llm, get_singleton_llm
from ..core.state import SmishingGraphState
from ..core.tools import _search_zeroday_logic
from ..utils.json_utils import _response_content_into_str, _normalize_json_output
from ..utils.langfuse_init import get_langfuse_client

langfuse = get_langfuse_client()


def _extract_response_metrics(response: Any) -> dict[str, Any]:
    usage_details = {}
    if hasattr(response, "usage") and response.usage is not None:
        usage = response.usage
        usage_details = {
            "input": getattr(usage, "prompt_tokens", 0),
            "output": getattr(usage, "completion_tokens", 0),
        }
    return usage_details

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

    with langfuse.start_as_current_observation(
        name="router_node",
        as_type="generation",
        input={"messages": [m.content for m in messages]},
        model=getattr(llm, "model", "ollama"),
        metadata={"node": "router", "route_override": str(route_override)},
    ) as observation:
        response = llm.invoke(prompt)
        observation.update(
            output=str(response.content),
            usage_details=_extract_response_metrics(response),
            metadata={"llm_type": "router"},
        )

    return {"messages": [response]}

def naive_rag_node(state: SmishingGraphState):
    """ VectorDB에서 문서를 검색하고, 이를 프롬프트에 주입하여 답변을 생성 """
    llm = get_singleton_json_llm()
    messages = state["messages"]

    raw_content = messages[-2].content if len(messages) > 1 else messages[0].content
    if isinstance(raw_content, str):
        user_query = raw_content
    elif isinstance(raw_content, list):
        user_query = " ".join([str(item) for item in raw_content])
    else:
        user_query = str(raw_content)

    context = _search_zeroday_logic(user_query)
    prompt = RAG_ANSWER_PROMPT.format_prompt(context=context, messages=messages)

    with langfuse.start_as_current_observation(
        name="naive_rag_node",
        as_type="generation",
        input={"query": user_query, "context_docs": len(context) if isinstance(context, list) else 1},
        model=getattr(llm, "model", "ollama"),
        metadata={"node": "naive_rag", "retrieved_context_count": len(context) if isinstance(context, list) else 1},
    ) as observation:
        response = llm.invoke(prompt)
        content = _response_content_into_str(response.content)
        final_output = _normalize_json_output(content)

        observation.update(
            output=final_output,
            usage_details=_extract_response_metrics(response),
            metadata={"finish_reason": getattr(response, "finish_reason", None)},        )

    return {"messages": [response], "context": context, "final_output": final_output}

def simple_reason_node(state: SmishingGraphState):
    """ RAG 인덱싱 없이 내장된 퓨샷 기반으로 스미싱 사유를 즉시 json으로 추출 """
    llm = get_singleton_json_llm()
    messages = state["messages"]
    user_messages = [m for m in messages if isinstance(m, HumanMessage)]
    prompt = SIMPLE_SMISHING_REASON_PROMPT.format_prompt(messages=user_messages)

    with langfuse.start_as_current_observation(
        name="simple_reason_node",
        as_type="generation",
        input={"messages": [m.content for m in user_messages]},
        model=getattr(llm, "model", "ollama"),
        metadata={"node": "simple_reason"},
    ) as observation:
        response = llm.invoke(prompt)
        content = _response_content_into_str(response.content)
        final_output = _normalize_json_output(content)

        observation.update(
            output=final_output,
            usage_details=_extract_response_metrics(response),
            metadata={"generated_length": len(str(final_output))},
        )

    return {"final_output": final_output}



