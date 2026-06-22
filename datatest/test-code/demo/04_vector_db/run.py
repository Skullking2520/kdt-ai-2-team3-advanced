"""데모 04 — VectorDB (Pinecone) 적재 + 유사 검색

기능:
    - 샘플 스미싱 사례 2건 Pinecone 적재
    - 한국어 임베딩 모델: jhgan/ko-sroberta-multitask (768차원, cosine)
    - 임의 텍스트로 유사 사례 검색 (코사인 유사도)
    - 메타데이터 필터 검색 (has_url, has_phone 등)

실행:
    cd /path/to/test-code
    uv run python demo/04_vector_db/run.py
"""
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from pipeline.vector_io import upsert_cases, search_similar

NOW = datetime.now(timezone.utc).isoformat()

SAMPLE_CASES = [
    {
        "id": f"demo-{uuid.uuid4()}",
        "document": "[건강보험공단] 미환급금 87,000원이 있습니다. 아래 링크에서 신청하세요. http://hira-refund.kr/apply",
        "metadata": {
            "source":               "train_data",
            "security_type":        "스미싱",
            "language":             "ko",
            "chunk_idx":            0,
            "original_doc_id":      "demo-doc-001",
            "source_url":           "",
            "doc_version":          "v2.1",
            "pipeline_version":     "p-0.4.0",
            "collected_at":         NOW,
            "updated_at":           NOW,
            "has_url":              1,
            "has_phone":            0,
            "has_money":            1,
            "has_account":          0,
            "special_keyword_count": 2,
        },
    },
    {
        "id": f"demo-{uuid.uuid4()}",
        "document": "[국민은행] 본인 계좌 보안등급 하락. 즉시 인증 필요: 010-8234-5678",
        "metadata": {
            "source":               "train_data",
            "security_type":        "스미싱",
            "language":             "ko",
            "chunk_idx":            0,
            "original_doc_id":      "demo-doc-002",
            "source_url":           "",
            "doc_version":          "v2.1",
            "pipeline_version":     "p-0.4.0",
            "collected_at":         NOW,
            "updated_at":           NOW,
            "has_url":              0,
            "has_phone":            1,
            "has_money":            0,
            "has_account":          1,
            "special_keyword_count": 2,
        },
    },
]

SEARCH_QUERIES = [
    "건강보험 환급금 신청 링크",
    "은행 계좌 보안 인증",
    "택배 미수령 확인",
]


def main():
    print("=" * 60)
    print("데모 04 — VectorDB (Pinecone) 적재 + 검색")
    print("=" * 60)
    print()
    print("임베딩 모델: jhgan/ko-sroberta-multitask (768차원, cosine)")
    print()

    # 적재
    print("[1/3] 샘플 사례 2건 적재 중...")
    ids       = [c["id"] for c in SAMPLE_CASES]
    docs      = [c["document"] for c in SAMPLE_CASES]
    metadatas = [c["metadata"] for c in SAMPLE_CASES]
    upsert_cases(ids, docs, metadatas)
    print(f"      완료: {len(ids)}건")
    for doc in docs:
        print(f"        - {doc[:55]}...")
    print()

    # 유사도 검색
    print("[2/3] 유사 사례 검색")
    for query in SEARCH_QUERIES:
        print(f"\n  질의: \"{query}\"")
        results = search_similar(query, n_results=2)
        if not results:
            print("    결과 없음")
            continue
        for i, r in enumerate(results, 1):
            print(f"    [{i}] 유사도 {r['similarity']:.3f}  {r['document'][:55]}...")
    print()

    # 메타 필터 검색
    print("[3/3] 메타 필터 검색 (has_url=1)")
    results = search_similar("피싱 URL 클릭", n_results=3, where={"has_url": 1})
    print(f"      결과: {len(results)}건")
    for r in results:
        print(f"        유사도 {r['similarity']:.3f}  {r['document'][:55]}...")

    print()
    print("완료.")


if __name__ == "__main__":
    main()
