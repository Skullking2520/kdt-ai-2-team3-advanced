from hashlib import sha1
from pathlib import Path
from typing import List, Dict, Any

import chromadb
from chromadb.api.types import Metadata
from .base import BaseVectorDB 

class ChromaClient(BaseVectorDB):
    def __init__(self, persistent_directory: str, embedding_model: Any, collection_name: str = "default_collection"):
        Path(persistent_directory).mkdir(parents=True, exist_ok=True)
        self.client = chromadb.PersistentClient(path=persistent_directory)
        self.collection = self.client.get_or_create_collection(name=collection_name)
        # LangChain 임베딩 객체를 내부 변수로 저장
        self.embedding_model = embedding_model 

    def add_documents(self, documents: List[str], metadatas: List[Metadata] | None = None) -> None:
        self.upsert_documents(documents=documents, metadatas=metadatas)

    def upsert_documents(
        self,
        documents: List[str],
        metadatas: List[Metadata] | None = None,
        ids: List[str] | None = None,
    ) -> None:
        if not documents:
            return

        if ids is None:
            ids = [f"doc_{sha1(doc.encode('utf-8')).hexdigest()}" for doc in documents]

        if len(ids) != len(documents):
            raise ValueError("ids 길이는 documents 길이와 같아야 합니다.")

        # metadatas가 None일 때 타입을 명확히 선언 (Dict[str, Any] 또는 Dict[str, str | int | float | bool])
        if metadatas is None:
            valid_metadatas: List[Metadata] = [{} for _ in documents]
        else:
            valid_metadatas: List[Metadata] = metadatas

        if len(valid_metadatas) != len(documents):
            raise ValueError("metadatas 길이는 documents 길이와 같아야 합니다.")

        # Chroma 컬렉션의 기본 embedding_function에 의존하지 않고 서비스 설정 모델을 명시적으로 사용한다.
        embeddings = [self.embedding_model.embed_query(doc) for doc in documents]
    
        self.collection.upsert(
            embeddings=embeddings, # 임베딩 벡터 직접 주입,
            documents=documents,
            metadatas=valid_metadatas, # Unknown이 해결된 변수 전달
            ids=ids
        )

    def similarity_search(self, query: str, k: int = 4) -> List[Dict[str, Any]]:
        query_embedding = self.embedding_model.embed_query(query)
        results = self.collection.query(
            query_embeddings=[query_embedding],
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
