"""환경 변수 및 DB 선택 제어."""

from pathlib import Path

from dotenv import find_dotenv
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

_PARENT_DIRECTORY = Path(__file__).resolve().parents[1]

# 환경변수 읽어오는 설정
class Settings(BaseSettings):
    APP_ENV: str = Field(default="development")  # 개발/운영 환경

    # langfuse .env key
    LANGFUSE_PUBLIC_KEY: str = Field(default="")
    LANGFUSE_SECRET_KEY: str = Field(default="")
    LANGFUSE_BASE_URL: str = Field(default="https://jp.cloud.langfuse.com")

    # openai api key 
    OPENAI_API_KEY: str = Field(default="")

    # 파인콘
    PINECONE_API_KEY: str = Field(default="")  # 파인콘 api key
    PINECONE_INDEX: str = Field(default="")  # 파인콘 데이터를 담는 기본 단위

    # CHROMA DB
    CHROMA_DB_DIR: str = Field(default=str(_PARENT_DIRECTORY / "data" / "chroma_db"))
    CHROMA_COLLECTION_NAME: str = Field(default="zeroday_smishing_patterns")

    # 임베딩 설정 (예: "openai", "ollama", "huggingface")
    EMBEDDING_PROVIDER: str = Field(default="huggingface")
    EMBEDDING_MODEL_NAME: str = Field(default="jhgan/ko-sroberta-multitask")

    # Ollama LLM 설정 (운영용)
    OLLAMA_BASE_URL: str = Field(default="http://localhost:11434")
    OLLAMA_MODEL_NAME: str = Field(default="")
    OLLAMA_NUM_CTX: int = Field(default=8192)
    OLLAMA_NUM_PREDICT: int = Field(default=1024)

    # 평가 LLM 설정 (ragas 메트릭 계산용)
    EVALUATOR_LLM_PROVIDER: str = Field(default="openai")  # openai, ollama, huggingface 중 선택
    EVALUATOR_MODEL_NAME: str = Field(default="gpt-4o-mini")  # openai: gpt-4o-mini, ollama: 모델명 등
    EVALUATOR_TEMPERATURE: float = Field(default=0.0)

    # 평가 배치 처리 설정
    EVALUATION_BATCH_SIZE: int = Field(default=10)  # 한 번에 평가할 데이터 수
    EVALUATION_MAX_CONCURRENT_REQUESTS: int = Field(default=3)  # 동시 요청 수
    EVALUATION_REQUEST_TIMEOUT: int = Field(default=60)  # 단일 요청 타임아웃(초)
    EVALUATION_RETRY_COUNT: int = Field(default=2)  # 실패 시 재시도 횟수
    EVALUATION_RETRY_DELAY: int = Field(default=5)  # 재시도 대기 시간(초)
    EVALUATION_MAX_ITEMS: int = Field(default=0)  # 0 = 제한 없음, N > 0 = N개까지만 평가
    EVALUATION_COST_LIMIT_DOLLARS: float = Field(default=0.0)  # 0.0 = 제한 없음
    EVALUATION_SKIP_ON_ERROR: bool = Field(default=True)  # True = 오류 발생 시 스킵하고 계속, False = 중단

    HF_XET_HIGH_PERFORMANCE: int = Field(default=1)
    
    # 모델 vllm 배포 
    OPENAI_API_BASE: str = Field(default="")
    VLLM_MODEL_NAME: str = Field(default="Qwen/Qwen2.5-7B-Instruct-AWQ")

    # .env 파일 로드 설정 (pydantic v2 방식)
    model_config = SettingsConfigDict(
        env_file=find_dotenv(),  # 루트 .env까지 찾아 올라감
        env_file_encoding="utf-8",
        # Modal Secret이 주입한 시스템 환경변수를 에러 없이 곧바로 읽어옵니다.
        env_ignore_empty=True,
        extra="ignore",  # .env에 다른 변수가 더 있어도 에러 내지 않고 무시
    )

    
# 전역 설정 객체 생성
settings = Settings()
