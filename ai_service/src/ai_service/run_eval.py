# ragas 평가 실행 엔트리포인트 스크립트
# 실행방법: cd ai_service; python -m src.ai_service.run_eval
import os
import json
import sys
from ai_service.utils.langfuse_init import load_langfuse_env_variable

# 🚀 다른 모듈(RAGGraphEvaluator 등)을 import 하기 전에 
# 랭퓨즈, openai 환경 변수부터 주입!
load_langfuse_env_variable()

from .evaluation.evaluator import RAGGraphEvaluator
from .config.settings import settings


def main():
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        golden_path = os.path.join(current_dir, "data", "golden_dataset.json")
        output_path = os.path.join(current_dir, "data", "evaluation_report.csv")
        
        # 1. 준비된 골든 데이터셋 로드
        if not os.path.exists(golden_path):
            raise FileNotFoundError(f"골든 데이터셋을 찾을 수 없습니다: {golden_path}")
        
        with open(golden_path, "r", encoding="utf-8") as f:
            golden_dataset = json.load(f)

        print(f"✅ 골든 데이터셋 로드 완료: {len(golden_dataset)}개 항목")
        
        # 평가 설정 출력
        print("\n📋 평가 설정:")
        print(f"  - 평가 LLM: {settings.EVALUATOR_LLM_PROVIDER}/{settings.EVALUATOR_MODEL_NAME}")
        print(f"  - 운영 LLM: {settings.OLLAMA_MODEL_NAME}")
        print(f"  - 배치 크기: {settings.EVALUATION_BATCH_SIZE}")
        print(f"  - 최대 동시 요청: {settings.EVALUATION_MAX_CONCURRENT_REQUESTS}")
        print(f"  - 재시도 횟수: {settings.EVALUATION_RETRY_COUNT}")
        print(f"  - 최대 평가 건수: {settings.EVALUATION_MAX_ITEMS or '무제한'}")
        print(f"  - 비용 제한: ${settings.EVALUATION_COST_LIMIT_DOLLARS or '무제한'}")
        print(f"  - 에러 발생 시 동작: {'스킵 및 계속' if settings.EVALUATION_SKIP_ON_ERROR else '중단'}")

        print(f"\n총 {len(golden_dataset)}개의 테스트 케이스 평가를 시작합니다...\n")

        # 2. 평가기 실행
        evaluator = RAGGraphEvaluator()
        results_df = evaluator.evaluate_dataset(golden_dataset)

        # 3. 결과 출력 및 저장
        if not results_df.empty:
            print("\n=== Ragas 평가 결과 ===")
            print(results_df.mean(numeric_only=True))

            results_df.to_csv(output_path, index=False)
            print(f"\n💾 결과 저장 완료: {output_path}")
            print(f"📊 저장된 행 수: {len(results_df)}")
        else:
            print("\n⚠️  평가 결과가 없습니다.")
            sys.exit(1)

    except FileNotFoundError as e:
        print(f"\n❌ 파일을 찾을 수 없습니다: {e}")
        sys.exit(1)
    except KeyError as e:
        print(f"\n❌ 설정 키가 누락되었습니다: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ 평가 중 예상치 못한 에러가 발생했습니다:")
        print(f"  {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
