# langfuse기동에 필요한 환경변수 세팅을 함수로 추상화
import os
from ..config.settings import settings

def load_langfuse_env_variable():
    # 1. 환경변수로 Langfuse 클라이언트 자동 초기화
    os.environ.setdefault("LANGFUSE_PUBLIC_KEY", settings.LANGFUSE_PUBLIC_KEY)
    os.environ.setdefault("LANGFUSE_SECRET_KEY", settings.LANGFUSE_SECRET_KEY)
    os.environ.setdefault("LANGFUSE_BASE_URL", settings.LANGFUSE_BASE_URL)

    # 2. OpenAI 설정 (ChatOpenAI가 자동으로 읽는 키)
    os.environ.setdefault("OPENAI_API_KEY", settings.OPENAI_API_KEY)    

    os.environ.setdefault("HF_XET_HIGH_PERFORMANCE", str(settings.HF_XET_HIGH_PERFORMANCE))    