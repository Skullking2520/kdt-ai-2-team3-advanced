# Encoder Retraining Automation

이 문서는 `encoder_retraining/` 파이프라인을 GitHub Actions로 주 1회 실행하는
방식을 정리한다.

## Workflow

GitHub Actions workflow:

```text
.github/workflows/weekly-encoder-retraining.yml
```

지원하는 실행 방식:

- `workflow_dispatch`: 사람이 GitHub UI에서 수동 실행
- `schedule`: 매주 월요일 03:00 KST 자동 실행

## Data Input

재학습 데이터는 Git에 커밋하지 않는다. Actions runner는 실행 시점에 prepared
dataset archive를 내려받아 아래 위치에 압축을 푼다.

```text
encoder_retraining/data/prepared/<dataset_version>/
├── cleaned_train.jsonl
├── valid.jsonl
├── test.jsonl
└── manifest.json
```

archive는 `.tar.gz` 형식을 사용한다. 압축 파일 안에는 다음 파일이 루트에 있어야
한다.

```text
cleaned_train.jsonl
valid.jsonl
test.jsonl
manifest.json
```

## Required Secrets

주간 자동 실행에는 다음 repository secrets가 필요하다.

| Secret | Required | Purpose |
| --- | --- | --- |
| `ENCODER_PREPARED_DATASET_URL` | yes | prepared dataset `.tar.gz` 다운로드 URL |
| `ENCODER_PREPARED_DATASET_BEARER_TOKEN` | optional | private URL 접근용 bearer token |
| `HF_TOKEN` | upload only | Hugging Face model upload token |

`HF_TOKEN`은 실제 업로드 단계에서만 필요하다. dry-run이나 단순 재학습/비교에는
필수는 아니다.

## Manual Smoke Test

처음에는 실제 데이터 없이 smoke dataset으로 workflow wiring만 확인한다.

GitHub UI에서:

```text
Actions
→ Weekly Encoder Retraining
→ Run workflow
```

권장 입력:

```text
dataset_version: encoder-smoke
use_smoke_dataset: true
dry_run: true
upload_to_hf: false
epochs: 1
n_trials: 1
```

이 실행은 아주 작은 임시 JSONL을 만들어 `--prepared-dir` 흐름과 artifact 업로드만
검증한다. 모델 성능을 평가하지 않는다.

## Weekly Retraining Run

실제 주간 실행은 다음 흐름이다.

```text
Download prepared dataset archive
↓
Validate cleaned_train/valid/test files
↓
run_retraining_pipeline.py --prepared-dir ...
↓
Upload retraining artifacts
↓
Optional Hugging Face upload
```

기본 baseline model:

```text
kdt-2-team4-newbiz/kcelectra-smishing-classifier
```

## Promotion Policy

workflow는 후보 모델이 더 좋다고 판단될 때만 Hugging Face 업로드가 가능하다.
`promote_encoder_model.py`는 `promotion_manifest.json`의
`promotion_recommended=true`를 확인한다.

권장 운영 방식:

```text
자동 재학습 + 자동 비교 + artifact 저장
모델 교체는 사람이 promotion_manifest.json 확인 후 승인
```

즉, `upload_to_hf`는 기본적으로 `false`로 두고, 결과가 충분히 좋을 때 수동 실행에서
`true`로 바꾸는 방식을 권장한다.

## Notes

- GitHub-hosted runner는 CPU 기반이므로 학습 시간이 길 수 있다.
- 비용과 시간을 줄이려면 먼저 `dry_run=true`로 workflow 자체를 검증한다.
- GPU 기반 주간 학습이 필요해지면 Modal, RunPod, self-hosted runner로 옮기는 것을
  검토한다.
