"""
심화 프로젝트 때 사용할 LLM(로컬 ollama, 운영 vllm) 
+ RAG (vectordb + langgraph) 코드를 둔다. 
랭그래프는 인코더가 스미싱 판별 시 llm-only의 일반 디코더 역할과 
스미싱 모호 판단시 llm-with-rag의 rag pipeline을 구성하는 용도로 사용한다.
"""
