# 에이전트 전용 검색 도구 (rag tool 등, 선택)
from langchain_core.tools import tool
from ..vectordb.service import get_vector_db
from typing import Any
import json

# 1. 순수 파이썬 함수로 로직을 먼저 정의합니다.
def _search_zeroday_logic(query: str) -> list[dict[str, Any]]:
    db = get_vector_db()
    results = db.similarity_search(query, k=3)
    return results


def _get_document_text(doc: dict[str, Any]) -> str:
    page_content = doc.get("page_content") or ""
    if page_content and page_content != "train_data":
        return page_content

    metadata = doc.get("metadata") or {}
    return (
        metadata.get("document")
        or metadata.get("text")
        or metadata.get("page_content")
        or metadata.get("page_content_text")
        or ""
    )


def _format_zeroday_context(results: list[dict[str, Any]]) -> str:
    if not results:
        return ""

    topk_texts = [_get_document_text(doc) for doc in results]
    return "\n\n".join([text for text in topk_texts if text])


def _format_zeroday_debug(query: str, results: list[dict[str, Any]]) -> str:
    debug_lines = [f"[VectorDB Debug] query: {query}", f"retrieved_documents: {len(results)}"]

    for index, doc in enumerate(results, start=1):
        metadata = doc.get("metadata", {}) or {}
        source = metadata.get("source") or metadata.get("id") or metadata.get("page_content") or "unknown"
        debug_lines.extend([
            f"--- document {index}",
            f"score: {doc.get('score')}",
            f"source: {source}",
            f"metadata: {json.dumps(metadata, ensure_ascii=False)}",
            "page_content:",
            doc.get("page_content", ""),
        ])
    return "\n".join(debug_lines)


# 2. 에이전트(LLM)에게 전달할 툴 객체는 위 함수를 감싸서 만듭니다.
@tool
def search_zeroday_smishing_pattern(query: str) -> str:
    """ 벡터 db에서 제로데이 스미싱 패턴을 검색합니다. """
    results = _search_zeroday_logic(query)
    return _format_zeroday_context(results)
