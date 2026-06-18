# Cleanlab Label Noise Audit

SMS 피싱 탐지 데이터셋에서 잘못 레이블된 샘플을 자동 탐지하고, 정제된 데이터를 재학습용 스키마로 변환.

---

## 전체 파일 구조

```
datatest/cleanlab/
├── run_cleanlab_label_audit.py   # 노이즈 탐지 실행
├── generate_report.py            # HTML 리포트 생성
├── prepare_dataset.py            # 재학습용 데이터셋 변환
├── explain.md                    # 이 문서
└── results/
    └── stage3/                   # 최종 결과 (91K, 5-fold)
        ├── fold_0/ ~ fold_4/     # K-fold 학습 과정 로그
        ├── pred_probs.npy        # out-of-sample 확률값 캐시
        ├── label_audit_report.csv
        ├── suspected_noisy_labels.csv
        ├── cleaned_dataset.jsonl
        ├── audit_log.json
        └── report.html

encoder_retraining/data/prepared/
└── encoder-v4/                   # 재학습 투입용
    ├── cleaned_train.jsonl
    ├── valid.jsonl
    ├── test.jsonl
    └── manifest.json
```

> stage1, stage2 결과는 S3에 보관됨 (로컬 삭제).

---

## 실행 환경

```bash
PYTHON=/Users/nyongd/Documents/GitHub/kdt-ai-2-team4-advanced/datatest/test-code/.venv/bin/python3

# 의존성 설치
VIRTUAL_ENV=datatest/test-code/.venv uv pip install cleanlab boto3 datasets accelerate scikit-learn
```

---

## 두 가지 실행 모드

### A. K-fold CV (정확, 느림)
`beomi/KcELECTRA-base`를 각 fold마다 새로 학습 → val 샘플 예측.
각 샘플은 자신을 학습하지 않은 모델이 예측 → **out-of-sample** → Cleanlab 신뢰 가능.

- MPS 기준: ~5시간 (91K, 5-fold, 2 epoch)
- fold별 학습 과정은 `results/stage3/fold_*/` 에 기록

### B. Direct Inference (빠름, 편향 있음)
`kdt-2-team4-newbiz/kcelectra-smishing-classifier`로 1회 추론.
같은 데이터로 학습된 모델이 같은 데이터에 예측 → **in-sample 편향** → 노이즈 과소 탐지.

- 시간: ~10분 / 용도: 빠른 규모 파악

---

## 실행 명령어

```bash
# 1. 동작 확인 (1K, 3-fold, ~10분)
$PYTHON run_cleanlab_label_audit.py \
    --data-path "/path/to/final_data.jsonl" \
    --output-dir results/stage_test \
    --subsample 1000 --n-splits 3

# 2. 빠른 전체 탐색 (91K, direct, ~10분)
$PYTHON run_cleanlab_label_audit.py \
    --data-path "/path/to/final_data.jsonl" \
    --output-dir results/stage_direct \
    --direct-inference

# 3. 정확한 분석 (91K, 5-fold, ~5시간)
$PYTHON run_cleanlab_label_audit.py \
    --data-path "/path/to/final_data.jsonl" \
    --output-dir results/stage3

# pred_probs 캐시 재사용 (Cleanlab만 재실행)
$PYTHON run_cleanlab_label_audit.py \
    --data-path "/path/to/final_data.jsonl" \
    --output-dir results/stage3 \
    --use-cached-probs

# HTML 리포트 생성
$PYTHON generate_report.py --results-dir results/stage3

# 재학습용 데이터셋 변환
$PYTHON prepare_dataset.py \
    --cleaned-data results/stage3/cleaned_dataset.jsonl \
    --dataset-version encoder-v4
```

---

## 출력 파일

| 파일 | 목적 |
|---|---|
| `fold_0/ ~ fold_4/` | K-fold 학습 과정 로그. 재현성 보장 |
| `pred_probs.npy` | K-fold 결과 캐시. `--use-cached-probs`로 재사용 가능 |
| `label_audit_report.csv` | 전체 91K + 노이즈 여부 + 품질점수. 수동 검토용 |
| `suspected_noisy_labels.csv` | 노이즈 의심 샘플만, 품질점수 낮은 순. 레이블 수정 목록 |
| `cleaned_dataset.jsonl` | 노이즈 제거 데이터. `prepare_dataset.py` 입력 |
| `audit_log.json` | 실행 파라미터 + 결과 요약. S3 자동 업로드 |
| `report.html` | 팀원 공유용. 브라우저에서 바로 열림 |

---

## 재학습용 데이터셋 스키마

`prepare_dataset.py`가 `cleaned_dataset.jsonl` → `encoder_retraining/data/prepared/<version>/` 변환.

```
encoder-v4/
├── cleaned_train.jsonl   # 71,913개 (80%)
├── valid.jsonl           #  8,989개 (10%)
├── test.jsonl            #  8,990개 (10%)
└── manifest.json         # 버전, 출처, 샘플 수, 레이블 매핑
```

split: 80/10/10 stratified. 레이블 비율 유지.

버전 업 시:
```bash
$PYTHON prepare_dataset.py --dataset-version encoder-v5
```

---

## 실제 실행 결과 (2026-06-17)

| 단계 | 모드 | 노이즈 | 비율 | 비고 |
|---|---|---|---|---|
| Stage 1 | K-fold 3-fold / 1K | 79 | 7.90% | 샘플 작아 불안정 |
| Stage 2 | Direct inference / 91K | 652 | 0.71% | in-sample 편향 → 과소 탐지 |
| **Stage 3** | **K-fold 5-fold / 91K** | **1,608** | **1.76%** | **최종 결과** |

Stage 3 노이즈 1,608개:
- label=0 (정상) 중 의심: 881개
- label=1 (피싱) 중 의심: 727개
- 정제 후: 89,892개 → encoder-v4 학습 데이터 71,913개

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

```bash
aws s3 ls s3://smishing-dev-newbies-2026/cleanlab-audit/ --recursive
```

---

## 사용 모델

| 역할 | 모델 |
|---|---|
| K-fold 학습 base | `beomi/KcELECTRA-base` |
| Tokenizer / Direct Inference | `kdt-2-team4-newbiz/kcelectra-smishing-classifier` |
