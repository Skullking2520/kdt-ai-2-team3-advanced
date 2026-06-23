# Keyword Balanced Encoder Experiments

> 이 폴더는 키워드 과민반응 완화를 검토한 과거 실험 기록이다. 현재 운영 재학습과
> 모델 승격 기준은 `encoder_retraining/README.md`를 따른다.

이 폴더는 Encoder 모델의 키워드 과민반응을 완화하기 위한 증강 학습과 평가 코드를
정리한다. PR #8의 `aug-50`, `aug-100` 실험 위치와 맞추기 위해 루트의
`after data augmentation/` 아래에서 관리한다.

## 목적

기존 Encoder는 `택배`, `배송`, `카드`, `계좌`, `인증`, `대출`, `링크` 같은
위험 키워드가 정상 문장에 포함되어도 phishing confidence가 높아지는 문제가
있었다.

이 폴더의 v3 파이프라인은 다음을 재현하기 위한 코드다.

- hard negative: 위험 키워드를 포함하지만 정상인 문자
- hard positive: 기존 모델이 놓친 URL, 앱 설치, 캐시백, 카드 잠김, 전화 유도 등
  피싱 문자
- train split에만 hard example 병합
- hard example이 validation/test split의 문장과 겹치면 학습 병합 전에 제외
- keyword challenge set 평가
- false positive / false negative 분석
- threshold별 FP/FN 비교

모델 가중치, 원본/전처리 데이터셋, 생성 결과 CSV는 Git에 포함하지 않는다.

## 주요 결과

| Candidate | Hard Negative | Hard Positive | FP | FN | F1 |
| --- | ---: | ---: | ---: | ---: | ---: |
| baseline | 0 | 0 | 193 | 124 | 0.9551 |
| hard_mixed_v1 | 165 | 45 | 177 | 131 | 0.9562 |
| hard_mixed_v2 | 181 | 54 | 167 | 149 | 0.9549 |
| hard_mixed_v3 | 181 | 79 | 160 | 145 | 0.9565 |

v3는 FP, precision, F1 관점에서 가장 좋은 후보였고, keyword challenge set
235개에서는 오탐/미탐 0개를 기록했다.

## Files

- `run_kcelectra_retrain_experiments.py`: KcELECTRA 재학습 실험 실행
- `generate_v3_hard_examples.py`: v3 hard-example CSV 예시 생성
- `evaluate_keyword_challenge_set.py`: keyword challenge set 평가
- `analyze_encoder_errors.py`: false positive / false negative 추출
- `compare_thresholds.py`: threshold별 FP/FN 비교
- `encoder_analysis_utils.py`: 평가/분석 공통 유틸

## Usage

필요 패키지는 `ai_service/encoder/training/requirements.txt` 기준으로 설치한다.

```bash
python -m pip install -r ai_service/encoder/training/requirements.txt
```

v3 hard-example CSV 예시 생성:

```bash
python "after data augmentation/generate_v3_hard_examples.py"
```

재학습:

```bash
python "after data augmentation/run_kcelectra_retrain_experiments.py" \
  --data-path "after data augmentation/cleaned_dataset.jsonl" \
  --results-dir "after data augmentation/results_hard_mixed_v3" \
  --skip-optuna \
  --use-hard-negatives true \
  --hard-negative-path "after data augmentation/data/generated/hard_negative_keywords_normal.csv" \
  --use-hard-positives true \
  --hard-positive-path "after data augmentation/data/generated/hard_positive_finance_phishing.csv" \
  --experiments focal_no_oversampling
```

평가:

```bash
python "after data augmentation/evaluate_keyword_challenge_set.py" \
  --model-path "after data augmentation/results_hard_mixed_v3/focal_no_oversampling/final_model"

python "after data augmentation/analyze_encoder_errors.py" \
  --data-path "after data augmentation/cleaned_dataset.jsonl" \
  --model-path "after data augmentation/results_hard_mixed_v3/focal_no_oversampling/final_model"

python "after data augmentation/compare_thresholds.py" \
  --data-path "after data augmentation/cleaned_dataset.jsonl" \
  --model-path "after data augmentation/results_hard_mixed_v3/focal_no_oversampling/final_model"
```

## Notes

PR #8의 `aug-50`, `aug-100` 결과는 학습 데이터 구성이 다를 수 있으므로 v3 결과와
숫자를 직접 비교할 때는 동일 split, 동일 test set 기준인지 먼저 확인해야 한다.
hard example CSV가 held-out validation/test 문장을 포함하더라도 학습 병합 전
자동으로 제외해 평가 누수를 방지한다.
