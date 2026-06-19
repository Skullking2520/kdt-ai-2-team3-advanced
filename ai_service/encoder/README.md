# Encoder Model

이 폴더는 스미싱 분류 Encoder 모델의 학습 코드, 실험 비교 결과, 선택 모델 정보를
정리한다. 대용량 모델 파일과 원본/전처리 데이터셋은 Git에 포함하지 않는다.

## Selected Model

최종 서비스 연결에 사용한 Encoder는 `focal_no_oversampling` 실험 결과다.

| Item | Value |
| --- | --- |
| Hugging Face model | `kdt-2-team4-newbiz/kcelectra-smishing-classifier` |
| Hugging Face URL | <https://huggingface.co/kdt-2-team4-newbiz/kcelectra-smishing-classifier> |
| Base model | `beomi/KcELECTRA-base` |
| Task | Binary text classification |
| Labels | `0 = normal`, `1 = phishing` |
| Loss | Focal loss |
| Positive oversampling | None |
| Selected experiment | `focal_no_oversampling` |

## Why `focal_no_oversampling`

`focal_no_oversampling`은 비교 실험 중 가장 높은 test F1을 기록했고, precision도
가장 높았다. 스미싱 탐지에서는 recall도 중요하지만, 정상 문자를 과하게 위험으로
분류하는 false positive 비용도 크기 때문에 precision/F1 균형을 기준으로 선택했다.

주요 test 결과:

| Metric | Value |
| --- | ---: |
| Accuracy | 0.9893 |
| F1 | 0.9551 |
| Precision | 0.9459 |
| Recall | 0.9645 |
| False Positive | 193 |
| False Negative | 124 |
| True Negative | 25,833 |
| True Positive | 3,372 |

상세 수치는 [results/focal_no_oversampling/test_metrics.json](results/focal_no_oversampling/test_metrics.json)을 참고한다.

## Experiment Summary

비교한 실험은 다음과 같다.

- `ce_no_oversampling`
- `focal_no_oversampling`
- `focal_positive_oversampling_0p2`
- `focal_positive_oversampling_0p3`
- `focal_positive_oversampling_0p4`
- `focal_positive_oversampling_0p5`
- `focal_positive_oversampling_0p6`
- `focal_positive_oversampling_0p7`

전체 비교 결과는 [results/comparison/experiment_comparison_final.csv](results/comparison/experiment_comparison_final.csv)를 참고한다.

## Training Code

학습 코드는 [encoder_retraining/training/run_kcelectra_retrain_experiments.py](../../encoder_retraining/training/run_kcelectra_retrain_experiments.py)에 있다.

운영 DB의 동의된 SMS와 수동 피해 사례 수집, 고정 평가셋 생성, Cleanlab 품질
검사 방법은 [encoder_retraining/README.md](../../encoder_retraining/README.md)를 참고한다.
재학습 입력 데이터의 위치와 파일 형식은 [encoder_retraining/data/README.md](../../encoder_retraining/data/README.md)에
정리한다.

실행 전 필요한 패키지:

```bash
python -m pip install -r encoder_retraining/training/requirements.txt
```

uv workspace를 사용할 때는 별도 pip 설치 대신 명령에 `--group encoder`를
추가할 수 있다.

예시 실행:

```bash
uv run --group encoder python \
  encoder_retraining/training/run_kcelectra_retrain_experiments.py \
  --data-path <cleaned_dataset.jsonl path> \
  --results-dir ai_service/encoder/results
```

빠른 smoke run:

```bash
uv run --group encoder python \
  encoder_retraining/training/run_kcelectra_retrain_experiments.py \
  --data-path <cleaned_dataset.jsonl path> \
  --results-dir ai_service/encoder/results \
  --n-trials 1 \
  --epochs 1 \
  --experiments ce_no_oversampling
```

전처리와 Cleanlab이 별도 담당 영역에서 완료된 경우에는
`encoder_retraining/data/prepared/<dataset_version>/` 아래의 고정 split을
사용한다.

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

## Preprocessing Notes

현재 Encoder는 전처리된 `text`와 `label` 컬럼을 사용해 학습했다.

주요 전처리 기준:

- `[Web발신]` 문구는 모델 입력에서 제거
- URL은 `<URL>`로 치환
- 금액 표현은 `<MONEY>`로 치환
- 8자리 이상 전화번호 형태는 `<PHONE>`으로 치환
- 5-6자리 인증번호처럼 짧은 숫자는 유지

서비스 추론 시에는 `deploy_wrapper/app`의 wrapper가 Encoder Endpoint 호출 전 동일한 모델
입력 정규화를 적용한다.

## What Is Not Committed

대용량이거나 민감할 수 있는 산출물은 Git에 올리지 않는다.

- 모델 가중치와 압축 파일
- 원본/전처리 dataset
- 개별 prediction dump와 W&B local run
- 재생성 가능한 학습 산출물

모델 파일은 Hugging Face Hub에서 관리한다.
