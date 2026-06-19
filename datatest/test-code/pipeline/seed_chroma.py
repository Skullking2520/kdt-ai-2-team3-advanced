"""ChromaDB에 검증된 스미싱 사례 시드 데이터 적재.

통합 테스트의 Stage 4(유사 사례 검색)에서 검색 대상이 됨.
실행:
uv run python -m pipeline.seed_chroma
"""

from pipeline.vector_io import upsert_cases


SEED_CASES = [
    {
        "id": "case_kisa_2025_001",
        "document": "본인인증 위해 첨부 링크 클릭 바랍니다",
        "metadata": {
            "source": "kisa", "category": "본인인증사칭",
            "collected_at": "2025-01-15", "verified": True,
        },
    },
    {
        "id": "case_kisa_2025_002",
        "document": "택배 배송 주소가 불일치합니다 확인 바람",
        "metadata": {
            "source": "kisa", "category": "택배사칭",
            "collected_at": "2025-02-10", "verified": True,
        },
    },
    {
        "id": "case_kisa_2025_003",
        "document": "축하합니다 100만원 당첨 지급 확인하세요",
        "metadata": {
            "source": "kisa", "category": "당첨사칭",
            "collected_at": "2025-03-05", "verified": True,
        },
    },
    {
        "id": "case_kisa_2025_004",
        "document": "긴급 본인 확인이 필요합니다 즉시 인증해주세요",
        "metadata": {
            "source": "kisa", "category": "본인인증사칭",
            "collected_at": "2025-04-12", "verified": True,
        },
    },
    {
        "id": "case_openphish_2025_001",
        "document": "결제 승인 본인 아닐 시 즉시 연락 바람",
        "metadata": {
            "source": "openphish", "category": "결제사칭",
            "collected_at": "2025-05-20", "verified": True,
        },
    },
]


def main() -> None:
    print(f"ChromaDB 시드 데이터 {len(SEED_CASES)}건 적재")

    upsert_cases(
        ids=[c["id"] for c in SEED_CASES],
        documents=[c["document"] for c in SEED_CASES],
        metadatas=[c["metadata"] for c in SEED_CASES],
    )

    print("[OK] 시드 데이터 적재 완료")


if __name__ == "__main__":
    main()
