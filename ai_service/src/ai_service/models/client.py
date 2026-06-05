# ollama / openai llm 인스턴스화
import os
from typing import Any, Optional
from langchain_ollama import ChatOllama
from ..config.settings import settings

def get_ollama_llm(
    model_name: str,
    temperature: float = 0.0,
    num_predict: int = 1024,
    **kwargs: Any
) -> ChatOllama:
    """
    Ollama LLM 인스턴스를 생성하여 반환하는 팩토리 함수입니다.

    Args:
        model_name(str): 사용할 Ollama 모델명 (예: "llama3.2", "qwen2.5:7b")
        temperature (float): 생성 다양성 조절 (기본값 0.0으로 일관된 답변 유도)
        num_predict (int): 최대 생성 토큰 수 (max_tokens 역할)
        **kwargs: 기타 ChatOllama에서 지원하는 추가 파라미터

    Returns:
        ChatOllama: Langgraph에서 바로 사용가능한 LLM 인스턴스 
    """
    # 환경변수나 설정 파일에서 ollama 주소를 가져옴 (기본값: 로컬 호스트)
    base_url = getattr(settings, "OLLAMA_BASE_URL", "http://localhost:11434")

    # 추가로 주입하고 싶은 기본 설정들을 딕셔너리로 취합
    llm_kwargs = {
        "model": model_name,
        "base_url": base_url,
        "temperature": temperature,
        "num_predict": num_predict,
        **kwargs # 사용자가 추가로 전달한 파라미터 병합 (예: top_p, num_ctx 등)
    }

    return ChatOllama(**llm_kwargs)

    