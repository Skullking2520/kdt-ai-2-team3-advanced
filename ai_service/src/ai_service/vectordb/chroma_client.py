from typing import List, Dict, Any
import chromadb
from chromadb.api.types import Metadata
from .base import BaseVectorDB 

class ChromaClient(BaseVectorDB):
    def __init__(self, persistent_directory: str, embedding_model: Any, collection_name: str = "default_collection"):
        self.client = chromadb.PersistentClient(path=persistent_directory)
        self.collection = self.client.get_or_create_collection(name=collection_name)
        # LangChain 임베딩 객체를 내부 변수로 저장
        self.embedding_model = embedding_model 

    def add_documents(self, documents: List[str], metadatas: List[Metadata] | None = None) -> None:
        # 고유 ID 생성 (간단하게 인덱스 기반 문자열 사용)
        ids = [f"doc_{i}_{hash(doc)}" for i, doc in enumerate(documents)]

         # metadatas가 None일 때 타입을 명확히 선언 (Dict[str, Any] 또는 Dict[str, str | int | float | bool])
        if metadatas is None:
            valid_metadatas: List[Metadata] = [{} for _ in documents]
        else:
            valid_metadatas: List[Metadata] = metadatas

        # Chroma도 Pinecone처럼 텍스트를 직접 임베딩해서 넣는 방식으로 통일합니다.
        embeddings = [self.embedding_model.embed_query(doc) for doc in documents]
    
        self.collection.add(
            embeddings=embeddings, # 임베딩 벡터 직접 주입,
            documents=documents,
            metadatas=valid_metadatas, # Unknown이 해결된 변수 전달
            ids=ids
        )

    def similarity_search(self, query: str, k: int = 4) -> List[Dict[str, Any]]:
        results = self.collection.query(
            query_texts=[query],
            n_results=k
        )
        
        # 결과를 표준화된 List[Dict] 형태로 가공하여 반환
        formatted_results = []
        if results and results['documents']:
            # query_texts 변수가 리스트이므로 결과의 0번째 인덱스를 참조
            docs = results['documents'][0]
            metas = results['metadatas'][0] if results['metadatas'] else [{}] * len(docs)
            distances = results['distances'][0] if results['distances'] else [0.0] * len(docs)
            
            for doc, meta, dist in zip(docs, metas, distances):
                formatted_results.append({
                    "page_content": doc,
                    "metadata": meta,
                    "score": dist  # Chroma는 거리를 반환하므로 낮을수록 유사함
                })
        return formatted_results
