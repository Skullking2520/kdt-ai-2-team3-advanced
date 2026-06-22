from hashlib import sha1
from typing import List, Dict, Any

from pinecone import Pinecone

from .base import BaseVectorDB


class PineconeClient(BaseVectorDB):
    def __init__(self, api_key: str, index_name: str, embedding_model: Any):
        """
        embedding_model: .embed_query(text) 또는 호출 시 벡터를 반환하는 임베딩 모델 객체
                         (예: LangChain의 OpenAIEmbeddings 등)
        """
        self.pc = Pinecone(api_key=api_key)
        self.index = self.pc.Index(index_name)
        self.embedding_model = embedding_model

    def add_documents(self, documents: List[str], metadatas: List[Dict] | None = None) -> None:
        vectors_to_upsert = []

        for i, doc in enumerate(documents):
            embedding = self.embedding_model.embed_query(doc)
            doc_id = f"doc_{i}_{sha1(doc.encode('utf-8')).hexdigest()}"
            meta = metadatas[i] if metadatas else {}
            # 원본 텍스트를 메타데이터에 두 개 키로 보존하여 검색 복원 시 일관성을 높입니다.
            meta["text"] = doc
            meta["page_content"] = doc

            vectors_to_upsert.append({
                "id": doc_id,
                "values": embedding,
                "metadata": meta,
            })

        self.index.upsert(vectors=vectors_to_upsert)

    def similarity_search(self, query: str, k: int = 4) -> List[Dict[str, Any]]:
        # 쿼리 문장 임베딩 변환
        query_vector = self.embedding_model.embed_query(query)

        # 검색 수행 (메타데이터 포함 설정 필수)
        results = self.index.query(
            vector=query_vector,
            top_k=k,
            include_metadata=True
        )

        # 결과를 표준화된 List[Dict] 형태로 가공하여 반환
        formatted_results = []
        for match in results.get("matches", []):
            metadata = match.get("metadata") or {}
            
            page_content = (
                metadata.get("text")
                or metadata.get("page_content")
                or metadata.get("document")
                or metadata.get("content")
                or ""
            )
            if not page_content:
                # fallback for unexpected Pinecone metadata shapes
                page_content = metadata.get("source", "") or match.get("id", "")

            formatted_results.append({
                "page_content": page_content,
                "metadata": metadata,
                "score": match.get("score"),
            })

        return formatted_results
