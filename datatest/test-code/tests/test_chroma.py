"""
ChromaDB + ko-sroberta 임베딩 동작 확인 스크립트.

실행:
    uv run python test_chroma.py

처음 실행 시 임베딩 모델 다운로드(수백 MB)로 시간이 좀 걸린다.
두 번째부터는 캐시 사용 → 빠름.
"""

import chromadb
from sentence_transformers import SentenceTransformer


def main() -> None:
    print("1. 임베딩 모델 로드 중... (처음이면 다운로드, 수백 MB)")
    model = SentenceTransformer("jhgan/ko-sroberta-multitask")
    print(f"   완료. 차원: {model.get_sentence_embedding_dimension()}")

    print("\n2. ChromaDB 클라이언트 생성 (PersistentClient → ./chroma_db/)")
    client = chromadb.PersistentClient(path="./chroma_db")

    print("\n3. 컬렉션 생성 또는 가져오기 (cosine 거리)")
    collection = client.get_or_create_collection(
        name="smishing_cases",
        metadata={"hnsw:space": "cosine"},
    )

    print("\n4. 샘플 사례 3건 적재")
    texts = [
        "본인인증 위해 첨부 링크 클릭 바랍니다",
        "택배 배송 주소가 불일치합니다 확인 바람",
        "축하합니다 100만원 당첨 지급 확인하세요",
    ]
    embeddings = model.encode(texts).tolist()

    # upsert로 호출하면 같은 ID 재실행해도 에러 없음
    collection.upsert(
        ids=["case_001", "case_002", "case_003"],
        embeddings=embeddings,
        documents=texts,
        metadatas=[
            {"category": "본인인증사칭", "source": "sample"},
            {"category": "택배사칭", "source": "sample"},
            {"category": "당첨사칭", "source": "sample"},
        ],
    )
    print(f"   적재 완료. 컬렉션 내 총 건수: {collection.count()}")

    print("\n5. 유사도 검색")
    query = "본인 확인이 필요합니다 링크 눌러주세요"
    query_emb = model.encode([query]).tolist()
    results = collection.query(query_embeddings=query_emb, n_results=3)

    print(f"\n   쿼리: {query}")
    print("   결과 (거리 작을수록 유사):")
    for doc, dist, meta in zip(
        results["documents"][0],
        results["distances"][0],
        results["metadatas"][0],
    ):
        print(f"   - [{meta['category']}] {doc}  (거리: {dist:.3f})")

    print("\n[OK] ChromaDB + ko-sroberta 동작 확인 완료.")


if __name__ == "__main__":
    main()
