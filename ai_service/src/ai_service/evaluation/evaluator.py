import pandas as pd
import datetime
import sys
import time

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
from ..config.settings import settings


class EvaluationConfig:
    """평가 실행 설정을 관리하는 클래스"""
    def __init__(self):
        self.batch_size = settings.EVALUATION_BATCH_SIZE
        self.max_concurrent = settings.EVALUATION_MAX_CONCURRENT_REQUESTS
        self.request_timeout = settings.EVALUATION_REQUEST_TIMEOUT
        self.retry_count = settings.EVALUATION_RETRY_COUNT
        self.retry_delay = settings.EVALUATION_RETRY_DELAY
        self.max_items = settings.EVALUATION_MAX_ITEMS  # 0 = 무제한
        self.cost_limit = settings.EVALUATION_COST_LIMIT_DOLLARS
        self.skip_on_error = settings.EVALUATION_SKIP_ON_ERROR
        
        self.estimated_cost = 0.0
        self.processed_count = 0
        self.error_count = 0
        self.errors = []
    
    def should_stop_evaluation(self) -> bool:
        """평가를 중단할지 판단"""
        if self.max_items > 0 and self.processed_count >= self.max_items:
            print(f"✋ 최대 평가 건수({self.max_items})에 도달했습니다.")
            return True
        
        if self.cost_limit > 0 and self.estimated_cost >= self.cost_limit:
            print(f"💰 비용 제한({self.cost_limit:.2f}$)에 도달했습니다. "
                  f"현재 예상 비용: {self.estimated_cost:.4f}$")
            return True
        
        return False
    
    def log_error(self, index: int, question: str, error: Exception):
        """에러 로깅"""
        self.error_count += 1
        error_msg = f"[{index}] {question[:50]}... → {str(error)}"
        self.errors.append(error_msg)
        print(f"⚠️  에러 발생 ({self.error_count}): {error_msg}")


class RAGGraphEvaluator:
    def __init__(self):
        # ragas 0.3.9 규격의 생성자 주입식 메트릭 리스트 로드
        self.metrics = get_ragas_metrics()
        self.graph = langgraph_app
        self.eval_config = EvaluationConfig()

    def _run_graph_with_retry(
        self,
        question: str,
        ocr_text: str | None = None,
        route_override: Literal['zero_day', 'general'] | None = None,
        retry_count: int = 0
    ) -> dict | None:
        """
        그래프를 재시도 로직과 함께 실행합니다.
        
        Args:
            question: 입력 질문
            ocr_text: OCR 텍스트
            route_override: 라우팅 오버라이드
            retry_count: 현재 재시도 횟수
        
        Returns:
            dict 또는 None (실패 시)
        """
        try:
            # 1. FastAPI 엔드포인트와 동일한 방식으로 user_content 및 초기 State 구성
            user_content = _build_user_content(question, ocr_text)
            state: SmishingGraphState = {"messages": [HumanMessage(content=user_content)]}
            
            if route_override:
                state["route_override"] = route_override

            # 현재 시간 기준 고유 ID 생성
            now_str = datetime.datetime.now().strftime("%Y%m%d_%H%M%S%f")
            unique_thread_id = f"langgraph_eval_{now_str}"

            # 2. Langfuse v4+ 콜백 핸들러 및 스레드 설정
            langfuse_handler = CallbackHandler()
            config: RunnableConfig = {
                "configurable": {"thread_id": unique_thread_id},
                "callbacks": [langfuse_handler],
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
        
        except (TimeoutError, Exception) as e:
            if retry_count < self.eval_config.retry_count:
                print(f"🔄 재시도 중({retry_count + 1}/{self.eval_config.retry_count})...")
                time.sleep(self.eval_config.retry_delay)
                return self._run_graph_with_retry(
                    question, ocr_text, route_override, retry_count + 1
                )
            else:
                raise e
    
    def evaluate_dataset(self, golden_dataset: list[dict]) -> pd.DataFrame:
        questions = [item["question"] for item in golden_dataset]
        ground_truths = [item["ground_truth"] for item in golden_dataset]
        routes = [item.get("expected_route") for item in golden_dataset]

        answers = []
        contexts = []
        processed_indices = []  # 성공한 인덱스 추적

        print("\n🚀 [1/3] LangGraph 및 로컬 RAG 파이프라인 대량 예측 시작...")
        print(f"총 {len(questions)}개의 테스트 케이스를 처리합니다.")
        print(f"📊 설정: batch_size={self.eval_config.batch_size}, "
              f"max_concurrent={self.eval_config.max_concurrent}, "
              f"max_items={self.eval_config.max_items or '무제한'}, "
              f"cost_limit={self.eval_config.cost_limit or '무제한'}")
        print()

        # 1. Langgraph 파이프라인 호출 및 응답 아웃풋 제출
        for i, q in enumerate(tqdm(questions, desc="LangGraph Invoking", file=sys.stdout)):
            # 중단 조건 확인
            if self.eval_config.should_stop_evaluation():
                print(f"⏹️  평가 중단. 처리된 건수: {self.eval_config.processed_count}")
                break
            
            current_route = routes[i]
            print(f"\n[처리 중 {i+1}/{len(questions)}] 질문 요약: {q[:50]}...")

            try:
                res = self._run_graph_with_retry(q, route_override=current_route)
                
                if res is None:
                    raise RuntimeError("그래프 실행 결과가 None입니다.")
                
                answers.append(res["answer"])
                processed_indices.append(i)

                # --- 포맷 검증 및 안전 장치 추가 ---
                raw_context = res.get("contexts", [])
                if isinstance(raw_context, list):
                    contexts.append(raw_context)
                elif isinstance(raw_context, str):
                    contexts.append(raw_context.split("\n\n"))
                else:
                    contexts.append([str(raw_context)])
                # ---------------------------------

                self.eval_config.processed_count += 1
                print(f"[완료 {i+1}/{len(questions)}] ✅ 답변 추출 및 컨텍스트 수집 완료.")

            except Exception as e:
                self.eval_config.log_error(i, q, e)
                
                if self.eval_config.skip_on_error:
                    print(f"  ⏭️  에러를 무시하고 다음 항목으로 계속 진행합니다.")
                    # 해당 인덱스 스킵
                else:
                    print(f"  ❌ 평가를 중단합니다.")
                    raise

        print("\n✅ [1/3 완료] LangGraph 응답 수집 완료.")
        print(f"📈 처리된 건수: {self.eval_config.processed_count}/{len(questions)}, "
              f"에러: {self.eval_config.error_count}")
        
        if self.eval_config.errors:
            print("\n⚠️  발생한 에러 목록:")
            for err in self.eval_config.errors[:5]:  # 처음 5개만 표시
                print(f"  - {err}")
            if len(self.eval_config.errors) > 5:
                print(f"  ... 외 {len(self.eval_config.errors) - 5}개")

        # 성공한 데이터만 필터링
        questions_filtered = [questions[i] for i in processed_indices]
        ground_truths_filtered = [ground_truths[i] for i in processed_indices]

        if not answers:
            print("❌ 성공적으로 처리된 데이터가 없습니다. 평가를 중단합니다.")
            return pd.DataFrame()

        print("\n✅ [2/3] Ragas 평가 데이터셋 구축 중...")

        # 2. ragas v0.3.x+ 스키마에 맞춰 데이터 구조화
        data = {
            "user_input": questions_filtered,
            "response": answers,
            "retrieved_contexts": contexts,
            "reference": ground_truths_filtered
        }

        dataset = Dataset.from_dict(data)
        
        # 3. Langfuse sdk v4 스펙에 맞춘 콜백 초기화
        langfuse_handler = CallbackHandler()
        # callback handler는 인자가 없으면 환경변수에서 가져옴

        print("\n🔥 [3/3] Ragas 메트릭 계산 시작 (Faithfulness, Recall 등)...")
        print(f"평가 항목 수: {len(dataset)}")

        # --- 디버깅 전용 데이터셋 규격 검증 코드 ---
        if len(dataset) > 0:
            print("💡 [DEBUG] Dataset 스키마 구조 확인:")
            print(f"👉 user_input[0] 타입: {type(dataset[0]['user_input'])}, "
                  f"값: {str(dataset[0]['user_input'])[:50]}")
            print(f"👉 response[0] 타입: {type(dataset[0]['response'])}, "
                  f"값: {str(dataset[0]['response'])[:50]}")
            print(f"👉 retrieved_contexts[0] 타입: {type(dataset[0]['retrieved_contexts'])}")
            print(f"👉 reference[0] 타입: {type(dataset[0]['reference'])}, "
                  f"값: {str(dataset[0]['reference'])[:50]}")
        # ------------------------------------------

        # 4. ragas evaluate 함수 실행
        try:
            score = evaluate(
                dataset=dataset,
                metrics=self.metrics,
                callbacks=[langfuse_handler]
            )
            print("\n📡 [완료] Ragas 평가 종료. Langfuse로 데이터를 동기화합니다...")
        except Exception as e:
            print(f"\n❌ Ragas 평가 중 에러 발생: {e}")
            if self.eval_config.skip_on_error:
                print("에러를 무시하고 계속 진행합니다.")
                # 현재까지의 결과라도 반환
                return pd.DataFrame({"processed_count": [self.eval_config.processed_count]})
            else:
                raise

        # 5. v4 아키텍쳐 특성상 대량 큐를 메모리에 적재한 후 비동기 전송하므로
        # 평가가 끝나고 프로세스가 죽기 전 반드시 클라이언트를 flush 해주어야 유실이 없습니다.
        get_client().flush()

        print("🎉 모든 evaluation 프로세스가 성공적으로 완료되었습니다!")
        print(f"📊 최종 통계: 성공={self.eval_config.processed_count}, "
              f"실패={self.eval_config.error_count}, "
              f"예상 비용=${self.eval_config.estimated_cost:.4f}")

        # Pylance에게 score의 타입을 Any로 cast하여 검사를 우회시킵니다.
        return cast(Any, score).to_pandas()
 