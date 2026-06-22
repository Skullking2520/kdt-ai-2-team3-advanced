# LangGraph + Pinecone RAG LLM 모델 비교

## 1. 실험 목적
ai_service의 LangGraph + Pinecone RAG 구조에서 사용할 LLM 후보를 비교했다.

## 2. 실험 환경
- Graph: ai_service/src/ai_service/core
- VectorDB: Pinecone
- LLM 호출부: ChatOllama
- 평가 데이터: golden_dataset 5개
- 평가 방식: RAGAS
- 평가 지표: Faithfulness, ContextRecall, AnswerSimilarity
- 평가용 LLM: gpt-4o-mini
- 생성 모델: Ollama 기반 로컬 양자화 모델

## 3. 실험 결과

| Model | Faithfulness | ContextRecall | AnswerSimilarity | Note |
|---|---:|---:|---:|---|
| qwen2.5:7b | 0.4000 | 0.6000 | 0.7730 | 기준선 |
| llama3.1:8b | 0.1000 | 0.6000 | 0.5158 | 낮음 |
| mistral:7b | 0.1300 | 0.6000 | 0.5158 | 낮음 |
| qwen3:8b | 0.4100 | 0.6000 | 0.6459 | Faithfulness 최고 |
| qwen3.5:9b | 0.3867 | 0.6000 | 0.8617 | 종합 1순위 |
| exaone3.5:7.8b | 0.3345 | 0.6000 | 0.8387 | 한국어 후보 |
| qwen3:14b | 0.2600 | 0.6000 | 0.6993 | 크지만 느림 |

## 4. 해석
5개 smoke test 기준으로는 qwen3.5:9b가 AnswerSimilarity 0.8617로 가장 높고, Faithfulness도 0.3867로 안정적이었다. qwen2.5:7b는 기준선으로 안정적이며, qwen3:8b는 Faithfulness가 가장 높았다.

다만 현재 데이터셋이 5개로 작기 때문에 최종 결론이 아니라 1차 후보 선별 결과로 해석해야 한다. 이후 golden_dataset을 30~50개로 확장해 재평가가 필요하다.

## 5. 양자화 및 배포 관련 주의
본 실험은 Ollama에서 pull한 로컬 양자화 모델 기준이다. 이는 최종 배포 후보인 vLLM + AWQ와 동일한 실행 환경은 아니므로, 최종 배포 전에는 AWQ 체크포인트 기준 재검증이 필요하다.

## 6. 코드 수정 사항
- Pinecone metadata 원문 키가 `document`인 경우도 읽도록 `pinecone_client.py` 수정
- Qwen3 계열 `<think>` 출력 혼입 방지를 위해 prompt 및 JSON 후처리 보강
