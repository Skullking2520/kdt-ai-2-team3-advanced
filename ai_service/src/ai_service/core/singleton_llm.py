from ..models.client import get_llm
from ..config.settings import settings
from ..utils.is_prod import is_prod

_DEFAULT_MODEL = ""
if is_prod:
    _DEFAULT_MODEL = settings.VLLM_MODEL_NAME
else:
    _DEFAULT_MODEL = settings.OLLAMA_MODEL_NAME

# 환경에 따라 추가 파라미터 분기 처리 (Ollama 컨텍스트 크기 확장용)
additional_kwargs = {}

if not is_prod:
    additional_kwargs["num_ctx"] = settings.OLLAMA_NUM_CTX

# 1. 기본 싱글톤 LLM 인스턴스
singleton_llm = get_llm(
    model_name=_DEFAULT_MODEL,
    temperature=0.0,
    max_tokens=settings.OLLAMA_NUM_PREDICT,
    json_mode=False,
    **additional_kwargs
)

# 2. JSON 모드 전용 싱글톤 LLM 인스턴스
singleton_json_llm = get_llm(
    model_name=_DEFAULT_MODEL,
    temperature=0.0,
    max_tokens=settings.OLLAMA_NUM_PREDICT,
    json_mode=True,
    **additional_kwargs
)

def get_singleton_llm(model_name: str = _DEFAULT_MODEL):
    """기본 모델 요청 시 싱글톤 객체를 반환하고, 다른 모델 요청 시에만 새 객체 생성"""
    if model_name == _DEFAULT_MODEL:
        return singleton_llm
    return get_llm(model_name=model_name)

def get_singleton_json_llm(model_name: str = _DEFAULT_MODEL):
    """JSON mode가 필요한 최종 응답 노드용 LLM을 반환한다."""
    if model_name == _DEFAULT_MODEL:
        return singleton_json_llm
    return get_llm(model_name=model_name, json_mode=True)