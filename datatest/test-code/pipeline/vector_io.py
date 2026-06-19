"""Pinecone Vector DB 헬퍼.

본 모듈은 ChromaDB 기반의 기존 vector_io.py를 Pinecone API로 재구현한 버전.
임베딩 모델은 jhgan/ko-sroberta-multitask (768차원, cosine) 그대로 유지.

[메타데이터 스키마 v2.1]
{
    "source":           "train_data | crawling_kr | crawling_foreign | user_input | ragas_golden",
    "security_type":    "스미싱 | 피싱 | 보이스피싱 | zero-day | 악성앱 | analysis",
    "language":         "ko | en",
    "chunk_idx":        0,
    "original_doc_id":  "doc-uuid",
    "source_url":       "https://...",
    "doc_version":      "v2.1",
    "pipeline_version": "p-0.4.0",
    "question":         "...",
    "ground_truth":     "...",
    "collected_at":     "2026-06-01T10:00:00Z",
    "updated_at":       "2026-06-01T10:00:00Z",
    "has_url":               0,
    "has_phone":             0,
    "has_money":             0,
    "has_account":           0,
    "special_keyword_count": 0,
}

상세 내용은 docs/pinecone_spec.md 참조.
"""
import os
from pinecone import Pinecone
from sentence_transformers import SentenceTransformer
from pipeline.config import EMBEDDING_MODEL, PINECONE_INDEX_NAME
from .logger import log_error, log_info, log_warning


# ─── 메타데이터 검증 상수 (ChromaDB 버전과 동일하게 유지) ─────────────
# v0.1에서 ragas_golden, analysis 추가
ALLOWED_SOURCES = {
    "train_data", "crawling_kr", "crawling_foreign",
    "user_input", "ragas_golden"
}
ALLOWED_SECURITY_TYPES = {
    "스미싱", "피싱", "보이스피싱", "zero-day", "악성앱", "analysis"
}
ALLOWED_LANGUAGES = {"ko", "en"}

HAS_FLAGS = ("has_url", "has_phone", "has_money", "has_account")

REQUIRED_META_KEYS = {
    "source", "security_type", "language",
    "original_doc_id", "doc_version", "pipeline_version",
    "collected_at", "updated_at",
    "has_url", "has_phone", "has_money", "has_account",
    "special_keyword_count",
}

# Pinecone 메타데이터에 허용되는 타입 (스칼라 + list[str])
# 단, 현 단계에선 ChromaDB 호환 위해 스칼라만 사용
_SCALAR_TYPES = (str, int, float, bool)


_client = None
_model = None
_index = None


def get_model() -> SentenceTransformer:
    """싱글톤 임베딩 모델."""
    global _model
    if _model is None:
        _model = SentenceTransformer(EMBEDDING_MODEL)
    return _model


def get_client() -> Pinecone:
    """싱글톤 Pinecone 클라이언트.

    환경변수 PINECONE_API_KEY 필요.
    """
    global _client
    if _client is None:
        api_key = os.environ.get("PINECONE_API_KEY")
        if not api_key:
            raise RuntimeError(
                "PINECONE_API_KEY 환경변수가 설정되지 않음. .env 파일 확인."
            )
        _client = Pinecone(api_key=api_key)
    return _client


def get_index():
    """smishing-cases-v01 인덱스 핸들 (싱글톤).

    인덱스가 없으면 RuntimeError. 인덱스 생성은 Pinecone 콘솔에서 수동으로 수행.
    """
    global _index
    if _index is None:
        pc = get_client()
        existing = [idx.name for idx in pc.list_indexes()]
        if PINECONE_INDEX_NAME not in existing:
            raise RuntimeError(
                f"Pinecone 인덱스 '{PINECONE_INDEX_NAME}'가 존재하지 않음. "
                f"콘솔에서 먼저 생성 필요. (dimension=768, metric=cosine) "
                f"현재 인덱스 목록: {existing}"
            )
        _index = pc.Index(PINECONE_INDEX_NAME)
    return _index


# ─── 메타데이터 검증·정제 ────────────────────────────────────────────
def _validate_metadata(meta: dict, idx: int) -> None:
    """ChromaDB 버전과 동일한 검증 규칙 적용."""
    missing = REQUIRED_META_KEYS - meta.keys()
    if missing:
        raise ValueError(f"[idx={idx}] 필수 메타 키 누락: {missing}")

    if meta["source"] not in ALLOWED_SOURCES:
        raise ValueError(
            f"[idx={idx}] source='{meta['source']}'는 허용되지 않음. "
            f"허용: {ALLOWED_SOURCES}"
        )
    if meta["security_type"] not in ALLOWED_SECURITY_TYPES:
        raise ValueError(
            f"[idx={idx}] security_type='{meta['security_type']}'는 허용되지 않음. "
            f"허용: {ALLOWED_SECURITY_TYPES}"
        )
    if meta["language"] not in ALLOWED_LANGUAGES:
        raise ValueError(
            f"[idx={idx}] language='{meta['language']}'는 허용되지 않음. "
            f"허용: {ALLOWED_LANGUAGES}"
        )

    for flag in HAS_FLAGS:
        if meta[flag] not in (0, 1):
            raise ValueError(
                f"[idx={idx}] {flag}={meta[flag]}는 0 또는 1만 허용"
            )

    for k, v in meta.items():
        if v is None:
            continue
        if not isinstance(v, _SCALAR_TYPES):
            raise ValueError(
                f"[idx={idx}] 메타 '{k}'={type(v).__name__} 타입은 비호환. "
                f"스칼라(str/int/float/bool)만 허용."
            )


def _normalize_metadata(meta: dict, document: str) -> dict:
    """Pinecone 적재 직전 정제.
    - None → "" 변환
    - document 본문을 메타에 포함 (Pinecone은 ChromaDB의 documents 슬롯이 없음)
    """
    clean = {k: ("" if v is None else v) for k, v in meta.items()}
    clean["document"] = document  # 검색 결과에서 본문 복원용
    return clean


# ─── 적재·검색 ──────────────────────────────────────────────────────
def upsert_cases(
    ids: list[str],
    documents: list[str],
    metadatas: list[dict],
    batch_size: int = 100,
) -> None:
    """사례 적재. ChromaDB 버전과 동일한 시그니처 유지.

    Pinecone API 특성:
    - 한 번에 최대 100개씩 배치 처리 권장
    - upsert는 ID 충돌 시 자동 덮어쓰기
    - documents는 메타의 'document' 필드에 저장됨 (Pinecone은 본문 슬롯 없음)
    """
    if not (len(ids) == len(documents) == len(metadatas)):
        raise ValueError(
            f"ids({len(ids)}), documents({len(documents)}), "
            f"metadatas({len(metadatas)}) 길이가 일치해야 함"
        )

    try:
        # 1. 검증
        for i, meta in enumerate(metadatas):
            _validate_metadata(meta, i)

        # 2. 정제 (document 본문을 메타에 포함)
        clean_metas = [
            _normalize_metadata(m, doc)
            for m, doc in zip(metadatas, documents)
        ]

        # 3. 임베딩
        model = get_model()
        embeddings = model.encode(documents, show_progress_bar=True).tolist()

        # 4. Pinecone에 적재 (배치)
        index = get_index()
        vectors = [
            {"id": id_, "values": emb, "metadata": meta}
            for id_, emb, meta in zip(ids, embeddings, clean_metas)
        ]

        for i in range(0, len(vectors), batch_size):
            batch = vectors[i:i + batch_size]
            index.upsert(vectors=batch)
            log_info(
                "vector_io",
                "upsert_cases",
                f"배치 {i//batch_size + 1} 적재: {len(batch)}건"
            )

        log_info("vector_io", "upsert_cases", f"총 {len(ids)}건 적재 완료")

    except ValueError as e:
        log_error("vector_io", "upsert_cases", f"검증 실패: {e}", exc=e)
        raise
    except Exception as e:
        log_error("vector_io", "upsert_cases", f"적재 실패: {e}", exc=e)
        raise


def search_similar(
    query_text: str,
    n_results: int = 3,
    where: dict | None = None,
) -> list[dict]:
    """질의 텍스트로 유사 사례 검색.

    Args:
        query_text: 검색 질의
        n_results: 반환할 결과 수
        where: Pinecone 메타 필터 (예: {"language": "ko"}, {"has_url": 1}).
               복합 조건은 {"$and": [...]} 형식.

    Returns:
        [
            {
                "case_id": ...,
                "document": ...,
                "similarity": ...,   # Pinecone score (코사인의 경우 1.0이 최대)
                "metadata": ...,
            },
            ...
        ]
        오류 시 빈 리스트.
    """
    try:
        model = get_model()
        index = get_index()

        # 인덱스 통계 확인
        stats = index.describe_index_stats()
        total = stats.get("total_vector_count", 0)
        if total == 0:
            log_warning("vector_io", "search_similar", "인덱스가 비어있음")
            return []

        # 임베딩 → 검색
        query_emb = model.encode([query_text])[0].tolist()

        query_kwargs = {
            "vector": query_emb,
            "top_k": min(n_results, total),
            "include_metadata": True,
        }
        if where:
            query_kwargs["filter"] = where

        response = index.query(**query_kwargs)

        output = []
        for match in response["matches"]:
            meta = dict(match["metadata"])
            document = meta.pop("document", "")  # 메타에서 본문 분리
            output.append({
                "case_id":    match["id"],
                "document":   document,
                "similarity": round(match["score"], 3),
                "metadata":   meta,
            })

        log_info(
            "vector_io",
            "search_similar",
            f"{len(output)}건 검색 완료 (filter={where})"
        )
        return output

    except Exception as e:
        log_error("vector_io", "search_similar", f"검색 실패: {e}", exc=e)
        return []
