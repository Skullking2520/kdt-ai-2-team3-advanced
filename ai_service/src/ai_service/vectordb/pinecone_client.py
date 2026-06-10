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
            # 텍스트를 벡터로 변환
            embedding = self.embedding_model.embed_query(doc)
            doc_id = f"doc_{i}_{sha1(doc.encode('utf-8')).hexdigest()}"
            # 메타데이터 준비 (Pinecone은 원본 텍스트를 주로 메타데이터에 저장함)
            meta = metadatas[i] if metadatas else {}
            meta["text"] = doc  # 유사도 검색 후 원본 텍스트 복원을 위해 저장 필수
            
            vectors_to_upsert.append({
                "id": doc_id,
                "values": embedding,
                "metadata": meta
            })
            
        # Pinecone에 데이터 업로드
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
            metadata = match.get("metadata", {})
            # add_documents에서 넣어둔 원본 텍스트 추출
            page_content = metadata.pop("text", "") 
            
            formatted_results.append({
                "page_content": page_content,
                "metadata": metadata,
                "score": match.get("score")  # Pinecone은 코사인 유사도 등 높을수록 유사함
            })
        return formatted_results
