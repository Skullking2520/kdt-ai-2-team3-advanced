# 조건에 따라 chroma / pinecone을 주입하는 서비스 객체
# config.py나 .env의 환경변수를 읽어와, 로컬이면 ChromaClient를, 
# 운영이면 PineconeClient를 반환하는 구조를 짭니다.

from functools import lru_cache

from ..config.settings import settings
from .chroma_client import ChromaClient
from .pinecone_client import PineconeClient
from ..models.embeddings import get_embedding_model

@lru_cache(maxsize=1)
def get_vector_db():
    # 1. 공통으로 사용할 임베딩 모델을 먼저 생성합니다.
    embedding_model = get_embedding_model()
    
    # 2. 환경에 맞는 Vector DB 클라이언트에 임베딩 모델을 인수로 넘겨줍니다.
    if settings.APP_ENV == "production":
        return PineconeClient(
            api_key=settings.PINECONE_API_KEY,
            index_name=settings.PINECONE_INDEX,
            embedding_model=embedding_model  # 인터페이스에 맞게 주입
        )
    else:
        return ChromaClient(
            persistent_directory=settings.CHROMA_DB_DIR,
            embedding_model=embedding_model,  # 인터페이스에 맞게 주입
            collection_name=settings.CHROMA_COLLECTION_NAME,
        )
