# langgraph state 정의
from typing import TypedDict, Annotated, Sequence
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages

class SmishingGraphState(TypedDict):
    """ Langgraph의 노드 간 데이터 공유를 위한 State 객체 """
    # add_messages 데코레이터를 통해 기존 대화 내역에 append 방식으로 누적
    messages: Annotated[Sequence[BaseMessage], add_messages]

    # RAG 검색 결과를 일시적으로 저장하는 버퍼 공간
    context: str

    # FastAPI로 최종 반환할 구조화된 JSON 문자열 저장소
    final_output: str
    