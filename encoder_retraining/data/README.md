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

GitHub Actions에 전달하는 prepared dataset archive도 같은 파일 구조를 사용한다.
압축 파일 안에는 위 네 파일이 archive 루트에 있어야 한다.

예를 들어 PR #24처럼 `encoder-v4/` prepared dataset을 만든 경우, 다음처럼 폴더
안의 파일만 압축한다.

```bash
tar -C encoder_retraining/data/prepared/encoder-v4 \
  -czf encoder-v4.tar.gz \
  cleaned_train.jsonl valid.jsonl test.jsonl manifest.json
```

다음처럼 상위 폴더를 포함해 압축하면 workflow가 기대하는 경로와 달라져 실패한다.

```bash
# 권장하지 않음: 압축 해제 후 encoder-v4/cleaned_train.jsonl 형태가 됨
tar -czf encoder-v4.tar.gz encoder_retraining/data/prepared/encoder-v4
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
  "cleanlab_source": "external_cleanlab_audit",
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

## Compatibility With Cleanlab Prepared Data

PR #24처럼 전처리/Cleanlab 쪽에서 `encoder_retraining/data/prepared/encoder-v4/`를
생성하는 경우, 파일명이 아래와 같으면 PR #23 workflow의 `prepared-dir` 입력과 바로
호환된다.

```text
cleaned_train.jsonl
valid.jsonl
test.jsonl
manifest.json
```

workflow는 네 파일이 모두 존재하는지 확인하고, 각 JSONL split에서 최소 1개 행의
`text`와 `label` 스키마를 검증한다. `label`은 `0 = normal`, `1 = phishing`만
허용한다.

## Cleanlab Audit To Prepared Dataset

Cleanlab 담당 영역에서 다음과 같은 audit 결과를 전달받는 경우에는
`prepare_from_cleanlab_audit.py`로 prepared dataset을 생성한다.

```text
cleanlab-audit/
├── pred_probs.npy
├── label_audit_report.csv
├── suspected_noisy_labels.csv
├── cleaned_dataset.jsonl
└── audit_log.json
```

필수 입력은 `cleaned_dataset.jsonl`이며, 나머지 파일은 `manifest.json`에 감사
메타데이터를 남기기 위해 사용한다.

```bash
uv run --group encoder python \
  encoder_retraining/pipeline/prepare_from_cleanlab_audit.py \
  --cleaned-data-path <cleanlab-audit>/cleaned_dataset.jsonl \
  --audit-dir <cleanlab-audit> \
  --dataset-version encoder-v4 \
  --output-dir encoder_retraining/data/prepared/encoder-v4
```

생성 결과는 prepared dataset contract와 동일하다.

```text
encoder_retraining/data/prepared/encoder-v4/
├── cleaned_train.jsonl
├── valid.jsonl
├── test.jsonl
└── manifest.json
```

GitHub Actions에서는 `cleanlab_audit_url` 입력이나
`ENCODER_CLEANLAB_AUDIT_URL` secret을 설정하면 audit archive를 내려받아 이
변환 단계를 자동으로 실행한다. 이미 prepared dataset archive가 있으면 기존처럼
`prepared_dataset_url` 또는 `ENCODER_PREPARED_DATASET_URL`을 사용한다.
