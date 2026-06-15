# ragas에서 사용할 평가 메트릭
# ragas 0.3.x에서 사용할 메트릭 클래스 명시적 임포트
from ragas.metrics import Faithfulness, AnswerSimilarity, ContextRecall
from ragas.llms import LangchainLLMWrapper
from ragas.embeddings import LangchainEmbeddingsWrapper
from langchain_openai import ChatOpenAI

from ..models.embeddings import get_embedding_model

def get_ragas_metrics():
    # 1. ragas 표준 래퍼로 LLM 및 Embedding 감싸기 
    # todo: evaluator_llm을 환경변수로 주입받아서 변경하기?
    evaluator_llm = LangchainLLMWrapper(ChatOpenAI(model="gpt-4o-mini", temperature=0))
    evalutor_embeddings = LangchainEmbeddingsWrapper(get_embedding_model())

    # 2. 생성자 주입 방식으로 메트릭 선언
    faithfulness = Faithfulness(llm=evaluator_llm)
    context_recall = ContextRecall(llm=evaluator_llm)
    answer_similarity = AnswerSimilarity(
        embeddings=evalutor_embeddings
    ) # 생성된 답변과 정답(Ground Truth) 간의 의미적 유사도

    return [faithfulness, context_recall, answer_similarity]

