# ragas 평가 실행 엔트리포인트 스크립트
# 실행방법: cd ai_service; python -m src.ai_service.run_eval
import os
import json
from ai_service.utils.langfuse_init import load_langfuse_env_variable

# 🚀 다른 모듈(RAGGraphEvaluator 등)을 import 하기 전에 환경 변수부터 주입!
load_langfuse_env_variable()

from .evaluation.evaluator import RAGGraphEvaluator

def main():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    golden_path = os.path.join(current_dir, "data", "golden_dataset.json")
    output_path = os.path.join(current_dir, "data", "evaluation_report.csv")
    
    # 1. 준비된 골든 데이터셋 로드
    with open(golden_path, "r", encoding="utf-8") as f:
        golden_dataset = json.load(f)

    print(f"총 {len(golden_dataset)}개의 테스트 케이스 평가를 시작합니다...")

    # 2. 평가기 실행
    evaluator = RAGGraphEvaluator()
    results_df = evaluator.evaluate_dataset(golden_dataset)

    # 3. 결과 출력 및 저장
    print("\n=== Ragas 평가 결과 ===")
    print(results_df.mean(numeric_only=True))

    results_df.to_csv(output_path, index=False)

if __name__ == "__main__":
    main()