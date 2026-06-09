
from typing import Any
from urllib.error import URLError
from urllib.request import urlopen

from fastapi import APIRouter, HTTPException
from langchain_core.messages import HumanMessage

from ..schema.routes import HealthCheckResponse
from ..schema.graph import GraphInvokeRequest, GraphInvokeResponse
from ..schema.vectordb import VectorUpsertRequest, VectorRetrieveRequest
from ..config.settings import settings
from ..core.graph import langgraph_app
from ..vectordb.service import get_vector_db
from ..core.state import SmishingGraphState
from ..utils.rag_content import _build_user_content
from ..utils.json_utils import _try_parse_json

router = APIRouter(prefix="/api/v1", tags=["ai-service"])

@router.get("/health")
def health() -> dict[str, Any]:
    ollama_ok = False
    ollama_error = None
    
    # 1. Ollama 연결 상태 체크 (비즈니스 로직) 
    # todo: 프로덕션 환경에서 vllm 로직 추가!
    try:
        with urlopen(f"{settings.OLLAMA_BASE_URL.rstrip('/')}/api/tags", timeout=2) as response:
            ollama_ok = response.status == 200
    except (OSError, URLError) as exc:
        ollama_error = str(exc)

    # 2. 팩토리 함수를 통한 깔끔한 응답 생성 및 리턴
    return HealthCheckResponse.from_env(
        settings=settings, 
        ollama_ok=ollama_ok, 
        ollama_error=ollama_error
    ).to_dict()


@router.post("/graph/invoke", response_model=GraphInvokeResponse)
def invoke_graph(request: GraphInvokeRequest) -> GraphInvokeResponse:
    user_content = _build_user_content(request.text, request.ocr_text)
    state: SmishingGraphState = {"messages": [HumanMessage(content=user_content)]}
    if request.route_override:
        state["route_override"] = request.route_override

    try:
        result = langgraph_app.invoke(state)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"LangGraph 실행 실패: {exc}") from exc
    # fastapi는 에러가 raise되도 깔끔한 JSON 응답을 기본 제공

    final_output = result.get("final_output")
    if not final_output and result.get("messages"):
        final_output = result["messages"][-1].content

    return GraphInvokeResponse(
        final_output=str(final_output or ""),
        parsed_output=_try_parse_json(str(final_output or "")),
        context=result.get("context"),
        route_override=request.route_override,
    )


@router.post("/vectordb/upsert")
def upsert_documents(request: VectorUpsertRequest) -> dict[str, Any]:
    db = get_vector_db()
    try:
        db.upsert_documents(
            documents=request.documents,
            metadatas=request.metadatas,
            ids=request.ids,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"VectorDB upsert 실패: {exc}") from exc

    return {"upserted": len(request.documents)}


@router.post("/vectordb/retrieve")
def retrieve_documents(request: VectorRetrieveRequest) -> dict[str, Any]:
    db = get_vector_db()
    try:
        results = db.similarity_search(query=request.query, k=request.k)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"VectorDB retrieve 실패: {exc}") from exc

    return {"query": request.query, "results": results}
