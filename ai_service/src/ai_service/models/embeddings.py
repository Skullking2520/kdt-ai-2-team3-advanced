# 로컬 (huggingface / ollama) 및 운영용 임베딩 설정
from pydantic import SecretStr
from ..config.settings import settings

def get_embedding_model():
    """설정에 맞는 임베딩 모델 객체를 생성하여 반환합니다."""
    # TODO: 차후 **kwargs로 추가 설정값 지원
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