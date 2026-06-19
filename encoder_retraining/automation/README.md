# Encoder Retraining Automation

이 문서는 `encoder_retraining/` 파이프라인을 GitHub Actions로 주 1회 실행하는
방식을 정리한다.

## Workflow

GitHub Actions workflow:

```text
.github/workflows/weekly-encoder-retraining.yml
```

실행 환경:

```text
self-hosted runner
labels: self-hosted, macOS, ARM64, encoder, mps, team3-advanced-encoder-retraining
```

현재 workflow는 Mac self-hosted runner에서 `astral-sh/setup-uv@v5`를 사용해
`uv`와 Python 3.12 환경을 준비한다. `actions/setup-python`은 이 runner에서
`/Users/runner` 권한 문제로 실패할 수 있어 사용하지 않는다.

권한 충돌을 줄이기 위해 workflow는 `uv`가 사용하는 경로를 명시적으로 고정한다.

```text
AGENT_TOOLSDIRECTORY=$RUNNER_TEMP/tool-cache
RUNNER_TOOL_CACHE=$RUNNER_TEMP/tool-cache
UV_CACHE_DIR=$RUNNER_TEMP/uv-cache
UV_PYTHON_INSTALL_DIR=$RUNNER_TEMP/uv-python
UV_TOOL_DIR=$RUNNER_TEMP/uv-tools
UV_PROJECT_ENVIRONMENT=$GITHUB_WORKSPACE/.venv
UV_LINK_MODE=copy
```

이 설정은 self-hosted runner의 홈 디렉터리나 GitHub-hosted runner 기본 tool-cache
경로에 쓰기 권한이 없을 때도, 현재 job이 접근 가능한 임시 디렉터리와 checkout
workspace 안에서 `uv`, Python, tool, virtualenv를 준비하게 한다.

`setup-uv`의 GitHub cache는 self-hosted runner 권한 문제를 단순화하기 위해
비활성화한다. 대신 위의 로컬 writable 경로를 사용한다.

`team3-advanced-encoder-retraining` 라벨은 이 재학습 workflow 전용 라벨이다.
GitHub runner 설정에서 해당 라벨을 self-hosted runner에 추가해야 job이 할당된다.

지원하는 실행 방식:

- `workflow_dispatch`: 사람이 GitHub UI에서 수동 실행
- `schedule`: 매주 월요일 03:00 KST 자동 실행

## Data Input

재학습 데이터는 Git에 커밋하지 않는다. Actions runner는 실행 시점에 데이터를
내려받는다. 입력 방식은 두 가지다.

1. prepared dataset archive를 바로 받는 방식
2. Cleanlab audit archive를 받아 prepared dataset으로 변환하는 방식

prepared dataset archive를 사용하는 경우에는 아래 위치에 압축을 푼다.

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

Cleanlab audit을 사용하는 경우에는 S3 prefix 또는 archive 안에서
`cleaned_dataset.jsonl`을 찾고, `prepare_from_cleanlab_audit.py`로 같은 prepared
dataset 구조를 생성한다.

```text
cleanlab-audit/
├── pred_probs.npy
├── label_audit_report.csv
├── suspected_noisy_labels.csv
├── cleaned_dataset.jsonl
└── audit_log.json
```

## Required Secrets

주간 자동 실행에는 다음 repository secrets가 필요하다.

| Name | Type | Required | Purpose |
| --- | --- | --- | --- |
| `ENCODER_CLEANLAB_AUDIT_URL` | secret | current required | Cleanlab audit S3 prefix 또는 `.tar.gz` 다운로드 URL |
| `S3_AWS_ACCESS_KEY_ID` | secret | S3 required | S3 다운로드용 AWS access key |
| `S3_AWS_SECRET_ACCESS_KEY` | secret | S3 required | S3 다운로드용 AWS secret key |
| `AWS_REGION` | variable | S3 required | S3 bucket region. 현재 값은 `ap-northeast-2` |

현재 repository에 설정된 값은 위 네 가지가 기준이다. 아래 값들은 workflow가
호환성이나 선택 기능을 위해 읽을 수 있지만, 현재 repository에는 설정되어 있지 않다.

| Name | Type | Purpose |
| --- | --- | --- |
| `ENCODER_PREPARED_DATASET_URL` | secret | prepared dataset `.tar.gz`를 직접 받을 때 사용 |
| `ENCODER_PREPARED_DATASET_BEARER_TOKEN` | secret | private URL 접근용 bearer token |
| `AWS_ACCESS_KEY_ID` | secret | 기존 호환용 S3 access key fallback |
| `AWS_SECRET_ACCESS_KEY` | secret | 기존 호환용 S3 secret key fallback |
| `AWS_SESSION_TOKEN` | secret | 임시 AWS credential 사용 시 session token |
| `HF_TOKEN` | secret | Hugging Face model upload token |

`HF_TOKEN`은 실제 Hugging Face 업로드 단계에서만 필요하다. 현재 repository에는
설정되어 있지 않으므로, `upload_to_hf=true`를 사용하려면 먼저 secret을 추가해야 한다.
현재 자동 재학습 입력은 `ENCODER_CLEANLAB_AUDIT_URL`을 우선 사용한다.

PR #24가 다음처럼 S3 prefix에 Cleanlab 결과 파일 5개를 올리는 경우에는
`ENCODER_CLEANLAB_AUDIT_URL`에 prefix를 그대로 넣는다.

```text
s3://smishing-dev-newbies-2026/cleanlab-audit/<run_name>/<timestamp>/
```

`<run_name>/<timestamp>/`가 매번 바뀌면 상위 prefix만 지정할 수도 있다.

```text
s3://smishing-dev-newbies-2026/cleanlab-audit/
```

workflow는 이 값이 `s3://`로 시작하면 해당 prefix 아래에서 가장 최근
`cleaned_dataset.jsonl`을 찾고, 그 파일이 들어 있는 실행 폴더 전체를
`aws s3 cp --recursive`로 내려받는다. AWS CLI는 self-hosted runner에서
`uv tool run --from awscli aws ...` 형태로 실행한다. 따라서 runner에 AWS CLI를
별도 설치하지 않아도 된다.

prepared dataset을 S3 archive로 받을 때는 `.tar.gz` 객체 경로를 사용한다.

```text
s3://<bucket>/<path>/encoder-v4.tar.gz
```

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

prepared dataset 다운로드는 일시적인 네트워크 실패를 고려해 3회 retry한다. 반면
모델 학습 실패는 데이터나 코드 문제일 가능성이 있으므로 자동 retry하지 않고
workflow를 실패로 종료한다.

Cleanlab audit URL을 사용하는 경우 흐름은 다음과 같다.

```text
Download Cleanlab audit archive
↓
Find cleaned_dataset.jsonl
↓
prepare_from_cleanlab_audit.py
↓
Validate generated prepared dataset
↓
run_retraining_pipeline.py --prepared-dir ...
```

기본 baseline model:

```text
kdt-2-team4-newbiz/kcelectra-smishing-classifier
```

## Promotion Policy

workflow는 후보 모델이 더 좋다고 판단될 때만 Hugging Face 업로드가 가능하다.
`promote_encoder_model.py`는 `promotion_manifest.json`의
`promotion_recommended=true`를 확인한다. 후보 모델이 추천되지 않으면
`promotion_log.json`에 `skipped=true`와 `skip_reason=promotion_not_recommended`를
남기고 업로드 없이 성공 종료한다. 따라서 주간 자동 실행에서 "이번 주에는 교체할
모델이 없음"은 실패가 아니라 정상 상태로 기록된다.

권장 운영 방식:

```text
자동 재학습 + 자동 비교 + artifact 저장
모델 교체는 사람이 promotion_manifest.json 확인 후 승인
```

즉, `upload_to_hf`는 기본적으로 `false`로 두고, 결과가 충분히 좋을 때 수동 실행에서
`true`로 바꾸는 방식을 권장한다.

## Failure Logs

실패 여부와 각 단계의 요약은 다음 파일에서 확인한다.

```text
encoder_retraining/data/runs/<run_id>/retraining_pipeline_manifest.json
```

학습 subprocess가 실패하면 `training.succeeded=false`와 `returncode`가 기록되고,
workflow도 실패로 표시된다. 자세한 로그는 manifest에 기록된 아래 파일을 확인한다.

```text
encoder_retraining/data/runs/<run_id>/logs/training_stdout.log
encoder_retraining/data/runs/<run_id>/logs/training_stderr.log
```

## Notes

- self-hosted runner가 꺼져 있으면 scheduled/manual workflow가 대기 상태에 머문다.
- 비용과 시간을 줄이려면 먼저 `dry_run=true`로 workflow 자체를 검증한다.
- workflow는 `schedule` 또는 repository owner 실행만 허용한다. 현재 owner 계정과
  `Skullking2520`만 수동 실행할 수 있게 job-level `if` 조건을 둔다.
- public repository에서 self-hosted runner를 항상 켜두는 것은 위험할 수 있다.
  private repository에서 운용하거나, public repository라면 외부 collaborator workflow
  승인 정책을 강화하고 신뢰 가능한 workflow를 실행할 때만 runner를 켠다.

## Self-hosted Runner Smoke Result

임시 브랜치 `test/self-hosted-retraining-action`에서 self-hosted runner 연결을
검증했다.

확인된 내용:

- runner label 매칭 및 job 할당 성공
- 로컬 `uv` 기반 Python 3.12 환경 준비 성공
- `uv sync --frozen --group encoder --python 3.12` 성공
- smoke dataset 생성 및 prepared dataset 검증 성공
- `dry_run=false` 상태로 실제 `run_retraining_pipeline.py` 학습 단계 진입 확인
- 장시간 학습 방지를 위해 GitHub Actions run을 의도적으로 취소
