"""사례 메타데이터 생성 헬퍼.

vector_io.upsert_cases()에 넘길 메타 dict를 일관되게 만들기 위한 헬퍼.
호출하는 쪽이 키를 빠뜨리지 않게 함수가 강제로 모든 필수 키를 채움.

[사용 예]
    from .meta_builder import build_case_metadata

    meta = build_case_metadata(
        source="crawling_kr",
        security_type="스미싱",
        language="ko",
        original_doc_id="doc-uuid-abc",
        doc_version="v2.1",
        pipeline_version="p-0.4.0",
        collected_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
        # 추출 플래그는 모두 키워드 인자로
        has_url=1,
        has_phone=0,
        has_money=1,
        has_account=1,
        special_keyword_count=2,
        # 선택 필드
        source_url="https://boannews.com/article/123",
    )
    upsert_cases(ids=[...], documents=[...], metadatas=[meta])
"""
from datetime import datetime
from typing import Literal, Optional


# vector_io.py의 ALLOWED_* 상수와 일치해야 함. 분리되어 있지만 동기화 유지.
Source = Literal["train_data", "crawling_kr", "crawling_foreign", "user_input"]
SecurityType = Literal["스미싱", "피싱", "보이스피싱", "zero-day", "악성앱"]
Language = Literal["ko", "en"]


def build_case_metadata(
    *,
    # 필수 ─ 출처·분류
    source: Source,
    security_type: SecurityType,
    language: Language,

    # 필수 ─ 문서 식별·버전
    original_doc_id: str,
    doc_version: str,
    pipeline_version: str,

    # 필수 ─ 시간
    collected_at: datetime,
    updated_at: datetime,

    # 필수 ─ 추출 플래그 (모두 명시 강제)
    has_url: int,
    has_phone: int,
    has_money: int,
    has_account: int,
    special_keyword_count: int,

    # 선택
    chunk_idx: int = 0,
    source_url: Optional[str] = None,
    question: Optional[str] = None,
    ground_truth: Optional[str] = None,
) -> dict:
    """ChromaDB 메타데이터 dict를 생성. 모든 필수 키를 강제로 채움.

    Args:
        모든 필수 필드는 키워드 전용(*). 위치 인자로 못 넘김 → 호출부 가독성 강제.
        has_* 플래그는 모두 명시 필수 — 새 플래그 추가 시 호출부도 따라옴.

    Returns:
        vector_io.upsert_cases()에 그대로 넘길 수 있는 dict.

    Raises:
        ValueError: has_* 플래그가 0/1이 아니거나, special_keyword_count가 음수일 때
    """
    # 가벼운 사전 검증 — vector_io의 _validate_metadata가 다시 검증하지만
    # 빠른 실패(fail-fast)로 호출부에 즉시 알려줌
    for name, val in [
        ("has_url", has_url),
        ("has_phone", has_phone),
        ("has_money", has_money),
        ("has_account", has_account),
    ]:
        if val not in (0, 1):
            raise ValueError(f"{name}={val}는 0 또는 1만 허용")
    if special_keyword_count < 0:
        raise ValueError(f"special_keyword_count={special_keyword_count}는 음수 불가")

    return {
        # 출처·분류
        "source": source,
        "security_type": security_type,
        "language": language,

        # 문서 식별·버전
        "chunk_idx": chunk_idx,
        "original_doc_id": original_doc_id,
        "source_url": source_url,
        "doc_version": doc_version,
        "pipeline_version": pipeline_version,

        # 평가용 (선택)
        "question": question,
        "ground_truth": ground_truth,

        # 시간 (ISO 8601 문자열로 변환)
        "collected_at": collected_at.isoformat(),
        "updated_at": updated_at.isoformat(),

        # 추출 결과 플래그
        "has_url": has_url,
        "has_phone": has_phone,
        "has_money": has_money,
        "has_account": has_account,
        "special_keyword_count": special_keyword_count,
    }
