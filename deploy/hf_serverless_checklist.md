# Hugging Face Serverless Connection Checklist

이 문서는 모델링팀이 Encoder 모델을 Hugging Face Hub에 올린 뒤
deploy wrapper를 실제 HF serverless API와 연결할 때 확인할 항목을 정리한다.

## Required Inputs From Modeling

- Encoder model ID
- Encoder model version 또는 revision
- Encoder label mapping
  - `LABEL_0`이 정상인지 확인
  - `LABEL_1`이 스미싱인지 확인
- Encoder input format
  - raw text를 바로 받는지 확인
  - 모델 repository 내부에서 전처리를 수행하는지 확인
  - 호출자가 `<URL>`, `<PHONE>`, `<MONEY>` 치환을 해야 하는지 확인
- Encoder response shape
  - HF 기본 text-classification response인지 확인
  - prototype response를 그대로 반환하는 custom handler인지 확인
- Decoder model ID
- Decoder model version 또는 revision
- Decoder task
  - 현재 deploy wrapper는 text-generation 응답을 기준으로 정규화한다.

## Environment Settings

HF serverless API를 사용할 때는 다음 값을 secret 또는 실행 환경에 주입한다.

```text
AI_SERVICE_MODE=hf_endpoint
HF_SERVING_TYPE=serverless
HF_TOKEN=
HF_SERVERLESS_BASE_URL=https://router.huggingface.co/hf-inference/models

ENCODER_MODEL_ID=team/kcelectra-smishing-classifier
ENCODER_MODEL_VERSION=v1.0.0

DECODER_MODEL_ID=team/decoder-explainer
DECODER_MODEL_VERSION=v1.0.0

REQUEST_TIMEOUT_SECONDS=60
HF_MAX_RETRIES=2
HF_RETRY_BACKOFF_SECONDS=0.5
DECODER_ON_NORMAL=false
```

실제 `HF_TOKEN` 값은 `.env.example`이나 문서에 작성하지 않는다.

## Expected Encoder Responses

HF 기본 text-classification response 예시:

```json
[
  [
    {
      "label": "LABEL_0",
      "score": 0.09
    },
    {
      "label": "LABEL_1",
      "score": 0.91
    }
  ]
]
```

또는 다음처럼 list of objects로 올 수 있다.

```json
[
  {
    "label": "LABEL_0",
    "score": 0.09
  },
  {
    "label": "LABEL_1",
    "score": 0.91
  }
]
```

모델링 prototype response 예시:

```json
{
  "text": "배송 주소 오류로 반송 예정입니다. http://fake.kr/track",
  "pred": 1,
  "label_name": "스미싱",
  "prob_1_risk": 0.91,
  "prob_0_normal": 0.09,
  "risk_level": "위험 높음",
  "score": 91,
  "features": "- 외부 링크 포함: http://fake.kr/track"
}
```

Deploy wrapper는 위 response들을 backend contract에 맞춰 정규화한다.

## Decoder Behavior

Decoder는 text-generation 모델이라고 가정한다.

기본값은 다음과 같다.

```text
DECODER_ON_NORMAL=false
```

이 경우 Encoder가 `normal`을 반환하면 decoder를 호출하지 않고 정적 안전 설명을
반환한다. Encoder가 `phishing`을 반환하면 decoder를 호출해 `reason`을 생성한다.

정상 문자도 decoder 설명을 생성해야 하면 다음처럼 바꾼다.

```text
DECODER_ON_NORMAL=true
```

## Smoke Test

Docker 또는 local uvicorn으로 deploy wrapper를 실행한 뒤 확인한다.

```bash
curl http://localhost:8001/health
curl http://localhost:8001/ready
curl -X POST http://localhost:8001/analyze \
  -H "Content-Type: application/json" \
  -H "X-Request-ID: local-smoke-test" \
  -d '{"text":"배송 주소 오류로 반송 예정입니다. http://fake.kr/track"}'
```

확인할 것:

- `success=true`
- `label`이 `normal` 또는 `phishing`으로 정규화되는지
- `confidence`가 0.0부터 1.0 사이인지
- `score`가 0부터 100 사이인지
- `features`가 array of string인지
- secret 값이 response나 log에 노출되지 않는지
- `X-Request-ID`가 deploy wrapper log에서 확인되는지

## Fallback To Dedicated Endpoint

HF serverless API에서 모델 크기, cold start, rate limit, task 지원 문제가 생기면
dedicated Inference Endpoint로 전환한다.

```text
HF_SERVING_TYPE=endpoint
ENCODER_ENDPOINT_URL=
DECODER_ENDPOINT_URL=
```

Backend contract는 그대로 유지한다.
