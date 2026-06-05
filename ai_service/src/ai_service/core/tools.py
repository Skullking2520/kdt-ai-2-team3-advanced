# 에이전트 전용 검색 도구 (rag tool 등, 선택)
from langchain_core.tools import tool
from ..vectordb.service import get_vector_db

@tool
def search_zeroday_smishing_pattern(query: str) -> str:
    """ 벡터 db에서 제로데이 스미싱 패턴을 검색합니다. """
    db = get_vector_db()
    results = db.similarity_search(query, k=3)

    # 결과를 텍스트 하나로 병합하여 반환
    return "\n\n".join([doc["page_content"] for doc in results])
