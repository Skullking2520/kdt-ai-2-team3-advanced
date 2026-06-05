# 싱글톤 패턴으로 node에서 하나의 llm만 호출하게끔 객체 고정
from ..models.client import get_ollama_llm
# 파이썬은 모듈을 처음 임포트할 때 메모리에 한 번만 로드하고 캐싱합니다.
# 모듈이 로드될 때 단 한 번만 생성됩니다.
# todo: 환경변수로 바꾸기 (양자화)
_DEFAULT_MODEL = "qwen2.5:7b"

singleton_llm = get_ollama_llm(
                    model_name="my-custom-qwen",
                    temperature=0.0,
                    num_predict=1024, # max_token_generation
                    num_ctx=8192  # Ollama 기본값은 2048(2k)로 매우 작습니다.
                    # 컨텍스트 윈도우(num_ctx) 확장
                )

def get_singleton_llm(model_name: str = _DEFAULT_MODEL):
    """ 기본 모델 요청 시 싱글톤 객체를 반환하고, 다른 모델 요청 시에만 새 객체 생성 """
    if model_name == _DEFAULT_MODEL:
        return singleton_llm
    return get_ollama_llm(model_name=model_name)