# Encoder Endpoint Deployment

이 문서는 `focal_no_oversampling`으로 선택한 KcELECTRA encoder 모델을
Hugging Face Dedicated Inference Endpoint에 배포하고 deploy wrapper와 연결하는
절차를 정리한다.

## Selected Local Model

현재 사용할 encoder 모델:

```text
modeling_help_local/encoder_test/results/focal_no_oversampling/final_model
```

GitHub에 올리지 않는 로컬 업로드 준비 폴더:

```text
modeling_help_local/hf_upload/encoder_focal_no_oversampling
```

업로드 준비 폴더에는 다음 metadata를 추가한다.

```json
{
  "num_labels": 2,
  "id2label": {
    "0": "normal",
    "1": "phishing"
  },
  "problem_type": "single_label_classification",
  "tokenizer_class": "PreTrainedTokenizerFast",
  "label2id": {
    "normal": 0,
    "phishing": 1
  }
}
```

또한 `special_tokens_map.json`을 추가한다.

```json
{
  "unk_token": "[UNK]",
  "sep_token": "[SEP]",
  "pad_token": "[PAD]",
  "cls_token": "[CLS]",
  "mask_token": "[MASK]"
}
```

업로드 전 로컬 확인 결과, upload folder는
`AutoModelForSequenceClassification`, `AutoTokenizer`, `pipeline("text-classification")`
로 정상 로드되고 다음 label을 반환했다.

```text
오늘 저녁에 밥 먹을래? -> normal
[Web발신] 고객님의 계좌가 정지되었습니다. http://fake.kr/track -> phishing
```

## Upload To Hugging Face Hub

Hugging Face CLI가 필요하다.

```bash
python -m pip install -U huggingface_hub
huggingface-cli login
```

모델 repo를 만든 뒤 local upload folder를 업로드한다.

```bash
huggingface-cli repo create kcelectra-smishing-classifier --type model

huggingface-cli upload \
  <HF_USERNAME_OR_ORG>/kcelectra-smishing-classifier \
  modeling_help_local/hf_upload/encoder_focal_no_oversampling \
  . \
  --repo-type model
```

실제 repo 이름은 팀 naming에 맞춰 바꾼다.

## Create Dedicated Inference Endpoint

Hugging Face 웹 UI에서 진행한다.

```text
Model page
-> Deploy
-> Inference Endpoints
-> 새 endpoint 생성
```

권장 설정:

| Field | Value |
| --- | --- |
| Task | Text Classification |
| Model | `<HF_USERNAME_OR_ORG>/kcelectra-smishing-classifier` |
| Endpoint type | Protected |
| Hardware | CPU로 먼저 smoke test, latency가 크면 GPU 검토 |
| Scale to zero | 비용 절감 필요 시 검토 |

Endpoint가 `Running` 상태가 되면 endpoint URL을 복사한다.

현재 생성된 CPU endpoint:

```text
https://yivp6hva59vxaxs2.eu-west-1.aws.endpoints.huggingface.cloud
```

## Connect Deploy Wrapper

실제 secret 값은 Git에 올리지 않는다. 로컬 `.env` 또는 실행 환경에만 넣는다.

```text
AI_SERVICE_MODE=hf_endpoint
HF_SERVING_TYPE=endpoint
HF_TOKEN=<real token>
ENCODER_ENDPOINT_URL=<encoder endpoint url>
ENCODER_PREPROCESS_ENABLED=true
ENCODER_REQUEST_FORMAT=hf_inputs

DECODER_API_TYPE=chat_completion
DECODER_MODEL_ID=Qwen/Qwen3-1.7B
DECODER_REQUIRED=false
DECODER_ON_NORMAL=false

ENCODER_MODEL_ID=<HF_USERNAME_OR_ORG>/kcelectra-smishing-classifier
ENCODER_MODEL_VERSION=v1.0.0
```

Decoder 연결 전 encoder만 먼저 테스트해야 하면 `DECODER_REQUIRED=false`를 사용한다.
이 경우 decoder 설정이 없어도 deploy wrapper가 encoder 결과와 정적 fallback reason으로
응답한다.

현재 CPU endpoint 기준 예시:

```text
ENCODER_ENDPOINT_URL=https://yivp6hva59vxaxs2.eu-west-1.aws.endpoints.huggingface.cloud
ENCODER_PREPROCESS_ENABLED=true
ENCODER_MODEL_ID=Skullking1123/kcelectra-smishing-classifier
ENCODER_MODEL_VERSION=v1.0.0
```

## Smoke Test

Deploy wrapper 실행:

```bash
cd deploy
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

Readiness:

```bash
curl http://localhost:8001/ready
```

Encoder endpoint 직접 확인:

```bash
curl -X POST \
  https://yivp6hva59vxaxs2.eu-west-1.aws.endpoints.huggingface.cloud \
  -H "Authorization: Bearer <HF_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"inputs":"배송 주소 오류로 반송 예정입니다. <URL>"}'
```

현재 encoder는 학습 때 전처리된 `text` 컬럼으로 학습되었다. 따라서 운영에서도
endpoint에 넣는 문장은 같은 규칙으로 맞추는 것이 좋다.

예시:

| Raw input | Encoder input |
| --- | --- |
| `[Web발신] 배송 주소 오류로 반송 예정입니다. http://fake.kr/track` | `배송 주소 오류로 반송 예정입니다. <URL>` |
| `[Web발신] 인증번호 123456 입니다.` | `인증번호 123456 입니다.` |
| `연락주세요 010-1234-5678` | `연락주세요 <PHONE>` |

deploy wrapper는 기본값 `ENCODER_PREPROCESS_ENABLED=true`로 이 전처리를 적용한다.

Encoder만 deploy wrapper 경유로 먼저 확인하려면 decoder 호출을 피할 수 있는
정상 예시 문장부터 사용한다. `DECODER_ON_NORMAL=false`이면 Encoder가 `normal`을
반환할 때 decoder를 호출하지 않는다.

```bash
curl -X POST http://localhost:8001/analyze \
  -H "Content-Type: application/json" \
  -H "X-Request-ID: encoder-normal-smoke-test" \
  -d '{"text":"오늘 저녁에 밥 먹을래?"}'
```

Analyze:

```bash
curl -X POST http://localhost:8001/analyze \
  -H "Content-Type: application/json" \
  -H "X-Request-ID: encoder-endpoint-smoke-test" \
  -d '{"text":"배송 주소 오류로 반송 예정입니다. http://fake.kr/track"}'
```

확인할 값:

- `success=true`
- `label`이 `normal` 또는 `phishing`
- `confidence`가 0.0부터 1.0 사이
- `score`가 0부터 100 사이
- `encoder_model_id`가 업로드한 HF model ID
- secret 값이 response나 log에 노출되지 않음

## Verified Result

Encoder endpoint direct curl:

```json
[
  {
    "label": "phishing",
    "score": 0.9205116629600525
  }
]
```

Deploy wrapper readiness:

```json
{
  "ready": true,
  "service": "deploy_wrapper",
  "serving_mode": "hf_endpoint",
  "hf_serving_type": "endpoint",
  "decoder_on_normal": false,
  "errors": []
}
```

Deploy wrapper normal response:

```json
{
  "success": true,
  "label": "normal",
  "confidence": 0.9936489462852478,
  "reason": "피싱으로 의심되는 강한 표현이나 링크 클릭 유도 패턴이 뚜렷하지 않습니다.",
  "features": [],
  "risk_level": "정상 가능성 높음",
  "score": 1,
  "encoder_model_id": "Skullking1123/kcelectra-smishing-classifier",
  "encoder_model_version": "v1.0.0",
  "serving_mode": "hf_endpoint"
}
```

Deploy wrapper phishing response:

```json
{
  "success": true,
  "label": "phishing",
  "confidence": 0.9205116629600525,
  "reason": "모델이 스미싱 위험이 높은 문자로 분류했습니다. 링크 접속, 개인정보 입력, 금전 요구 여부를 주의해야 합니다.",
  "features": [],
  "risk_level": "위험 높음",
  "score": 92,
  "encoder_model_id": "Skullking1123/kcelectra-smishing-classifier",
  "encoder_model_version": "v1.0.0",
  "serving_mode": "hf_endpoint"
}
```

현재 HF 기본 text-classification endpoint는 `label`, `score`만 반환하므로
`features`는 빈 배열이다. Decoder 또는 backend static pre-filtering이 붙기 전까지
`reason`은 deploy wrapper fallback 문구를 사용한다.

## Notes

- Hugging Face Inference Endpoints의 protected endpoint는 public internet에서
  접근 가능하지만 유효한 Hugging Face token이 필요하다.
- Text Classification은 Hugging Face managed Inference Endpoint 지원 task다.
- Endpoint 생성 후 첫 요청은 cold start로 느릴 수 있다.

## Troubleshooting

### Endpoint starts with `vllm` and fails

Encoder endpoint logs에 다음처럼 `vllm` 관련 traceback이 보이면 endpoint runtime이
잘못 선택된 것이다.

```text
/usr/local/bin/vllm
RuntimeError: Failed to infer device type
```

`vllm`은 LLM text-generation/chat serving에 가까운 runtime이고,
KcELECTRA encoder는 `ElectraForSequenceClassification` 기반 text-classification
모델이다. 이 경우 기존 endpoint를 계속 고치기보다 endpoint를 새로 만드는 것이
가장 빠르다.

새 endpoint 생성 시 확인할 값:

| Field | Required value |
| --- | --- |
| Task | Text Classification |
| Framework/runtime | Transformers 또는 PyTorch text-classification |
| Do not use | vLLM, TGI, Text Generation runtime |
| Hardware | CPU로 먼저 테스트 |
| Model | `Skullking1123/kcelectra-smishing-classifier` |

HF UI에서 선택지가 자동으로 LLM runtime으로 잡히면 model card의 YAML metadata와
`config.json`을 다시 확인한다.

Model card 맨 위:

```yaml
---
library_name: transformers
pipeline_tag: text-classification
---
```

`config.json`:

```json
{
  "architectures": ["ElectraForSequenceClassification"],
  "model_type": "electra",
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
