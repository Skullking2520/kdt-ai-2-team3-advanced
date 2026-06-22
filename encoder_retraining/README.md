# Encoder Retraining Data Pipeline

이 폴더는 ai_service 실행 코드와 분리된 Encoder 재학습/평가/승격 자동화 영역이다.

이 파이프라인은 전처리/Cleanlab 담당 영역에서 생성한 Cleanlab audit 산출물
또는 prepared dataset을 받아 Encoder를 재학습하고, 기존 운영 모델과 후보 모델을
같은 test set으로 비교한다. Cleanlab 실행 자체는 PR #24 담당 영역에서 수행하며,
이 폴더는 그 결과를 재학습 가능한 입력 형식으로 변환하고 학습/평가/승격 검토를
담당한다.

```text
PR #24 Cleanlab audit 산출물
        ↓
prepare_from_cleanlab_audit.py
        ↓
prepared/<dataset_version>/
  ├── cleaned_train.jsonl
  ├── valid.jsonl
  ├── test.jsonl
  └── manifest.json
        ↓
run_retraining_pipeline.py
        ↓
compare_encoder_models.py
        ↓
promotion_manifest.json
```

전처리/Cleanlab 담당 영역에서 S3에 `cleanlab-audit` 산출물을 먼저 만들면
`prepare_from_cleanlab_audit.py`가 `cleaned_dataset.jsonl`을 PR23 workflow가
기대하는 prepared dataset 형식으로 변환한다.

```text
Cleanlab audit archive
        ↓
prepare_from_cleanlab_audit.py
        ↓
prepared/<dataset_version>/
  ├── cleaned_train.jsonl
  ├── valid.jsonl
  ├── test.jsonl
  └── manifest.json
        ↓
run_retraining_pipeline.py
```

## Prepared Data Shortcut

전처리와 Cleanlab을 다른 담당 영역에서 완료해 전달받는 경우에는 이 문서의
1-4단계를 건너뛰고, `encoder_retraining/data/prepared/<dataset_version>/`에
다음 파일을 둔다.

```text
encoder_retraining/data/prepared/<dataset_version>/
├── cleaned_train.jsonl
├── valid.jsonl
├── test.jsonl
└── manifest.json
```

각 JSONL 행은 최소한 `text`, `label`을 포함한다.

```json
{"text": "배송 주소 오류로 반송 예정입니다. <URL>", "label": 1}
```

이 경우 학습은 아래처럼 바로 실행한다.

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

학습 후 5번 모델 비교와 6번 Hugging Face 승격 검토를 수행한다. 자세한 데이터
계약은 [data/README.md](data/README.md)를 참고한다.

재학습 파이프라인이 학습을 직접 수행한 경우, 최종 기준 모델 비교도
`training/best_params.json`의 `max_length`를 사용한다. 학습 직후 후보 평가와
승격 비교의 입력 길이를 일치시키기 위한 규칙이다. `--skip-training`처럼 기존
후보만 비교할 때는 `run_retraining_pipeline.py --max-length` 값을 사용한다.

## Cleanlab Audit Shortcut

PR #24처럼 Cleanlab 실행 결과가 다음 파일을 포함하는 archive로 전달되는 경우,
prepared dataset을 수동으로 만들지 않고 변환 스크립트를 먼저 실행한다.

```text
cleanlab-audit/
├── pred_probs.npy
├── label_audit_report.csv
├── suspected_noisy_labels.csv
├── cleaned_dataset.jsonl
└── audit_log.json
```

```bash
uv run --group encoder python \
  encoder_retraining/pipeline/prepare_from_cleanlab_audit.py \
  --cleaned-data-path <cleanlab-audit>/cleaned_dataset.jsonl \
  --audit-dir <cleanlab-audit> \
  --dataset-version encoder-v4 \
  --output-dir encoder_retraining/data/prepared/encoder-v4
```

이후 학습은 prepared dataset shortcut과 동일하게
`encoder_retraining/data/prepared/encoder-v4`를 입력으로 사용한다.

## 1. Collect Candidates

현재 포함하는 데이터는 다음 세 종류다.

| Source | Label | Selection |
| --- | ---: | --- |
| `STATIC_URL_FILTER` | 1 | 학습 동의가 있고 URL 정적 필터에 적중한 SMS |
| `HIGH_CONFIDENCE_NORMAL` | 0 | 학습 동의가 있고 Encoder가 정상으로 분류한 고신뢰도 SMS |
| `MANUAL_INCIDENT` | 1 | 관리자가 CSV에 추가한 최신 피해 사례 |

사용자 신고 문자와 이미지 OCR 문자는 수집하지 않는다.

문자 분석 화면의 학습 활용 동의 체크박스를 선택하면 frontend가
`allowTrainingUse=true`를 전송한다. 백엔드는 전처리된 SMS와 동의 여부를 함께
로그에 기록한다. 체크하지 않은 문자는 자동 수집 대상에서 제외된다.

### Database Migration

기존 운영 DB에는 수집에 필요한 두 필드를 먼저 추가한다.

```bash
mysql -u <user> -p <database> \
  < backend/migrations/002_training_collection_fields.sql
```

- `consent_for_training`: 사용자가 학습 활용에 동의했는지 기록
- `static_url_match`: 정적 패턴 중 URL이 실제로 적중했는지 기록

마이그레이션 적용 이후에 생성된 로그부터 두 값이 정확하게 쌓인다. 기존 로그는
기본값이 `false`이므로 자동 수집 대상에 포함되지 않는다.

### Manual Incidents

예시 파일을 복사해 실제 입력 파일을 만든다.

```bash
cp \
  encoder_retraining/data/incoming/manual_incidents.example.csv \
  encoder_retraining/data/incoming/manual_incidents.csv
```

필수 컬럼은 `text`이며, `label`은 비워 두면 `1`로 처리된다. 수동 피해 사례
파일에서는 `label=1`만 허용한다.

```csv
text,label,source_id,collected_at
"배송 주소 오류로 반송 예정입니다. <URL>",1,"case-20260615-001","2026-06-15"
```

실제 `manual_incidents.csv`와 생성된 데이터는 Git에 포함하지 않는다.

### Run Collector

루트 `.env`의 `DATABASE_URL`을 사용하려면 다음과 같이 실행한다.

```bash
uv run python encoder_retraining/pipeline/collect_training_data.py
```

직접 경로와 임계값을 지정할 수도 있다.

```bash
uv run python encoder_retraining/pipeline/collect_training_data.py \
  --database-url \
  "mysql+asyncmy://<user>:<password>@<host>:3306/<database>" \
  --manual-path encoder_retraining/data/incoming/manual_incidents.csv \
  --normal-confidence 0.98
```

### Collector Output

각 실행은 UTC 시각을 사용한 새 디렉터리를 만든다.

```text
encoder_retraining/data/collected/<run_id>/
├── incremental_training_data.jsonl
├── label_conflicts.jsonl
└── manifest.json
```

- `incremental_training_data.jsonl`: 재학습에 추가할 데이터
- `label_conflicts.jsonl`: 같은 문장이 0과 1로 수집되어 자동 제외된 목록
- `manifest.json`: 라벨·출처별 수량과 실행 설정

수집기는 매번 조건에 맞는 전체 데이터를 다시 읽고 스냅샷을 만든다. 따라서 같은
DB와 CSV로 다시 실행해도 데이터 행은 중복되지 않는다.

## 2. Build Versioned Dataset

기존 기준 데이터에서만 train/validation/test를 분할하고 수집 데이터는 train에만
추가한다. 새 데이터가 validation/test로 들어가 평가 기준이 매번 달라지는 것을
막기 위한 구조다.

```bash
uv run python encoder_retraining/pipeline/build_training_dataset.py \
  --base-path <기존_기준_데이터.jsonl> \
  --incremental-path \
  encoder_retraining/data/collected/<run_id>/incremental_training_data.jsonl \
  --output-dir encoder_retraining/data/datasets/encoder-v2
```

한 출처가 학습 데이터를 지나치게 많이 차지하지 않게 제한하려면
`--max-per-source 1000`처럼 지정한다.

```text
encoder-v2/
├── train.jsonl
├── valid.jsonl
├── test.jsonl
├── label_conflicts.jsonl
└── manifest.json
```

`manifest.json`에는 원본 파일 해시, 데이터 수, 라벨·출처 분포, 제외 사유를
기록한다. 같은 기준 데이터를 사용하면 seed 42로 validation/test 구성이
재현된다.

## 3. External Cleanlab Output

현재 라벨 품질 점검과 Cleanlab 실행은 PR #24 담당 영역에서 수행한다.
이 PR의 재학습 파이프라인은 `cleaned_dataset.jsonl`이 포함된 Cleanlab audit
산출물 또는 이미 split이 끝난 prepared dataset을 입력으로 받는다.

따라서 이 폴더 안에서 Cleanlab을 다시 실행하지 않는다. 필요한 경우 PR #24에서
생성한 아래 산출물을 S3 prefix 또는 archive로 전달한다.

```text
cleanlab-audit/
├── pred_probs.npy
├── label_audit_report.csv
├── suspected_noisy_labels.csv
├── cleaned_dataset.jsonl
└── audit_log.json
```

`prepare_from_cleanlab_audit.py`는 이 중 `cleaned_dataset.jsonl`을 읽어
`cleaned_train.jsonl`, `valid.jsonl`, `test.jsonl`, `manifest.json` 구조로 변환한다.

## 4. Compare Baseline and Candidate

재학습이 끝나면 같은 fixed test set으로 기존 모델과 후보 모델을 비교한다. 기준을
통과한 경우에만 Hugging Face 업로드나 Endpoint 교체 후보로 본다.

```bash
uv run --group encoder python \
  encoder_retraining/pipeline/compare_encoder_models.py \
  --test-path encoder_retraining/data/datasets/encoder-v2/test.jsonl \
  --baseline-model kdt-2-team4-newbiz/kcelectra-smishing-classifier \
  --candidate-model <새_모델_디렉터리_또는_HF_ID> \
  --output-dir encoder_retraining/data/evaluations/encoder-v2-vs-candidate \
  --min-f1-delta 0.0 \
  --max-fp-increase 0 \
  --max-fn-increase 0
```

```text
encoder-v2-vs-candidate/
├── model_comparison.csv
├── promotion_manifest.json
├── baseline_pred_probs.npy
└── candidate_pred_probs.npy
```

기본 승격 기준은 보수적이다.

- 후보 모델 F1이 기존 모델보다 낮지 않아야 한다.
- false positive가 늘어나면 안 된다.
- false negative가 늘어나면 안 된다.

`promotion_manifest.json`의 `promotion_recommended`가 `true`일 때만 모델 교체
검토 대상으로 사용한다.

## 6. Promote Candidate To Hugging Face

후보 모델이 승격 기준을 통과하면 `promote_encoder_model.py`로 Hugging Face Hub
업로드 패키지를 만들고, 모델 카드와 promotion log를 남긴다.

기본 실행은 dry-run이다. dry-run은 업로드하지 않고 `promotion_manifest.json`,
후보 모델 디렉터리, 버전명, 로그 경로만 검증한다.

```bash
uv run --group encoder python \
  encoder_retraining/pipeline/promote_encoder_model.py \
  --promotion-manifest \
  encoder_retraining/data/runs/encoder-v2/evaluation/promotion_manifest.json \
  --repo-id kdt-2-team4-newbiz/kcelectra-smishing-classifier \
  --model-version encoder-v2
```

실제로 Hugging Face에 업로드하려면 `HF_TOKEN` 인증이 필요하며, 명시적으로
`--upload`를 붙인다.

```bash
uv run --group encoder python \
  encoder_retraining/pipeline/promote_encoder_model.py \
  --promotion-manifest \
  encoder_retraining/data/runs/encoder-v2/evaluation/promotion_manifest.json \
  --repo-id kdt-2-team4-newbiz/kcelectra-smishing-classifier \
  --model-version encoder-v2 \
  --private \
  --upload
```

안전장치는 다음과 같다.

- `promotion_recommended=false`이면 기본적으로 업로드를 막는다.
- 후보 모델 폴더에 `config.json`, `model.safetensors`, tokenizer 파일이 없으면
  실패한다.
- 원본 `final_model/`을 직접 수정하지 않고 별도 `hf_upload/<version>/` staging
  폴더를 만든다.
- 업로드 후 `promotion_log.json`에 repo, version, candidate path, commit 정보를
  남긴다.

Endpoint 교체는 운영 영향이 있으므로 이 단계에서는 자동으로 수행하지 않는다.
Hub 업로드와 로그 확인 후 사람이 Endpoint 재시작 또는 환경변수 변경을 승인한다.

## 7. Run End-to-End Pipeline

전처리와 Cleanlab이 별도 담당 영역에서 완료된 경우에는 `--prepared-dir`을
사용한다. 이 방식은 `encoder_retraining/data/prepared/<dataset_version>/` 아래의
고정 split을 그대로 사용하며, 데이터셋 생성과 Cleanlab 단계는 건너뛴다. 학습은
기본으로 실행되며 오래 걸릴 수 있다.

```bash
uv run --group encoder python \
  encoder_retraining/pipeline/run_retraining_pipeline.py \
  --prepared-dir encoder_retraining/data/prepared/<dataset_version> \
  --output-dir encoder_retraining/data/runs/encoder-v2 \
  --experiments focal_no_oversampling \
  --n-trials 1 \
  --epochs 3
```

`--baseline-model`을 생략하면 현재 운영 Encoder인
`kdt-2-team4-newbiz/kcelectra-smishing-classifier`를 사용한다. runner는 baseline
모델을 기존 모델 평가뿐 아니라 재학습 초기 checkpoint로도 사용한다. 즉 기본
동작은 base KcELECTRA에서 처음부터 다시 학습하는 것이 아니라, 현재 배포 중인
Encoder를 이어서 fine-tuning하는 구조다.

수집 데이터와 기준 데이터를 이 runner 안에서 직접 병합해야 하는 경우에는
`--base-path`와 `--incremental-path`를 사용한다.

```bash
uv run --group encoder python \
  encoder_retraining/pipeline/run_retraining_pipeline.py \
  --base-path <기존_기준_데이터.jsonl> \
  --incremental-path \
  encoder_retraining/data/collected/<run_id>/incremental_training_data.jsonl \
  --output-dir encoder_retraining/data/runs/encoder-v2 \
  --experiments focal_no_oversampling \
  --n-trials 1 \
  --epochs 3
```

실행 결과는 `retraining_pipeline_manifest.json`에 모인다.

```text
encoder-v2/
├── dataset/              # --base-path 방식에서 생성
├── training/
├── evaluation/
├── logs/
└── retraining_pipeline_manifest.json
```

학습 stdout/stderr는 `logs/training_stdout.log`,
`logs/training_stderr.log`에 저장된다. 학습이 실패하면 비교 단계는 건너뛰고,
`retraining_pipeline_manifest.json`의 comparison reason이 `training_failed`로
기록된다.

빠르게 연결만 확인하려면 `--dry-run`을 사용한다. `--dry-run`은 실제 학습 명령과
모델 비교를 건너뛴다. 이미 학습된 후보 모델만 비교하려면 `--skip-training`과
`--candidate-model`을 함께 사용한다.

```bash
uv run --group encoder python \
  encoder_retraining/pipeline/run_retraining_pipeline.py \
  --prepared-dir encoder_retraining/data/prepared/<dataset_version> \
  --output-dir encoder_retraining/data/runs/encoder-v2-dry-run \
  --dry-run
```

## 8. Weekly GitHub Actions Automation

주 1회 자동 실행은 GitHub Actions workflow로 관리한다.

```text
.github/workflows/weekly-encoder-retraining.yml
```

workflow는 `ENCODER_CLEANLAB_AUDIT_URL`의 Cleanlab audit S3 prefix를 우선
다운로드하고, `prepare_from_cleanlab_audit.py`로 prepared dataset을 만든 뒤
`--prepared-dir` 기준으로 재학습 파이프라인을 실행한다. 실제 dataset 파일은
Git에 올리지 않는다. prepared dataset `.tar.gz`를 직접 전달해야 하는 경우에만
`prepared_dataset_url` input 또는 `ENCODER_PREPARED_DATASET_URL` secret을 사용한다.

처음에는 `workflow_dispatch`에서 `use_smoke_dataset=true`, `dry_run=true`로 실행해
workflow wiring만 검증한다. 운영 실행에서는 dry-run을 끄고, artifact의
`promotion_manifest.json`을 확인한 뒤 사람이 Hugging Face 업로드 여부를 결정한다.

자세한 설정은 [automation/README.md](automation/README.md)를 참고한다.
