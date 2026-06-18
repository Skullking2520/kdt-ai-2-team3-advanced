# Encoder Data Directory

이 폴더는 Encoder 재학습에 필요한 입력 데이터와 실행 산출물이 놓이는 작업 공간이다.
실제 데이터 파일은 개인정보 또는 대용량 파일일 수 있으므로 Git에 커밋하지 않는다.

## Directory Roles

| Path | Role | Commit |
| --- | --- | --- |
| `incoming/` | 관리자가 직접 넣는 수동 피해 사례 입력 | example only |
| `collected/<run_id>/` | 운영 DB와 수동 사례에서 수집한 incremental data | no |
| `datasets/<dataset_version>/` | 기준 데이터와 incremental data를 합친 fixed split | no |
| `prepared/<dataset_version>/` | 전처리/Cleanlab 팀이 넘긴 최종 재학습 데이터 | no |
| `pred_probs/<dataset_version>/` | Cleanlab용 예측 확률 산출물 | no |
| `quality/<dataset_version>/` | Cleanlab 정제 결과 | no |
| `runs/<run_id>/` | end-to-end 재학습 실행 결과 | no |
| `evaluations/<run_id>/` | baseline/candidate 모델 비교 결과 | no |

## Prepared Dataset Contract

전처리와 Cleanlab이 별도 담당 영역에서 끝난 경우, Encoder 학습은
`prepared/<dataset_version>/` 아래의 고정 split을 입력으로 받는다.

권장 구조:

```text
encoder_retraining/data/prepared/<dataset_version>/
├── cleaned_train.jsonl
├── valid.jsonl
├── test.jsonl
└── manifest.json
```

`cleaned_train.jsonl`, `valid.jsonl`, `test.jsonl`은 JSON Lines 형식이며 각 줄은
최소한 다음 필드를 포함한다.

```json
{"text": "배송 주소 오류로 반송 예정입니다. <URL>", "label": 1}
```

필수 필드:

- `text`: 모델에 넣을 전처리 완료 문자열
- `label`: `0 = normal`, `1 = phishing`

권장 추가 필드:

- `source`: 데이터 출처
- `source_id`: 원본 행 또는 수집 케이스 ID
- `preprocess_version`: 전처리 규칙 버전
- `cleanlab_action`: `keep`, `drop`, `review` 등 품질 점검 결과

`manifest.json`에는 최소한 다음 정보를 남긴다.

```json
{
  "dataset_version": "encoder-v2-preprocessed-YYYYMMDD",
  "preprocess_version": "preprocess-v1",
  "cleanlab_mode": "pred-probs",
  "train_count": 0,
  "valid_count": 0,
  "test_count": 0,
  "label_counts": {
    "0": 0,
    "1": 0
  },
  "notes": "Generated outside this repository."
}
```

## Training With Prepared Data

전처리 완료 데이터가 준비되면 pipeline 전체를 다시 돌릴 필요 없이 학습 스크립트에
고정 split을 직접 전달한다.

```bash
uv run --group encoder python \
  encoder_retraining/training/run_kcelectra_retrain_experiments.py \
  --train-path encoder_retraining/data/prepared/<dataset_version>/cleaned_train.jsonl \
  --valid-path encoder_retraining/data/prepared/<dataset_version>/valid.jsonl \
  --test-path encoder_retraining/data/prepared/<dataset_version>/test.jsonl \
  --model-name-or-path kdt-2-team4-newbiz/kcelectra-smishing-classifier \
  --results-dir encoder_retraining/data/runs/<run_id>/training \
  --experiments focal_no_oversampling \
  --n-trials 1 \
  --epochs 3
```

학습 후에는 같은 `test.jsonl`로 기존 모델과 후보 모델을 비교한다.

```bash
uv run --group encoder python \
  encoder_retraining/pipeline/compare_encoder_models.py \
  --test-path encoder_retraining/data/prepared/<dataset_version>/test.jsonl \
  --baseline-model kdt-2-team4-newbiz/kcelectra-smishing-classifier \
  --candidate-model encoder_retraining/data/runs/<run_id>/training/focal_no_oversampling/final_model \
  --output-dir encoder_retraining/data/runs/<run_id>/evaluation
```
