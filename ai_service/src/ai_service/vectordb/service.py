# 조건에 따라 chroma / pinecone을 주입하는 서비스 객체
# config.py나 .env의 환경변수를 읽어와, 로컬이면 ChromaClient를, 
# 운영이면 PineconeClient를 반환하는 구조를 짭니다.

from ..config.settings import settings
from .chroma_client import ChromaClient
from .pinecone_client import PineconeClient
from pydantic import SecretStr

def get_embedding_model():
    """설정에 맞는 임베딩 모델 객체를 생성하여 반환합니다."""
    provider = settings.EMBEDDING_PROVIDER.lower()
    
    if provider == "openai":
        from langchain_openai import OpenAIEmbeddings
        return OpenAIEmbeddings(
            api_key=SecretStr(settings.OPENAI_API_KEY), 
            model=settings.EMBEDDING_MODEL_NAME
        )
        
    elif provider == "ollama":
        from langchain_ollama import OllamaEmbeddings
        return OllamaEmbeddings(
            base_url=settings.OLLAMA_BASE_URL,
            model=settings.EMBEDDING_MODEL_NAME
        )
        
    elif provider == "huggingface":
        from langchain_huggingface import HuggingFaceEmbeddings
        return HuggingFaceEmbeddings(
            model_name=settings.EMBEDDING_MODEL_NAME
        )
        
    else:
        raise ValueError(f"지원하지 않는 임베딩 프로바이더입니다: {provider}")

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
            embedding_model=embedding_model  # 인터페이스에 맞게 주입
        )
