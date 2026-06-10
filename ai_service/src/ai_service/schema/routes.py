from dataclasses import dataclass, asdict
from typing import Optional, Any

@dataclass
class OllamaStatus:
    ok: bool
    base_url: str
    model: str
    error: Optional[str] = None

@dataclass
class VectorDbStatus:
    provider: str
    chroma_dir: Optional[str]
    collection: str
    embedding_provider: str
    embedding_model: str

@dataclass
class HealthCheckResponse:
    status: str
    app_env: str
    ollama: OllamaStatus
    vectordb: VectorDbStatus

    @classmethod
    def from_env(cls, settings: Any, ollama_ok: bool, ollama_error: Optional[str]) -> "HealthCheckResponse":
        """설정값과 Ollama 상태를 받아 응답 객체를 생성하는 팩토리 함수입니다."""
        return cls(
            status="ok",
            app_env=settings.APP_ENV,
            ollama=OllamaStatus(
                ok=ollama_ok,
                base_url=settings.OLLAMA_BASE_URL,
                model=settings.OLLAMA_MODEL_NAME,
                error=ollama_error,
            ),
            vectordb=VectorDbStatus(
                provider="pinecone" if settings.APP_ENV == "production" else "chroma",
                chroma_dir=settings.CHROMA_DB_DIR,
                collection=settings.CHROMA_COLLECTION_NAME,
                embedding_provider=settings.EMBEDDING_PROVIDER,
                embedding_model=settings.EMBEDDING_MODEL_NAME,
            )
        )

    def to_dict(self) -> dict:
        return asdict(self)
