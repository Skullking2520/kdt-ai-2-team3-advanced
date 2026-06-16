
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
from langfuse import observe, propagate_attributes
from ..utils.langfuse_init import get_langfuse_client, make_langfuse_session_attributes

router = APIRouter(prefix="/api/v1", tags=["ai-service"])

langfuse = get_langfuse_client()


def _record_graph_response_span(result: dict, request: GraphInvokeRequest) -> None:
    if not langfuse:
        return
    metadata = {
        "route_override": str(request.route_override) if request.route_override else "none",
        "input_text_length": len(request.text or ""),
        "ocr_text_length": len(request.ocr_text or ""),
    }
    langfuse.update_current_span(
        output={
            "final_output": result.get("final_output"),
            "context": result.get("context"),
            "route_override": request.route_override,
        },
        metadata=metadata,
    )

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
@observe(as_type="span", name="ai_service.graph_invoke")
def invoke_graph(request: GraphInvokeRequest) -> GraphInvokeResponse:
    user_content = _build_user_content(request.text, request.ocr_text)
    state: SmishingGraphState = {"messages": [HumanMessage(content=user_content)]}
    if request.route_override:
        state["route_override"] = request.route_override

    session_attrs = make_langfuse_session_attributes(
        endpoint_name="graph_invoke",
        extra_metadata={
            "request_id": getattr(request, "route_override", "unknown"),
            "input_type": "sms+ocr" if request.ocr_text else "sms_only",
        },
    )

    with propagate_attributes(
        user_id=session_attrs["user_id"],
        session_id=session_attrs["session_id"],
        metadata=session_attrs["metadata"],
        tags=session_attrs["tags"],
    ):
        try:
            result = langgraph_app.invoke(state)
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"LangGraph 실행 실패: {exc}") from exc

        final_output = result.get("final_output")
        if not final_output and result.get("messages"):
            final_output = result["messages"][-1].content

        _record_graph_response_span(result, request)

    return GraphInvokeResponse(
        final_output=str(final_output or ""),
        parsed_output=_try_parse_json(str(final_output or "")),
        context=result.get("context"),
        route_override=request.route_override,
    )


@router.post("/vectordb/upsert")
@observe(as_type="span", name="ai_service.vectordb_upsert")
def upsert_documents(request: VectorUpsertRequest) -> dict[str, Any]:
    db = get_vector_db()
    session_attrs = make_langfuse_session_attributes(
        endpoint_name="vectordb_upsert",
        extra_metadata={"document_count": str(len(request.documents))},
    )

    with propagate_attributes(
        user_id=session_attrs["user_id"],
        session_id=session_attrs["session_id"],
        metadata=session_attrs["metadata"],
        tags=session_attrs["tags"],
    ):
        try:
            db.upsert_documents(
                documents=request.documents,
                metadatas=request.metadatas,
                ids=request.ids,
            )
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"VectorDB upsert 실패: {exc}") from exc

        langfuse.update_current_span(
            output={"upserted": len(request.documents)},
            metadata={"collection": settings.CHROMA_COLLECTION_NAME},
        )

    return {"upserted": len(request.documents)}


@router.post("/vectordb/retrieve")
@observe(as_type="span", name="ai_service.vectordb_retrieve")
def retrieve_documents(request: VectorRetrieveRequest) -> dict[str, Any]:
    db = get_vector_db()
    session_attrs = make_langfuse_session_attributes(
        endpoint_name="vectordb_retrieve",
        extra_metadata={"query": request.query[:100]},
    )

    with propagate_attributes(
        user_id=session_attrs["user_id"],
        session_id=session_attrs["session_id"],
        metadata=session_attrs["metadata"],
        tags=session_attrs["tags"],
    ):
        try:
            results = db.similarity_search(query=request.query, k=request.k)
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"VectorDB retrieve 실패: {exc}") from exc

        langfuse.update_current_span(
            output={"result_count": len(results)},
            metadata={"collection": settings.CHROMA_COLLECTION_NAME},
        )

    return {"query": request.query, "results": results}
