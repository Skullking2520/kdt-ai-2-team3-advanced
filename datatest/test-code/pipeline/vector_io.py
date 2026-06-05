"""ChromaDB 헬퍼.

임베딩 모델은 jhgan/ko-sroberta-multitask, 768차원, cosine.

[메타데이터 스키마 v2.1]
{
    "id": "case_kisa_2025_001",
    "document": "본인인증 위해 첨부 링크 클릭 바랍니다",
    "metadata": {
        # 출처·분류
        "source":           "train_data | crawling_kr | crawling_foreign | user_input",
        "security_type":    "스미싱 | 피싱 | 보이스피싱 | zero-day | 악성앱",
        "language":         "ko | en",

        # 문서 식별·버전
        "chunk_idx":        0,
        "original_doc_id":  "doc-uuid",
        "source_url":       "https://boannews.com",
        "doc_version":      "v2.1",
        "pipeline_version": "p-0.4.0",

        # 평가용 (선택)
        "question":         "골든 데이터셋 질문 (선택)",
        "ground_truth":     "전문가 정답 (선택)",

        # 시간 (ISO 8601 문자열)
        "collected_at":     "2026-06-01T10:00:00Z",
        "updated_at":       "2026-06-01T10:00:00Z",

        # 추출 결과 플래그 (검색 필터용)
        "has_url":               0,
        "has_phone":             0,
        "has_money":             0,
        "has_account":           0,    # ← v2.1 신규: 계좌번호 포함 여부
        "special_keyword_count": 0,
    }
}

상세 추출 데이터(url/phone/money/account 리스트)는 MySQL
`extracted_entities` 테이블에 별도 저장. ChromaDB 메타엔 has_* 플래그만 둠.

[변경 이력]
- v2.1 (2026-06-XX): has_account 플래그 추가
- v2.0: source 분리(crawling_kr/crawling_foreign), has_* 플래그 도입, _extracted 제거
"""
import chromadb
from chromadb import errors as chroma_errors
from sentence_transformers import SentenceTransformer
from .config import CHROMA_COLLECTION, CHROMA_PATH, EMBEDDING_MODEL
from .logger import log_error, log_info, log_warning


# ─── 메타데이터 검증 상수 ─────────────────────────────────────────────
ALLOWED_SOURCES = {"train_data", "crawling_kr", "crawling_foreign", "user_input"}
ALLOWED_SECURITY_TYPES = {"스미싱", "피싱", "보이스피싱", "zero-day", "악성앱"}
ALLOWED_LANGUAGES = {"ko", "en"}

# v2.1: has_account 추가
HAS_FLAGS = ("has_url", "has_phone", "has_money", "has_account")

REQUIRED_META_KEYS = {
    "source", "security_type", "language",
    "original_doc_id", "doc_version", "pipeline_version",
    "collected_at", "updated_at",
    "has_url", "has_phone", "has_money", "has_account",  # ← v2.1 추가
    "special_keyword_count",
}

# ChromaDB 메타데이터에 허용되는 타입 (스칼라만)
_SCALAR_TYPES = (str, int, float, bool)


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


# ─── 메타데이터 검증·정제 ────────────────────────────────────────────
def _validate_metadata(meta: dict, idx: int) -> None:
    """ChromaDB에 적재하기 전 메타데이터 검증.

    Args:
        meta: 검증할 메타데이터 dict
        idx:  배치 내 인덱스 (에러 메시지에 사용)

    Raises:
        ValueError: 필수 키 누락·허용 값 위반·비스칼라 타입 등
    """
    # 1. 필수 키 체크
    missing = REQUIRED_META_KEYS - meta.keys()
    if missing:
        raise ValueError(f"[idx={idx}] 필수 메타 키 누락: {missing}")

    # 2. enum 값 체크
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

    # 3. 플래그 0/1 체크 (v2.1: has_account 포함)
    for flag in HAS_FLAGS:
        if meta[flag] not in (0, 1):
            raise ValueError(
                f"[idx={idx}] {flag}={meta[flag]}는 0 또는 1만 허용"
            )

    # 4. ChromaDB 호환 — 모든 값이 스칼라(또는 None)인지
    for k, v in meta.items():
        if v is None:
            continue
        if not isinstance(v, _SCALAR_TYPES):
            raise ValueError(
                f"[idx={idx}] 메타 '{k}'={type(v).__name__} 타입은 ChromaDB 비호환. "
                f"스칼라(str/int/float/bool)만 허용. (리스트라면 MySQL로 분리 저장 필요)"
            )


def _normalize_metadata(meta: dict) -> dict:
    """ChromaDB 적재 직전에 None 값을 빈 문자열로 변환.
    ChromaDB는 None을 메타 값으로 허용하지 않으므로 선택 필드를 정제.
    """
    return {k: ("" if v is None else v) for k, v in meta.items()}


# ─── 적재·검색 ──────────────────────────────────────────────────────
def upsert_cases(
    ids: list[str],
    documents: list[str],
    metadatas: list[dict],
) -> None:
    """검증 사례 적재 (upsert로 중복 실행 안전).

    각 메타데이터는 적재 전에 _validate_metadata로 검증됨. 검증 실패 시
    ValueError가 발생하며, 한 건이라도 실패하면 배치 전체가 적재되지 않음.
    """
    if not (len(ids) == len(documents) == len(metadatas)):
        raise ValueError(
            f"ids({len(ids)}), documents({len(documents)}), "
            f"metadatas({len(metadatas)}) 길이가 일치해야 함"
        )

    try:
        # 1. 모든 메타데이터 사전 검증
        for i, meta in enumerate(metadatas):
            _validate_metadata(meta, i)

        # 2. None → "" 정제
        clean_metas = [_normalize_metadata(m) for m in metadatas]

        # 3. 임베딩·적재
        model = get_model()
        collection = get_collection()
        embeddings = model.encode(documents).tolist()
        collection.upsert(
            ids=ids,
            embeddings=embeddings,
            documents=documents,
            metadatas=clean_metas,
        )
        log_info("vector_io", "upsert_cases", f"{len(ids)}건 적재 완료")

    except ValueError as e:
        log_error("vector_io", "upsert_cases", f"메타데이터 검증 실패: {e}", exc=e)
        raise
    except chroma_errors.InvalidDimensionException as e:
        log_error("vector_io", "upsert_cases", f"차원 불일치 오류: {e}", exc=e)
        raise
    except Exception as e:
        log_error("vector_io", "upsert_cases", f"upsert 실패: {e}", exc=e)
        raise


def search_similar(
    query_text: str,
    n_results: int = 3,
    where: dict | None = None,
) -> list[dict]:
    """질의 텍스트로 유사 사례 검색.

    Args:
        query_text: 검색할 질의 문장
        n_results:  반환 결과 수 (컬렉션 크기 초과 시 자동 조정)
        where:      메타데이터 필터 (예: {"has_account": 1}). None이면 전체.

    Returns:
        [
            {
                "case_id":    "case_kisa_2025_001",
                "document":   "본인인증 위해 첨부 링크 클릭 바랍니다",
                "similarity": 0.873,
                "metadata":   {...}
            },
            ...
        ]
        오류 발생 시 빈 리스트 반환.
    """
    try:
        model = get_model()
        collection = get_collection()

        if collection.count() == 0:
            log_warning("vector_io", "search_similar", "컬렉션이 비어있음")
            return []

        query_emb = model.encode([query_text]).tolist()

        query_kwargs = {
            "query_embeddings": query_emb,
            "n_results": min(n_results, collection.count()),
        }
        if where:
            query_kwargs["where"] = where

        results = collection.query(**query_kwargs)

        output = []
        for case_id, doc, dist, meta in zip(
            results["ids"][0],
            results["documents"][0],
            results["distances"][0],
            results["metadatas"][0],
        ):
            output.append({
                "case_id": case_id,
                "document": doc,
                "similarity": round(1 - dist, 3),
                "metadata": meta,
            })
        log_info(
            "vector_io",
            "search_similar",
            f"{len(output)}건 검색 완료 (filter={where})",
        )
        return output

    except chroma_errors.InvalidDimensionException as e:
        log_error("vector_io", "search_similar", f"차원 불일치 오류: {e}", exc=e)
        return []
    except Exception as e:
        log_error("vector_io", "search_similar", f"검색 실패: {e}", exc=e)
        return []