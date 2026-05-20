# Encoder Results

이 폴더에는 Encoder 실험 결과 중 Git에 올려도 되는 작은 요약 파일만 둔다.

## Included

- `focal_no_oversampling/test_metrics.json`
- `comparison/best_params.json`
- `comparison/optuna_summary.json`
- `comparison/experiment_comparison_final.csv`

## Excluded

다음 파일은 대용량이거나 재생성 가능한 산출물이므로 Git에 포함하지 않는다.

- `final_model/`
- `model.safetensors`
- `training_args.bin`
- `test_predictions.csv`
- plot image
- W&B local run
- dataset files

## Selected Result

현재 배포 모델은 `focal_no_oversampling`이다.

Hugging Face:

```text
https://huggingface.co/kdt-2-team4-newbiz/kcelectra-smishing-classifier
```

