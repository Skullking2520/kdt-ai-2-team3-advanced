"""
스미싱 설명 생성 - Few-shot 방식
모델 / 파인튜닝 기법 비교용 스크립트

실행:
    python few_shot_explan.py

필수 패키지:
    pip install ollama
"""

import json
import re
import time
from pathlib import Path

import ollama
import pandas as pd

SYSTEM_PROMPT = (
    "당신은 스미싱(SMS 피싱) 탐지 전문가입니다. "
    "주어진 문자 내용과 감지된 특징을 근거로, "
    "해당 문자가 스미싱으로 의심되는 이유를 두 문장 이내로 설명하세요."
)


def _clean(s: str) -> str:
    s = re.sub(r"<think>.*?</think>", "", s, flags=re.DOTALL)
    s = re.sub(r"\*\*(.+?)\*\*", r"\1", s)
    s = re.sub(r"\*(.+?)\*", r"\1", s)
    s = s.replace("\n\n", " ").replace("\n", " ")
    return re.sub(r"  +", " ", s).strip()


# ── 평가용 테스트 케이스 로드 ──────────────────────────────────────
_TEST_CASES_PATH = Path(__file__).parent / "eval_test_cases.jsonl"


def _load_test_cases() -> list[dict]:
    cases = []
    with open(_TEST_CASES_PATH, encoding="utf-8") as f:
        for line in f:
            d = json.loads(line)
            cases.append(
                {
                    "text": d["text"],
                    "features": d["features"],
                    "reference": d["reference"],
                    "label": d.get("label", ""),
                    "label_name": d.get("label_name", ""),
                }
            )
    return cases


TEST_CASES = _load_test_cases()

MODELS: dict[str, dict] = {
    "qwen3:1.7b": {"id": "qwen3:1.7b", "think": False},
    # "exaone3.5:2.4b": {"id": "exaone3.5:2.4b"},
    # "gemma2:2b": {"id": "gemma2:2b"},
}

# ── Few-shot 예시 (테스트셋과 겹치지 않는 decoder_dataset 샘플) ──────
_FEW_SHOT_EXAMPLES = [
    {
        "text": "해외선물 Al인공지능신호 하루 만원씩 실현 잠시후 kakao.opne.s.톡방.com(참여코드: ) 클릭",  # noqa: E501
        "features": "- 특이 사항 없음",
        "answer": (
            "이 문자는 스미싱일 가능성이 높습니다. "
            "의심스러운 링크(kakao.opne.s.톡방.com)를 통해 개인 정보를 요구하거나 "
            "금전적 손실을 초래할 수 있는 위험한 사이트로 유도하려 하기 때문입니다."
        ),
    },
    {
        "text": (
            "Please append margin for your short position of the KAVAUSDT Contracts "
            "to avoid liquidation risks. <URL>"
        ),
        "features": "- 외부 링크 포함: ['https://go.bybit.com/hNXhXxFdmb']",
        "answer": (
            "이 문자가 스미싱일 가능성이 높은 이유는 외부 링크를 통해 "
            "자금 관리 결정을 서두르게 유도하기 때문입니다. "
            "신뢰할 수 없는 링크를 클릭하면 개인 정보나 자산이 위험에 처할 수 있습니다."
        ),
    },
    {
        "text": "[대법원] 귀하의 민사소송 접수 완료. 신속한 대응 필요! 확인 → http://supcourt-kr.com/case",
        "features": "- 외부 링크 포함: ['http://supcourt-kr.com/case']",
        "answer": (
            "이 문자는 공식 기관인 대법원을 사칭하면서 의심스러운 URL로 "
            "개인 정보를 입력하도록 유도하기 때문에 스미싱입니다. "
            "공식 기관은 일반적으로 문자 링크로 정보 확인을 요청하지 않습니다."
        ),
    },
]


def _build_fewshot_messages(text: str, features: str) -> list:
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for ex in _FEW_SHOT_EXAMPLES:
        messages.append(
            {
                "role": "user",
                "content": (
                    f"문자 내용: {ex['text']}\n감지된 특징:\n{ex['features']}\n이유:"
                ),
            }
        )
        messages.append({"role": "assistant", "content": ex["answer"]})
    messages.append(
        {
            "role": "user",
            "content": (f"문자 내용: {text[:300]}\n감지된 특징:\n{features}\n이유:"),
        }
    )
    return messages


def generate_explanation(
    model_config: dict, text: str, features: str
) -> tuple[str, float]:
    messages = _build_fewshot_messages(text, features)
    kwargs = {"think": False} if model_config.get("think") is False else {}
    try:
        t0 = time.perf_counter()
        response = ollama.chat(
            model=model_config["id"],
            messages=messages,
            options={"temperature": 0, "num_predict": 256},
            **kwargs,
        )
        elapsed = round(time.perf_counter() - t0, 3)
        return _clean(response.message.content), elapsed
    except Exception as e:
        return f"[생성 실패: {e}]", 0.0


# ── 모델별 생성 실행 ─────────────────────────────────────────────
def generate_model(model_name: str, model_config: dict) -> list[dict]:
    print(f"\n[{model_name}] 생성 시작...")

    rows = []
    for i, case in enumerate(TEST_CASES):
        hyp, elapsed = generate_explanation(
            model_config, case["text"], case["features"]
        )
        rows.append(
            {
                "model": model_name,
                "case_idx": i,
                "text": case["text"],
                "features": case["features"],
                "hypothesis": hyp,
                "reference": case["reference"],
                "inference_time_sec": elapsed,
            }
        )
        if i % 20 == 0 or i == len(TEST_CASES) - 1:
            print(f"  [{i + 1}/{len(TEST_CASES)}] {elapsed:.2f}s  {hyp[:60]}...")

    print(f"  [{model_name}] 완료\n")
    return rows


# ── 메인 ─────────────────────────────────────────────────────────

RESULTS_CSV = Path(__file__).parent / "explanation_results.csv"


def main():
    new_rows = []
    for model_name, model_config in MODELS.items():
        new_rows.extend(generate_model(model_name, model_config))

    if not new_rows:
        print("생성된 결과 없음.")
        return

    labels_done = {r["model"] for r in new_rows}

    if RESULTS_CSV.exists():
        df = pd.read_csv(RESULTS_CSV)
        kept = df[~df["model"].isin(labels_done)]
    else:
        kept = pd.DataFrame()

    result_df = pd.concat([kept, pd.DataFrame(new_rows)], ignore_index=True)
    result_df = result_df.sort_values(["model", "case_idx"]).reset_index(drop=True)
    result_df.to_csv(RESULTS_CSV, index=False, encoding="utf-8-sig")
    print(f"저장 완료: {RESULTS_CSV}  ({len(result_df)}행)")


if __name__ == "__main__":
    main()
