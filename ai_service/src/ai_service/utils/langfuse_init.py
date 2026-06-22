# langfuse 기동에 필요한 환경변수 세팅을 함수로 추상화
import os
from uuid import uuid4
from typing import Any

from langfuse import get_client, observe, propagate_attributes

from ..config.settings import settings


def load_langfuse_env_variable() -> None:
    """환경변수 기반 Langfuse 클라이언트를 초기화합니다."""
    os.environ.setdefault("LANGFUSE_PUBLIC_KEY", settings.LANGFUSE_PUBLIC_KEY)
    os.environ.setdefault("LANGFUSE_SECRET_KEY", settings.LANGFUSE_SECRET_KEY)
    os.environ.setdefault("LANGFUSE_BASE_URL", settings.LANGFUSE_BASE_URL)

    os.environ.setdefault("OPENAI_API_KEY", settings.OPENAI_API_KEY)
    os.environ.setdefault("HF_XET_HIGH_PERFORMANCE", str(settings.HF_XET_HIGH_PERFORMANCE))


def init_langfuse_client() -> Any:
    load_langfuse_env_variable()
    return get_client()


langfuse_client = init_langfuse_client()


def get_langfuse_client() -> Any:
    return langfuse_client


def make_langfuse_session_attributes(endpoint_name: str, extra_metadata: dict[str, str] | None = None) -> dict[str, Any]:
    session_id = f"{endpoint_name}-{uuid4().hex[:12]}"
    result = {
        "user_id": "ai_service_api",
        "session_id": session_id,
        "tags": ["ai-service", endpoint_name, settings.APP_ENV],
        "metadata": {
            "app_env": settings.APP_ENV,
            "endpoint": endpoint_name,
            "base_url": settings.OLLAMA_BASE_URL,
        },
    }
    if extra_metadata:
        result["metadata"].update({str(k): str(v) for k, v in extra_metadata.items()})
    return result
