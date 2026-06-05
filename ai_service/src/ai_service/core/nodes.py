# 노드 (여기서 vectordb_service를 호출)
# 각 노드가 수행할 python함수들 (llm 호출 노드, 도구 실행 노드 등)
from ..config.prompts import RAG_ANSWER_PROMPT
from ..models.client import get_ollama_llm
# todo: 아래는 예시일 뿐이고, langgraph 각 노드 로직부터 구성해야함!
def answer_smishing_reason_node(state):
    llm = get_ollama_llm(model_name="qwen2.5:7b")

    # 템플릿과 llm을 체인으로 연결한 뒤 바로 실행
    chain = RAG_ANSWER_PROMPT | llm

    # state에서 꺼낸 값들을 프롬프트 변수에 매핑
    response = chain.invoke({
        "context": state["context"],
        "messages": state["messages"]
    })

    return {"messages": [response]}