# 추상화 레이어 (vectordb interface 정의)
# langgraph node가 어떤 db인지 신경쓰지 않게 만듭니다.

from abc import ABC, abstractmethod
from typing import List, Dict, Any

class BaseVectorDB(ABC):
    @abstractmethod
    def add_documents(self, documents: List[Any], metadatas: List[Dict] | None = None) -> None:
        """ 문서 및 메타데이터 저장 """

    def upsert_documents(
        self,
        documents: List[str],
        metadatas: List[Dict] | None = None,
        ids: List[str] | None = None,
    ) -> None:
        """문서 및 메타데이터를 저장하거나 갱신한다."""
        self.add_documents(documents=documents, metadatas=metadatas)
    
    @abstractmethod
    def similarity_search(self, query: str, k: int = 4) -> List[Dict[str, Any]]:
        """ 유사도 검색 진행 """
        pass
