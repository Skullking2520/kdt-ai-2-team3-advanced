"""
설명 생성 모델 성능 비교 평가
explanation_results.csv의 기존 생성 결과를 바탕으로 지표만 계산

지표:
  - BERTScore       : hypothesis vs reference (의미적 유사도)
  - Feature-Align   : hypothesis vs features  (특징 반영도)
  - avg_length      : 평균 생성 길이
  - avg_time_sec    : 평균 추론 시간
실행:
    python eval_metrics.py
"""

import pandas as pd
from bert_score import score as bert_score_fn

DATA_FILE = "explanation_results.csv"
SUMMARY_FILE = "eval_summary.csv"
DETAIL_FILE = "eval_metrics_detail.csv"

BERTSCORE_MODEL = "klue/roberta-base"


def _bert_score(candidates: list[str], references: list[str]) -> list[float]:
    _, _, f1 = bert_score_fn(
        candidates,
        references,
        lang="ko",
        model_type=BERTSCORE_MODEL,
        num_layers=12,
        verbose=False,
    )
    return f1.tolist()


def main():
    df = pd.read_csv(DATA_FILE)

    # 생성 실패(NaN/빈 문자열) 행은 지표 계산에서 제외
    df["hypothesis"] = df["hypothesis"].fillna("")
    df["features"] = df["features"].fillna("")
    df["reference"] = df["reference"].fillna("")
    valid = df[df["hypothesis"].str.strip() != ""].copy()

    n_total = len(df)
    n_valid = len(valid)
    models = df["model"].unique()
    print(f"총 {n_total}개 샘플  |  모델 {len(models)}개: {list(models)}")
    if n_total != n_valid:
        print(f"생성 실패 {n_total - n_valid}개 제외 → 유효 {n_valid}개로 계산\n")
    else:
        print()

    # ── 전체 BERTScore 한 번에 계산 ─────────────────────────────────
    hypotheses = valid["hypothesis"].tolist()
    references = valid["reference"].tolist()
    features = valid["features"].tolist()

    print("BERTScore (hypothesis vs reference) 계산 중...")
    valid = valid.copy()
    valid["bert_f1"] = _bert_score(hypotheses, references)

    print("Feature-Alignment (hypothesis vs features) 계산 중...")
    valid["feature_align"] = _bert_score(hypotheses, features)

    valid["hyp_len"] = valid["hypothesis"].str.len()

    has_timing = "inference_time_sec" in valid.columns

    # ── 모델별 집계 ──────────────────────────────────────────────────
    rows = []
    for model_name, group in valid.groupby("model"):
        n_fail = len(df[df["model"] == model_name]) - len(group)
        row = {
            "model": model_name,
            "BERTScore": round(group["bert_f1"].mean(), 4),
            "Feature-Alignment": round(group["feature_align"].mean(), 4),
            "avg_length": round(group["hyp_len"].mean(), 1),
            "n_valid": len(group),
            "n_fail": n_fail,
        }
        if has_timing:
            times = group["inference_time_sec"].dropna()
            row["avg_time_sec"] = round(times.mean(), 3) if len(times) > 0 else None
        rows.append(row)

    summary_df = pd.DataFrame(rows).set_index("model")

    print("\n" + "=" * 65)
    print("모델별 성능 비교")
    print("=" * 65)
    print(summary_df.to_string())

    summary_df.to_csv(SUMMARY_FILE, encoding="utf-8-sig")
    valid.to_csv(DETAIL_FILE, index=False, encoding="utf-8-sig")
    print(f"\n요약 저장: {SUMMARY_FILE}")
    print(f"상세 저장: {DETAIL_FILE}")


if __name__ == "__main__":
    main()
