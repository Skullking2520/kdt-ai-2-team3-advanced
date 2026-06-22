# AI 모델 정량 평가 (발표자료 / QnA)

encoder/results/ 의 실제 학습 산출물 기반. 발표 때 그대로 인용 가능.

## 최종 선택 모델

**`focal_no_oversampling`**

- Hugging Face: <https://huggingface.co/kdt-2-team4-newbiz/kcelectra-smishing-classifier>
- Base: `beomi/KcELECTRA-base`
- Loss: Focal loss
- Positive oversampling: None
- Task: Binary text classification (`0 = normal`, `1 = phishing`)

## 핵심 메트릭 (test set 29,522건)

| Metric | Value |
| --- | ---: |
| Accuracy | **0.9893** (98.93%) |
| F1 | **0.9551** (95.51%) |
| Precision | **0.9459** (94.59%) |
| Recall | **0.9645** (96.45%) |
| True Negative (정상->정상) | 25,833 |
| True Positive (스미싱->스미싱) | 3,372 |
| False Positive (정상->스미싱) | 193 |
| False Negative (스미싱->정상) | 124 |
| Test set size | 29,522 |

> 출처: `ai_service/encoder/results/focal_no_oversampling/test_metrics.json`

## 왜 `focal_no_oversampling` 인가

비교 실험 8개의 test F1 / Precision / Recall 표 (출처: `comparison/experiment_comparison_final.csv`):

| Experiment | F1 | Precision | Recall | FP | FN |
| --- | ---: | ---: | ---: | ---: | ---: |
| `ce_no_oversampling` | 0.9551 | 0.9431 | 0.9674 | 204 | 114 |
| **`focal_no_oversampling`** | **0.9551** | **0.9459** | **0.9645** | **193** | **124** |
| `focal_positive_oversampling_0p2` | 0.9544 | 0.9428 | 0.9662 | 205 | 118 |
| `focal_positive_oversampling_0p3` | 0.9538 | 0.9420 | 0.9660 | 208 | 119 |
| `focal_positive_oversampling_0p4` | 0.9517 | 0.9373 | 0.9665 | 226 | 117 |
| `focal_positive_oversampling_0p5` | 0.9515 | 0.9373 | 0.9662 | 226 | 118 |
| `focal_positive_oversampling_0p6` | 0.9536 | 0.9383 | 0.9694 | 223 | 107 |
| `focal_positive_oversampling_0p7` | 0.9516 | 0.9370 | 0.9665 | 227 | 117 |

- `ce_no_oversampling`과 `focal_no_oversampling`의 F1은 사실상 동률(소수 5째자리 차이)
- **Focal loss + oversampling 없음** 버전이 Precision이 가장 높고 FP가 가장 적음 (193건 vs CE 204건)
- 스미싱 탐지에서 **정상 문자를 위험으로 잘못 분류하는 FP 비용이 매우 크다** (사용자 신뢰도 하락, 알림 피로). Precision/F1 균형 + FP 최소화로 선택

## Optuna 하이퍼파라미터 탐색

- 1 trial (best_trial_number=0, 베이스라인 학습)
- Best valid F1: 0.9594

Best params (`comparison/best_params.json`):

| Hyperparameter | Value |
| --- | ---: |
| learning_rate | 2.098e-05 |
| batch_size | 8 |
| gradient_accumulation_steps | 2 |
| max_length | 128 |
| weight_decay | 0.0340 |
| warmup_ratio | 0.0491 |
| epochs | 3 |

## 발표에서 쓰는 한 줄

> "KcELECTRA 기반 이진 분류 모델을 8개 실험으로 비교했고, Focal loss + oversampling 없음 조합으로 **F1 95.51%, Precision 94.59%, Recall 96.45%** (test 29,522건). 정상 문자의 오탐(FP) 193건으로 최소화."

## QnA 답변용 숫자

- F1: **0.9551** (95.51%)
- Precision: **0.9459** (94.59%)
- Recall: **0.9645** (96.45%)
- Test set: **29,522건**
- 학습 데이터: encoder/training/run_kcelectra_retrain_experiments.py (재현 가능)

> 주의: QnA 스크립트 초안에 적힌 "F1 0.97" 은 실제 값(0.9551)과 다르므로 **0.9551 로 정정 필수**.
