import pandas as pd
import datetime
import sys

from datasets import Dataset
from ragas import evaluate
from langfuse.langchain import CallbackHandler
from langchain_core.messages import HumanMessage
from langchain_core.runnables.config import RunnableConfig
from langfuse import get_client
from typing import Literal, Any, cast
from tqdm import tqdm

from ..core.state import SmishingGraphState
from ..core.graph import langgraph_app
from .metrics import get_ragas_metrics
from ..utils.rag_content import _build_user_content

class RAGGraphEvaluator:
    def __init__(self):
        # ragas 0.3.9 규격의 생성자 주입식 메트릭 리스트 로드
        self.metrics = get_ragas_metrics()
        self.graph = langgraph_app

    def _run_graph(self, question: str, ocr_text: str | None = None, route_override: Literal['zero_day', 'general'] | None = None) -> dict:
        """
        FastAPI 엔드포인트의 입력 구성 방식과 100% 호환되도록 구성된 그래프 실행 메서드
        """
        # 1. FastAPI 엔드포인트와 동일한 방식으로 user_content 및 초기 State 구성
        user_content = _build_user_content(question, ocr_text)
        state: SmishingGraphState = {"messages": [HumanMessage(content=user_content)]}
        
        if route_override:
            state["route_override"] = route_override

        # 현재 시간 기준 고유 ID 생성 (예: eval_20260609_125345)
        now_str = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_thread_id = f"langgraph_eval_{now_str}"

        # 2. Langfuse v4+ 콜백 핸들러 및 스레드 설정
        langfuse_handler = CallbackHandler()
        config: RunnableConfig = {
            "configurable": {"thread_id": unique_thread_id},
            "callbacks": [langfuse_handler]  # Langgraph 추적을 위해 콜백 주입
        }

        # 3. 그래프 실행
        result = self.graph.invoke(state, config)
        
        # 4. 엔드포인트의 final_output 추출 로직 적용
        final_output = result.get("final_output")
        if not final_output and result.get("messages"):
            final_output = result["messages"][-1].content
            
        # 5. RAGAS 평가(evaluate)를 위해 필요한 핵심 데이터셋 필드 반환 구조화
        return {
            "question": question,
            "answer": str(final_output or ""),
            "contexts": result.get("context", []) 
        }
    
    def evaluate_dataset(self, golden_dataset: list[dict]) -> pd.DataFrame:
        questions = [item["question"] for item in golden_dataset]
        ground_truths = [item["ground_truth"] for item in golden_dataset]

        # expected_route가 없으면 기본값 None 처리
        routes = [item.get("expected_route") for item in golden_dataset]

        answers = []
        contexts = []

        print("\n🚀 [1/3] LangGraph 및 로컬 RAG 파이프라인 대량 예측 시작...")
        print(f"총 {len(questions)}개의 테스트 케이스를 순차 처리합니다...\n")

        # 1. Langgraph 파이프라인 호출 및 응답 아웃풋 제출
        for i, q in enumerate(tqdm(questions, desc="LangGraph Invoking", file=sys.stdout)):
            current_route = routes[i]
            # 개별 루프가 돌 때마다 진행 상태를 텍스트로도 구체적으로 출력 (멈춘 것인지 확인용)
            print(f"\n[처리 중 {i+1}/{len(questions)}] 질문 요약: {q[:30]}...")

            res = self._run_graph(q, route_override=current_route)

            answers.append(res["answer"])

            # --- 포맷 검증 및 안전 장치 추가 ---
            raw_context = res.get("contexts", [])
            if isinstance(raw_context, list):
                contexts.append(raw_context)
            elif isinstance(raw_context, str):
                contexts.append(raw_context.split("\n\n"))
            else:
                # 리스트로 감싸서 삽입
                contexts.append([str(raw_context)])
            # ---------------------------------

            print(f"[완료 {i+1}/{len(questions)}] 답변 추출 및 컨텍스트 수집 완료.")

        print("\n✅ [2/3] 모든 LangGraph 응답 수집 완료. Ragas 평가 데이터셋 구축 중...")

        # 2. ragas v0.3.x+ 스키마에 맞춰 데이터 구조화
        data = {
            "user_input": questions,
            "response": answers,
            "retrieved_contexts": contexts, # 반드시 list[list[str]]
            "reference": ground_truths # 반드시 list[str]]
        }

        dataset = Dataset.from_dict(data)
        
        # 3. Langfuse sdk v4 스펙에 맞춘 콜백 초기화
        langfuse_handler = CallbackHandler()    
        # CallbackHandler()는 인수에 아무것도 넣지 않으면 자동으로 환경 변수들을
        # 읽어서 Langfuse 클라우드와 통신합니다.

        print("\n🔥 [3/3] OpenAI 기반 Ragas 메트릭 계산 시작 (Faithfulness, Recall 등)...") 

        # --- 디버깅 전용 데이터셋 규격 검증 코드 ---
        print("💡 [DEBUG] Dataset 스키마 구조 확인:")
        print(f"👉 user_input[0] 타입: {type(dataset[0]['user_input'])}, 값: {dataset[0]['user_input']}")
        print(f"👉 response[0] 타입: {type(dataset[0]['response'])}, 값: {dataset[0]['response']}")
        print(f"👉 retrieved_contexts[0] 타입: {type(dataset[0]['retrieved_contexts'])}, 값: {dataset[0]['retrieved_contexts']}")
        print(f"👉 reference[0] 타입: {type(dataset[0]['reference'])}, 값: {dataset[0]['reference']}")
        # ------------------------------------------

        # 4. ragas evaluate 함수 실행
        score = evaluate(
            dataset=dataset,
            metrics=self.metrics,
            callbacks=[langfuse_handler]
        )

        print("\n📡 [완료] Ragas 평가 종료. Langfuse로 데이터를 동기화합니다...")

        # 5. v4 아키텍쳐 특성상 대량 큐를 메모리에 적재한 후 비동기 전송하므로
        # 평가가 끝나고 프로세스가 죽기 전 반드시 클라이언트를 flush 해주어야 유실이 없습니다.
        get_client().flush()

        print("🎉 모든 evaluation 프로세스가 성공적으로 완료되었습니다!")

        # Pylance에게 score의 타입을 Any로 cast하여 검사를 우회시킵니다.
        return cast(Any, score).to_pandas() 