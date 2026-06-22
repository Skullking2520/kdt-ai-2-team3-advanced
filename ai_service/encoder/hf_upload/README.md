# Hugging Face Upload Notes

최종 선택된 Encoder 모델은 Hugging Face Hub에 업로드되어 있다.

```text
kdt-2-team4-newbiz/kcelectra-smishing-classifier
```

Model page:

```text
https://huggingface.co/kdt-2-team4-newbiz/kcelectra-smishing-classifier
```

## Required Files For Upload

업로드용 model directory에는 보통 다음 파일이 필요하다.

```text
config.json
model.safetensors
tokenizer.json
tokenizer_config.json
special_tokens_map.json
README.md
```

`training_args.bin`은 추론 필수 파일은 아니다.

## Promotion Script

재학습 파이프라인에서 생성된 후보 모델은
`encoder_retraining/pipeline/promote_encoder_model.py`로 업로드를 준비한다.

이 스크립트는 `promotion_manifest.json`을 먼저 확인한다.
`promotion_recommended=true`인 경우에만 기본적으로 업로드가 가능하다.

```bash
uv run --group encoder python \
  encoder_retraining/pipeline/promote_encoder_model.py \
  --promotion-manifest <run_dir>/evaluation/promotion_manifest.json \
  --repo-id kdt-2-team4-newbiz/kcelectra-smishing-classifier \
  --model-version encoder-v2
```

위 명령은 dry-run이며 Hugging Face에 업로드하지 않는다.

실제 업로드 시에는 `HF_TOKEN` 인증 후 `--upload`를 명시한다.

```bash
uv run --group encoder python \
  encoder_retraining/pipeline/promote_encoder_model.py \
  --promotion-manifest <run_dir>/evaluation/promotion_manifest.json \
  --repo-id kdt-2-team4-newbiz/kcelectra-smishing-classifier \
  --model-version encoder-v2 \
  --private \
  --upload
```

원본 `final_model/`은 직접 수정하지 않고, 업로드용 staging 폴더에 모델 카드와
필수 파일을 모아 Hub에 올린다.

## Recommended Config Metadata

`config.json`에는 label 의미를 명확히 남긴다.

```json
{
  "num_labels": 2,
  "id2label": {
    "0": "normal",
    "1": "phishing"
  },
  "label2id": {
    "normal": 0,
    "phishing": 1
  },
  "problem_type": "single_label_classification"
}
```

## Score Meaning

Hugging Face text-classification response의 `score`는 예측된 label에 대한
confidence다.

예:

```json
[
  {
    "label": "normal",
    "score": 0.948
  }
]
```

위 결과는 스미싱 위험도가 94.8%라는 뜻이 아니다. 모델이 `normal`이라고 94.8%
확신했다는 뜻이다.

서비스 응답에서는 deploy wrapper가 이를 다음 필드로 정규화한다.

- `label`
- `confidence`
- `risk_level`
- `score`
