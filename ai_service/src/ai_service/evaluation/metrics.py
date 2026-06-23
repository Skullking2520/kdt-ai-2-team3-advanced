# ragas에서 사용할 평가 메트릭
# ragas 0.3.x에서 사용할 메트릭 클래스 명시적 임포트
from ragas.metrics import Faithfulness, AnswerSimilarity, ContextRecall
from ragas.llms import LangchainLLMWrapper
from ragas.embeddings import LangchainEmbeddingsWrapper
from pydantic import SecretStr

from ..models.embeddings import get_embedding_model
from ..config.settings import settings


def _get_evaluator_llm():
    """평가용 LLM 인스턴스를 환경 설정에 따라 동적으로 생성합니다."""
    provider = settings.EVALUATOR_LLM_PROVIDER.lower()
    
    if provider == "openai":
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=settings.EVALUATOR_MODEL_NAME,
            temperature=settings.EVALUATOR_TEMPERATURE,
            api_key=SecretStr(settings.OPENAI_API_KEY)
        )
    
    elif provider == "ollama":
        from ..models.client import get_ollama_llm
        return get_ollama_llm(
            model_name=settings.EVALUATOR_MODEL_NAME,
            temperature=settings.EVALUATOR_TEMPERATURE,
            num_ctx=settings.OLLAMA_NUM_CTX,
            num_predict=settings.OLLAMA_NUM_PREDICT,
            base_url=settings.OLLAMA_BASE_URL
        )
    
    elif provider == "huggingface":
        # HuggingFace는 LLM 평가용으로 일반적이지 않지만 확장성을 위해 포함
        #from langchain_huggingface import HuggingFacePipeline
        raise NotImplementedError(
            "HuggingFace LLM 평가는 아직 지원되지 않습니다. openai 또는 ollama를 사용하세요."
        )
    
    else:
        raise ValueError(
            f"지원하지 않는 평가 LLM 프로바이더입니다: {provider}. "
            f"openai 또는 ollama를 사용하세요."
        )


def get_ragas_metrics():
    """
    평가용 메트릭들을 생성하여 반환합니다.
    
    Returns:
        list: [Faithfulness, ContextRecall, AnswerSimilarity] 메트릭 리스트
    """
    # 1. 환경 설정에 따라 평가 LLM 및 임베딩 모델 로드
    evaluator_llm = LangchainLLMWrapper(_get_evaluator_llm())
    evaluator_embeddings = LangchainEmbeddingsWrapper(get_embedding_model())

    # 2. 생성자 주입 방식으로 메트릭 선언
    faithfulness = Faithfulness(llm=evaluator_llm)
    context_recall = ContextRecall(llm=evaluator_llm)
    answer_similarity = AnswerSimilarity(
        embeddings=evaluator_embeddings
    )  # 생성된 답변과 정답(Ground Truth) 간의 의미적 유사도

    return [faithfulness, context_recall, answer_similarity]

