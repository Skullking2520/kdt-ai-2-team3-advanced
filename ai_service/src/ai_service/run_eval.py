# ragas 평가 실행 엔트리포인트 스크립트
# 실행방법:
# cd ai_service
# PYTHONPATH=src APP_ENV=production OLLAMA_MODEL_NAME=qwen3:8b OLLAMA_NUM_CTX=8192 OLLAMA_NUM_PREDICT=1024 python -m ai_service.run_eval

import os
import json

from ai_service.utils.langfuse_init import load_langfuse_env_variable

# 다른 모듈(RAGGraphEvaluator 등)을 import 하기 전에 환경 변수부터 주입
load_langfuse_env_variable()

from .evaluation.evaluator import RAGGraphEvaluator


def load_jsonl(path: str) -> list[dict]:
    dataset = []

    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                dataset.append(json.loads(line))

    return dataset


def safe_model_name(model_name: str) -> str:
    safe_name = model_name.replace(":", "_")
    safe_name = safe_name.replace(".", "_")
    safe_name = safe_name.replace("/", "_")
    safe_name = safe_name.replace("-", "_")
    return safe_name


def main():
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


if __name__ == "__main__":
    main()
