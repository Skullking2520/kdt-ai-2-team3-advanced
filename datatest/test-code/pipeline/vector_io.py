"""ChromaDB 헬퍼.

임베딩 모델은 jhgan/ko-sroberta-multitask, 768차원, cosine.
"""

import chromadb
from sentence_transformers import SentenceTransformer

from .config import CHROMA_COLLECTION, CHROMA_PATH, EMBEDDING_MODEL

_client = None
_model = None


def get_model() -> SentenceTransformer:
    """싱글톤 임베딩 모델."""
    global _model
    if _model is None:
        _model = SentenceTransformer(EMBEDDING_MODEL)
    return _model


def get_client():
    """싱글톤 ChromaDB 클라이언트."""
    global _client
    if _client is None:
        _client = chromadb.PersistentClient(path=CHROMA_PATH)
    return _client


def get_collection():
    """smishing_cases 컬렉션 (없으면 생성)."""
    client = get_client()
    return client.get_or_create_collection(
        name=CHROMA_COLLECTION,
        metadata={"hnsw:space": "cosine"},
    )


def upsert_cases(
    ids: list[str],
    documents: list[str],
    metadatas: list[dict],
) -> None:
    """검증 사례 적재 (upsert로 중복 실행 안전)."""
    model = get_model()
    collection = get_collection()
    embeddings = model.encode(documents).tolist()
    collection.upsert(
        ids=ids,
        embeddings=embeddings,
        documents=documents,
        metadatas=metadatas,
    )


def search_similar(query_text: str, n_results: int = 3) -> list[dict]:
    """질의 텍스트로 유사 사례 검색.

    Returns:
        [{"id": ..., "document": ..., "similarity": ..., "metadata": ...}, ...]
    """
    model = get_model()
    collection = get_collection()
    if collection.count() == 0:
        return []

    query_emb = model.encode([query_text]).tolist()
    results = collection.query(
        query_embeddings=query_emb,
        n_results=min(n_results, collection.count()),
    )

    output = []
    for case_id, doc, dist, meta in zip(
        results["ids"][0],
        results["documents"][0],
        results["distances"][0],
        results["metadatas"][0],
    ):
        # cosine 거리 → 유사도 (1 - 거리)
        output.append({
            "case_id": case_id,
            "document": doc,
            "similarity": round(1 - dist, 3),
            "metadata": meta,
        })
    return output
