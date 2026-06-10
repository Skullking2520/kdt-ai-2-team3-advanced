# ragas에서 사용할 평가 메트릭
from ragas.metrics import answer_similarity, faithfulness, context_recall
from ragas.llms import LangchainLLMWrapper
from langchain_openai import ChatOpenAI

