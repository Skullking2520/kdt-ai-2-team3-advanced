"""
Langfuse 기본 추적 테스트
- Trace: 하나의 사용자 요청 전체
- Span: Trace 내 개별 처리 단계 (사전적 의미: 범위나 공간)
- Generation: LLM 호출 1회 (토큰 수, 비용 자동 집계)

Langfuse python sdk v4 - context manager 방식 기본 추적 테스트
("함수 내부의 특정 '일부분'이나 조건부 영역만 세밀하게 제어하고 싶을 때")

(참고로 상황에 따라 기존에 잘 작동하고 있는 파이썬 함수 위에 딱 한 줄만 추가하여 내부 로직을 트레이싱하기
위해 @observe나 start_observation() 수동 관리로 "코드 블록에 갇히지 않고, 생명 주기를 수동으로 완전히 통제해야 할 때
사용법이 나뉠 수 있습니다.)

공식 문서 기준 context manager 패턴:
    - get_client(): 싱글턴 langfuse 클라이언트 획득
    - start_as_current_observation(as_type="span"|"generation",...)
    - span.update(...): 블록 내부에서 값 기록
    - propagate_attibutes(): user_id, session_id 등 Trace 레벨 속성 전파
    - langfuse.flush(): 단기 실행 스크립트 종료 전 버퍼 강제 전송 
    (앱에서는 langfuse.shutdown()을 씀, flush가 포함됨)
"""
import os
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

def run_basic_pipeline(user_query: str) -> str:
    """
    Trace 구조 (대시보드에서 확인)
    basic-qa-pipeline <- 루트 span (Trace 진입점)
    |--- query-preprocessing <- 자식 Span
    |--- openai-chat-completion <- 자식 Generation (토큰 / 비용 집계)
    """

    # -- 루트 span: 전체 파이프라인을 감싸는 Trace 진입점
    with langfuse.start_as_current_observation(
        as_type="span",
        name="basic-qa-pipeline",
        input={"user_query": user_query},
        metadata={"environment": "dev", "version": "0.1.0"},
    ) as root_span:
        # propagate_attributes: user_id / session_id를 Trace 레벨에 전파
        with propagate_attributes(
            user_id="openLeeWorld",
            session_id="kdt_team3_session_001",
            tags=["test", "basic"]
        ):
            # 자식 span1: 전처리
            with langfuse.start_as_current_observation(
                as_type="span",
                name="query-processing",
                input={"raw_query": user_query}
            ) as preprocess_span:
                processed_query = user_query.strip()
                preprocess_span.update(
                    output={"processed_query": processed_query},
                    metadata={
                        "stripped_chars": 
                            len(user_query) - len(processed_query)
                    }
                )
            
            # 자식 Generation 호출: llm call
            # as_type: generation시 토큰 사용량 및 비용 자동 집계
            with langfuse.start_as_current_observation(
                as_type="generation",
                name="openai-chat-completion",
                model="gpt-4o-mini",
                input=[{"role": "user", "content": processed_query}],
                metadata={"temperature": 0.7}, 
            ) as generation:
                
                response = openai_client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[{"role": "user", "content": processed_query}],
                    temperature=0.7
                )
                answer = response.choices[0].message.content

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

    if not answer or answer is None:
        answer = "no answer received"

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

    run_basic_pipeline(user_query=user_query)






