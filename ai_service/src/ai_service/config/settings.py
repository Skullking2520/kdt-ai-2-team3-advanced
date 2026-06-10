"""환경 변수 및 DB 선택 제어."""

from pathlib import Path

from dotenv import find_dotenv
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

_PARENT_DIRECTORY = Path(__file__).resolve().parents[1]

# 환경변수 읽어오는 설정
class Settings(BaseSettings):
    APP_ENV: str = Field(default="development")  # 개발/운영 환경

    # 파인콘
    PINECONE_API_KEY: str = Field(default="")  # 파인콘 api key
    PINECONE_INDEX: str = Field(default="")  # 파인콘 데이터를 담는 기본 단위

    # CHROMA DB
    CHROMA_DB_DIR: str = Field(default=str(_PARENT_DIRECTORY / "data" / "chroma_db"))
    CHROMA_COLLECTION_NAME: str = Field(default="zeroday_smishing_patterns")

    # 임베딩 설정 (예: "openai", "ollama", "huggingface")
    EMBEDDING_PROVIDER: str = Field(default="huggingface")
    EMBEDDING_MODEL_NAME: str = Field(default="jhgan/ko-sroberta-multitask")
    OPENAI_API_KEY: str = Field(default="")

    # Ollama LLM 설정
    OLLAMA_BASE_URL: str = Field(default="http://localhost:11434")
    OLLAMA_MODEL_NAME: str = Field(default="my-custom-qwen")
    OLLAMA_NUM_CTX: int = Field(default=8192)
    OLLAMA_NUM_PREDICT: int = Field(default=1024)

    # .env 파일 로드 설정 (pydantic v2 방식)
    model_config = SettingsConfigDict(
        env_file=find_dotenv(),  # 루트 .env까지 찾아 올라감
        env_file_encoding="utf-8",
        extra="ignore",  # .env에 다른 변수가 더 있어도 에러 내지 않고 무시
    )

    
# 전역 설정 객체 생성
settings = Settings()
