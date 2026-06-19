# ragas 평가 실행 엔트리포인트 스크립트
# 실행방법:
# cd ai_service
# PYTHONPATH=src APP_ENV=production OLLAMA_MODEL_NAME=qwen3:8b OLLAMA_NUM_CTX=8192 OLLAMA_NUM_PREDICT=1024 python -m ai_service.run_eval

import os
import sys
import json
from ai_service.utils.langfuse_init import load_langfuse_env_variable

# 다른 모듈(RAGGraphEvaluator 등)을 import 하기 전에 환경 변수부터 주입
load_langfuse_env_variable()

from .evaluation.evaluator import RAGGraphEvaluator
from .config.settings import settings
from .utils.save_golden_dataset import load_jsonl, safe_model_name

def main():
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))

        golden_path = os.path.join(
            current_dir,
            "data",
            "golden_dataset_30.jsonl"
        )

        model_name = os.getenv("OLLAMA_MODEL_NAME", "unknown_model")
        model_file_name = safe_model_name(model_name)

        output_path = os.path.join(
            current_dir,
            "data",
            f"evaluation_report_{model_file_name}_golden30.csv"
        )

        golden_dataset = load_jsonl(golden_path)

        print(f"현재 평가 모델: {model_name}")
        print(f"골든 데이터셋 경로: {golden_path}")
        print(f"총 {len(golden_dataset)}개의 테스트 케이스 평가를 시작합니다...")

        evaluator = RAGGraphEvaluator()
        results_df = evaluator.evaluate_dataset(golden_dataset)

        print("\n=== Ragas 평가 결과 평균 ===")
        print(results_df.mean(numeric_only=True))

        results_df.to_csv(output_path, index=False, encoding="utf-8-sig")

        print(f"\n평가 결과 저장 완료: {output_path}")
    
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
