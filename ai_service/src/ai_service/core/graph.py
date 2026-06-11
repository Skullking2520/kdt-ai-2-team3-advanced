# langgraph의 graph workflow 정의
from langgraph.graph import StateGraph, END
from .state import SmishingGraphState
from .nodes import router_node, naive_rag_node, simple_reason_node

# 1. 조건부 엣지 판별용 제어 함수
def route_after_router(state: SmishingGraphState):
    """ 라우터 노드의 텍스트 결과를 판단하여 다음 연산 노드로 분기 """
    messages = state["messages"]

    # 라우터가 출력한 가장 최신의 메시지 텍스트 공백 제거
    raw_content = messages[-1].content

    # 2. 타입에 따라 안전하게 문자열(str)로 가공합니다.
    if isinstance(raw_content, str):
        last_message_content = raw_content
    elif isinstance(raw_content, list):
        # 멀티모달(이미지+텍스트) 형태일 경우 텍스트 요소만 합치거나, 통째로 문자열 변환
        last_message_content = "".join([str(item) for item in raw_content])
    else:
        last_message_content = str(raw_content)

    last_message_content = last_message_content.strip()
    
    if "ZERODAY_SMISHING_PATTERN" in last_message_content:
        return "zero_day"
    else:
        return "general"
    
# 2. 워크플로우 인스턴스화
workflow = StateGraph(SmishingGraphState)

# 3. 각 파일에서 정의한 노드 등록
workflow.add_node("router_node", router_node)
workflow.add_node("naive_rag_node", naive_rag_node)
workflow.add_node("simple_reason_node", simple_reason_node)

# 4. 진입점 선언
workflow.set_entry_point("router_node")

# 5. 라우터 노드 이후의 동적 분기 흐름 정의 (Conditional Edge)
workflow.add_conditional_edges(
    "router_node",
    route_after_router,
    {
        "zero_day": "naive_rag_node", # 신종 패턴이면 RAG 노드로 진행
        "general": "simple_reason_node" # 명백한 패턴이면 퓨삿 노드로 진행
    }
)

# 6. 리프 노드들의 종료 조건 연결
workflow.add_edge("naive_rag_node", END)
workflow.add_edge("simple_reason_node", END)

# 7. 최종 런타임 애플리케이션 객체 컴파일
langgraph_app = workflow.compile()
    
