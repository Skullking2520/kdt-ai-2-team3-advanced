# AI Monitoring

`ai_monitoring/`은 Langfuse로 LLM과 RAG 호출을 관찰하는 실험 코드 모음이다.
서비스 요청을 직접 처리하지 않으며, 운영 서비스의 추론 경로는 `backend/`와
`ai_service_deploy/`를 기준으로 확인한다.

## 포함된 예제

| 파일 | 내용 |
| --- | --- |
| `basic_trace.py` | 단일 LLM 호출을 Langfuse trace, span, generation으로 기록하는 예제 |
| `rag_trace.py` | 모의 검색·컨텍스트 조합·LLM 호출을 각각 기록하는 RAG trace 예제 |
| `config.py` | Langfuse와 OpenAI 설정 로드 |

`rag_trace.py`의 검색 결과는 모의 데이터다. 실제 Pinecone 또는 Chroma 검색과 연결하려면
해당 부분을 서비스의 검색 함수로 교체해야 한다.

## 실행 전 설정

로컬 `.env`에 아래 값을 설정한다. 이 파일은 Git에 올리지 않는다.

```env
LANGFUSE_PUBLIC_KEY=
LANGFUSE_SECRET_KEY=
LANGFUSE_BASE_URL=
OPENAI_API_KEY=
```

현재 예제는 OpenAI 호출을 사용하므로 실행 비용과 호출 한도를 확인한 뒤 사용한다.

## 실행

프로젝트 루트에서 실행한다.

```bash
uv run --package ai-monitoring python -m ai_monitoring.basic_trace
uv run --package ai-monitoring python -m ai_monitoring.rag_trace
```

실행 후 Langfuse 대시보드에서 trace, 지연 시간, 토큰 사용량을 확인할 수 있다.

## 운영 적용 시 확인할 점

- 문자 원문, 전화번호, URL, OCR 텍스트 등 민감 정보가 trace에 그대로 남지 않도록 마스킹한다.
- API 오류와 timeout도 trace에 기록하되, secret이나 인증 헤더는 기록하지 않는다.
- 모의 검색 예제를 실제 RAG 호출로 바꾼 뒤에는 검색 문서 수, 검색 지연 시간, LLM 응답 시간을 함께 기록한다.
