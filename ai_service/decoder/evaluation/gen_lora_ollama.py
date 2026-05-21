"""
Qwen3 LoRA 모델을 Ollama q4km으로 설명 생성 (공정 비교용)

실행:
    cd evaluation
    python gen_lora_ollama.py
"""

import json
import re
import time
from pathlib import Path

import ollama
import pandas as pd

TEST_CASES_PATH = Path(__file__).parent / "eval_test_cases.jsonl"
RESULTS_CSV = Path(__file__).parent / "explanation_results.csv"

SYSTEM_PROMPT = (
    "당신은 스미싱(SMS 피싱) 탐지 전문가입니다. "
    "주어진 문자 내용과 감지된 특징을 근거로, "
    "해당 문자가 스미싱으로 의심되는 이유를 두 문장 이내로 설명하세요."
)

MODEL_CONFIGS = {
    "Qwen3-LoRA-r16": "qwen3-lora-q4km",
    "Qwen3-LoRA-r8": "qwen3-lora-r8-q4km",
}


def _load_test_cases() -> list[dict]:
    cases = []
    with open(TEST_CASES_PATH, encoding="utf-8") as f:
        for line in f:
            d = json.loads(line)
            cases.append(
                {
                    "text": d["text"],
                    "features": d["features"],
                    "reference": d["reference"],
                }
            )
    return cases


def _clean(s: str) -> str:
    s = re.sub(r"<think>.*?</think>", "", s, flags=re.DOTALL)
    s = re.sub(r"\*\*(.+?)\*\*", r"\1", s)
    s = re.sub(r"\*(.+?)\*", r"\1", s)
    s = s.replace("\n\n", " ").replace("\n", " ")
    return re.sub(r"  +", " ", s).strip()


def generate_one(ollama_model: str, text: str, features: str) -> tuple[str, float]:
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": f"문자 내용: {text[:300]}\n감지된 특징:\n{features}\n이유:",
        },
    ]
    t0 = time.perf_counter()
    response = ollama.chat(
        model=ollama_model,
        messages=messages,
        options={"temperature": 0, "num_predict": 256},
    )
    elapsed = round(time.perf_counter() - t0, 3)
    return _clean(response.message.content), elapsed


def main():
    cases = _load_test_cases()
    print(f"테스트 케이스: {len(cases)}개\n")

    new_rows = []
    for label, ollama_model in MODEL_CONFIGS.items():
        print(f"[{label}] → Ollama 모델: {ollama_model}")
        for i, case in enumerate(cases):
            hyp, elapsed = generate_one(ollama_model, case["text"], case["features"])
            new_rows.append(
                {
                    "model": label,
                    "case_idx": i,
                    "text": case["text"],
                    "features": case["features"],
                    "hypothesis": hyp,
                    "reference": case["reference"],
                    "inference_time_sec": elapsed,
                }
            )
            if i % 20 == 0 or i == len(cases) - 1:
                print(f"  [{i + 1}/{len(cases)}] {elapsed:.2f}s  {hyp[:60]}...")
        print(f"  [{label}] 완료\n")

    labels_updated = set(MODEL_CONFIGS.keys())
    if RESULTS_CSV.exists():
        kept = pd.read_csv(RESULTS_CSV)
        kept = kept[~kept["model"].isin(labels_updated)]
    else:
        kept = pd.DataFrame()

    result_df = pd.concat([kept, pd.DataFrame(new_rows)], ignore_index=True)
    result_df = result_df.sort_values(["model", "case_idx"]).reset_index(drop=True)
    result_df.to_csv(RESULTS_CSV, index=False, encoding="utf-8-sig")
    print(f"저장 완료: {RESULTS_CSV}  ({len(result_df)}행)")


if __name__ == "__main__":
    main()
