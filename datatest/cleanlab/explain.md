# Cleanlab Label Noise Audit — 설명서

## 목적

SMS 피싱 탐지 데이터셋에서 **잘못 레이블된 샘플(노이즈 레이블)** 을 자동으로 찾아내고, W&B 모니터링 + S3 로그 보관.

---

## 실행 환경

```bash
# Python 인터프리터 (torch 포함된 venv)
/Users/nyongd/Documents/GitHub/kdt-ai-2-team4-advanced/datatest/test-code/.venv/bin/python3

# 의존성 설치
VIRTUAL_ENV=datatest/test-code/.venv uv pip install cleanlab wandb boto3 datasets accelerate scikit-learn
```

---

## 두 가지 실행 모드

### A. K-fold CV (기본, 정확)

```
beomi/KcELECTRA-base
        │
  K-fold 교차검증 (기본 5-fold)
  각 fold마다:
    - base 모델 새로 로드
    - train fold로 fine-tune (2 epoch)
    - val fold에서 softmax 확률 예측
        │
  pred_probs.npy (91500, 2)
  → 각 샘플: 자신을 학습하지 않은 모델이 예측한 확률 (out-of-sample)
        │
  Cleanlab → 노이즈 탐지 (정확)
```

- MPS 기준 속도: ~2.4 it/s → fold당 ~63분 → 5-fold 총 ~5시간
- 정확: 각 샘플 out-of-sample 예측 → Cleanlab 이론에 부합

### B. Direct Inference (`--direct-inference`, 빠름)

```
kdt-2-team4-newbiz/kcelectra-smishing-classifier
        │
  전체 데이터셋 1회 추론
        │
  pred_probs.npy
  → 주의: 학습 데이터와 동일하면 in-sample 편향
        │
  Cleanlab → 명백한 오류만 탐지 (누락 多)
```

- 시간: ~5-10분
- 용도: 빠른 탐색, 노이즈 규모 대략 파악

---

## 왜 K-fold가 더 정확한가

Cleanlab은 **out-of-sample 확률**이 필요.
학습 데이터로 만든 모델 → 과적합 → 모든 레이블 "맞다" → 노이즈 탐지 불가.
K-fold: 각 fold의 val 샘플을 학습에 사용 안 함 → 진짜 확률 획득.

---

## 사용 모델

| 역할 | 모델 |
|---|---|
| K-fold base (각 fold 학습 시작점) | `beomi/KcELECTRA-base` |
| Tokenizer & Direct Inference | `kdt-2-team4-newbiz/kcelectra-smishing-classifier` |

---

## 데이터셋

| 항목 | 수치 |
|---|---|
| 전체 라인 | 94,897 |
| label=0 (정상) | 52,095 |
| label=1 (피싱) | 39,405 |
| label=None (제외) | 3,397 |
| 실제 사용 | 91,500 |

---

## 실행 명령어

> 아래 모든 명령어는 `PYTHON=datatest/test-code/.venv/bin/python3` 기준.

### Stage 1 — 빠른 테스트 (1,000개, 3-fold, ~10분)

```bash
$PYTHON run_cleanlab_label_audit.py \
    --data-path "/path/to/final_data.jsonl" \
    --subsample 1000 --n-splits 3 --epochs 2 \
    --use-wandb --wandb-project smishing-cleanlab-audit \
    --wandb-run-name cleanlab_stage1_test
```

### Stage 2 — Direct inference 전체 탐색 (91K, ~10분)

```bash
$PYTHON run_cleanlab_label_audit.py \
    --data-path "/path/to/final_data.jsonl" \
    --direct-inference \
    --use-wandb --wandb-project smishing-cleanlab-audit \
    --wandb-run-name cleanlab_stage2_direct
```

### Stage 3 — K-fold 정확 분석 (91K, 5-fold, ~5시간)

```bash
$PYTHON run_cleanlab_label_audit.py \
    --data-path "/path/to/final_data.jsonl" \
    --n-splits 5 --epochs 2 \
    --use-wandb --wandb-project smishing-cleanlab-audit \
    --wandb-run-name cleanlab_stage3_kfold5
```

### pred_probs 캐시 재사용 (K-fold 스킵)

```bash
$PYTHON run_cleanlab_label_audit.py \
    --data-path "/path/to/final_data.jsonl" \
    --use-cached-probs --use-wandb
```

---

## 실제 실행 결과 (2026-06-17)

| 단계 | 모드 | 샘플 수 | 노이즈 의심 | 비율 | label=0 의심 | label=1 의심 | 정제 후 |
|---|---|---|---|---|---|---|---|
| Stage 1 | K-fold 3-fold | 1,000 | 79 | 7.90% | 57 | 22 | 921 |
| Stage 2 | Direct inference | 91,500 | 652 | 0.71% | 317 | 335 | 90,848 |
| Stage 3 | K-fold 5-fold | 91,500 | 진행 중 | - | - | - | - |

> Stage 2의 낮은 비율(0.71%)은 in-sample 편향 때문. Stage 3 완료 후 실제 비율 확인 예정.

---

## 출력 파일 (`results/{stage}/`)

| 파일 | 내용 | 목적 |
|---|---|---|
| `pred_probs.npy` | 각 샘플의 softmax 확률 | K-fold는 수 시간 소요 → 캐시 보관. `--use-cached-probs`로 Cleanlab 파라미터만 바꿔 재실험 가능 |
| `label_audit_report.csv` | 전체 샘플 + 노이즈 여부 + 품질 점수 | 전체 91K 수동 검토용 스프레드시트 |
| `suspected_noisy_labels.csv` | 노이즈 의심 샘플만 (품질 점수 낮은 순) | 사람이 직접 보고 레이블 수정할 목록 |
| `cleaned_dataset.jsonl` | 노이즈 제거 정제 데이터셋 | 바로 다음 모델 학습에 투입 가능한 형태 |
| `audit_log.json` | 실행 메타데이터 (타임스탬프, 파라미터, 결과 요약) | S3 기록 + "어떤 설정으로 돌렸는지" 추적용 |

### stage별 디렉토리를 분리하는 이유

stage마다 모드(subsample/direct/kfold)와 파라미터가 다름 → 같은 폴더 사용 시 파일 덮어씀.
특히 `pred_probs.npy`는 stage마다 다른 방식으로 생성되므로 혼용 불가:

```
results/
├── stage1/   # subsample 1000, 3-fold → pred_probs (1000, 2)
├── stage2/   # direct inference 91K  → pred_probs (91500, 2), in-sample 편향
└── stage3/   # kfold 5-fold 91K      → pred_probs (91500, 2), out-of-sample (정확)
```

---

## S3 로그

완료 시 자동 업로드:
```
s3://smishing-dev-newbies-2026/cleanlab-audit/{run_name}/{timestamp}/
  ├── pred_probs.npy
  ├── label_audit_report.csv
  ├── suspected_noisy_labels.csv
  ├── cleaned_dataset.jsonl
  └── audit_log.json
```

버킷 확인:
```bash
aws s3 ls s3://smishing-dev-newbies-2026/cleanlab-audit/
```

---

## W&B 로깅 항목

| 지표 | 설명 |
|---|---|
| `cleanlab/issue_rate` | 전체 중 노이즈 의심 비율 |
| `cleanlab/n_label_issues` | 노이즈 의심 샘플 수 |
| `cleanlab/issues_label_0_normal` | 정상(0) 레이블 중 의심 수 |
| `cleanlab/issues_label_1_smishing` | 피싱(1) 레이블 중 의심 수 |
| `cleanlab/label_quality_score_dist` | 품질 점수 분포 히스토그램 |
| `cleanlab/top_noisy_samples` | 상위 300개 의심 샘플 텍스트 테이블 |

W&B 프로젝트: https://wandb.ai/wcddonggun-pro-ai-/smishing-cleanlab-audit

---

## 추천 흐름

1. Stage 1: 동작 확인 (1,000개, 3-fold, ~10분)
2. Stage 2: 전체 빠른 탐색 (91K, direct, ~10분) → 노이즈 규모 대략 파악
3. Stage 3: 정확한 분석 (91K, 5-fold, ~5시간) → 신뢰할 수 있는 결과
4. `--use-cached-probs`로 Stage 3 pred_probs 재사용, Cleanlab 파라미터 조정 실험

---

## Stage 3 진행 상황 확인

```bash
tail -f datatest/cleanlab/results/stage3_run.log
```
