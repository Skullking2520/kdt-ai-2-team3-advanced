# 에이전트 전용 검색 도구 (rag tool 등, 선택)
from langchain_core.tools import tool
from ..vectordb.service import get_vector_db

# 1. 순수 파이썬 함수로 로직을 먼저 정의합니다.
def _search_zeroday_logic(query: str) -> str:
    db = get_vector_db()
    results = db.similarity_search(query, k=3)
    return "\n\n".join([doc["page_content"] for doc in results])

# 2. 에이전트(LLM)에게 전달할 툴 객체는 위 함수를 감싸서 만듭니다.
@tool
def search_zeroday_smishing_pattern(query: str) -> str:
    """ 벡터 db에서 제로데이 스미싱 패턴을 검색합니다. """
    return _search_zeroday_logic(query)
