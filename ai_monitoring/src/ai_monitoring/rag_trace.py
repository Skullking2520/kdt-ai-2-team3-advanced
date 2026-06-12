"""
Langfuse Python SDK v4 - Context Manager 방식 RAG 파이프라인 모니터링

RAG 팀과 합칠 때:
    - mock-vector-search()를 실제 벡터 db 호출 함수로 교체
    - assemble_context(): 실제 리랭킹 / 컨텍스트 조합 로직으로 교체
    각 with 블록이 독립 span이므로 단계별 지연 시간을 대시보드에서 시각적으로 확인 가능

    Trace 구조:
    rag-pipeline
    |- vector-retrieval <- 자식 span (as_type="retriever")
    |- context-aseebly <- 자식 span
    |- rag-answer-generation <- 자식 generation
"""
import os
import time
import random
from langfuse import get_client, propagate_attributes
from openai import OpenAI
from ai_monitoring.config import settings

# 환경변수로 Langfuse 클라이언트 자동 초기화
os.environ.setdefault("LANGFUSE_PUBLIC_KEY", settings.langfuse_public_key)
os.environ.setdefault("LANGFUSE_SECRET_KEY", settings.langfuse_secret_key)
os.environ.setdefault("LANGFUSE_BASE_URL", settings.langfuse_base_url)

# singleton client
langfuse = get_client()
openai_client = OpenAI(api_key=settings.openai_api_key)

def run_rag_pipeline(user_query: str) -> str:
    # root span
    with langfuse.start_as_current_observation(
        as_type="span",
        name="practice-rag-pipeline",
        input={"user_query": user_query},
        metadata={"environment": "dev", "pipeline_version": "v1"},
    ) as root_span:
        
        with propagate_attributes(
            tags=["rag", "simulation"]
        ):
            # span 1 : 모의 벡터 검색
            with langfuse.start_as_current_observation(
                as_type="retriever",
                name="vector-retrieval(mock)",
                input={"query": user_query, "top_k": 3},
                metadata={"vector_db": "mock-pinecone"},
            ) as retrieval_span:
                time.sleep(0.15) # 벡터 db 쿼리 탐색 지연 시뮬
                retrieved_docs = [
                    {
                        "doc_id": f"doc-{i}",
                        "content": f"{i+1}명이 최근 모바일 청첩장 사기 신고에 당했다는 뉴스",
                        "score": round(random.uniform(0.70, 0.99), 3),
                    }
                    for i in range(3)
                ]
                retrieval_span.update(
                    output={
                        "documents": retrieved_docs,
                        "retrieved_count": len(retrieved_docs)
                    }
                )

            # span 2: 컨텍스트 조합
            with langfuse.start_as_current_observation(
                as_type="span",
                name="context-assembly",
                input={"doc_count": len(retrieved_docs)},
            ) as context_span:
                context = "\n\n".join(
                    f"[문서 {i+1}] {doc['content']}"
                    for i, doc in enumerate(retrieved_docs)
                )
                context_span.update(
                    output={"context_char_length": len(context)},
                    metadata={"doc_scores": [d["score"] for d in retrieved_docs]},
                )

            # Generation: 최종 답변 생성
            prompt = (
                f"Answer the question based on the below context "
                f"and answer briefly within 100 words\n\n"
                f"context:\n{context}\n\n"
                f"question: {user_query}"
            )
            with langfuse.start_as_current_observation(
                as_type="generation",
                name="rag-answer-generation",
                model="gpt-4o-mini",
                input=[{"role": "user", "content": prompt}],
                metadata={
                    "temperature": 0.3,
                    "retrieved_doc_count": len(retrieved_docs)
                },
            ) as generation:
                response = openai_client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.3,
                )
                answer = response.choices[0].message.content

                if not answer or answer is None:
                    answer = "no answer received"

                # response.usage가 None이 아닐 때만 값을 가져오고, None이면 0으로 처리
                usage = response.usage if response.usage is not None else None
                input_tokens = usage.prompt_tokens if usage else 0
                output_tokens = usage.completion_tokens if usage else 0

                generation.update(
                    output=answer,
                    # usage_details: 대시보드 비용 계산에 사용
                    usage_details={
                        "input": input_tokens,
                        "output": output_tokens
                    },
                    metadata={"finish_reason": response.choices[0].finish_reason},
                )

        # 루트 스팬에 최종 출력 기록
        root_span.update(output={"answer": answer})

    # force all pending spans and events to Langfuse API
    langfuse.flush()

    print(f"Retrieved    : {len(retrieved_docs)}개 문서")
    print(f"Answer       : {answer}")
    print(f"Dashboard    : {settings.langfuse_base_url}")

    return answer


if __name__ == "__main__":
# check langfuse verification to langfuse cloud
    if langfuse.auth_check():
        print("Langfuse client is authenticated and ready!!")
    else:
        print("Authentication failed. Please check your credentials and host.")
    
    user_query = "explain why this korean message is smishing: " \
    "[모바일 청첩장] 두 사람의 새로운 출발을 축복해 주세요. 모바일 보기 [URL]"

    run_rag_pipeline(user_query=user_query)