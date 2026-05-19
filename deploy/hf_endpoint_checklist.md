# Hugging Face Inference Endpoint Connection Checklist

이 문서는 모델링팀이 Encoder/Decoder 모델을 Hugging Face Hub에 올린 뒤
Hugging Face 웹 GUI의 `Deploy` 기능으로 생성한 endpoint를 deploy wrapper와
연결할 때 확인할 항목을 정리한다.

## Required Inputs From Modeling

- Encoder model ID
- Encoder model version 또는 revision
- Encoder endpoint URL
- Encoder serving shape
  - HF Inference Endpoint인지 확인
  - HF Spaces custom API인지 확인
  - 요청 payload가 `{"inputs": text}`인지 `{"text": text}`인지 확인
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
- Decoder model ID: `Qwen/Qwen3-1.7B`
- Decoder model version 또는 revision
- Decoder endpoint URL
- Decoder task
  - 현재 실제 연결은 text-generation endpoint 응답을 기준으로 정규화한다.
- Decoder API type
  - `text_generation`: HF text-generation style payload
  - `chat_completion`: Inference Providers OpenAI-compatible fallback

## Environment Settings

Hugging Face 웹 GUI에서 생성한 Inference Endpoint를 사용할 때는 다음 값을 secret 또는 실행 환경에 주입한다.

```text
AI_SERVICE_MODE=hf_endpoint
HF_SERVING_TYPE=endpoint
HF_TOKEN=

ENCODER_ENDPOINT_URL=
ENCODER_PREPROCESS_ENABLED=true
ENCODER_REQUEST_FORMAT=hf_inputs

ENCODER_MODEL_ID=kdt-2-team4-newbiz/kcelectra-smishing-classifier
ENCODER_MODEL_VERSION=v1.0.0

DECODER_API_TYPE=text_generation
DECODER_ENDPOINT_URL=<decoder endpoint url>
DECODER_MODEL_ID=Qwen/Qwen3-1.7B
DECODER_MODEL_VERSION=v1.0.0
DECODER_REQUIRED=true

REQUEST_TIMEOUT_SECONDS=60
HF_MAX_RETRIES=2
HF_RETRY_BACKOFF_SECONDS=0.5
DECODER_ON_NORMAL=false
```

실제 `HF_TOKEN` 값은 `.env.example`이나 문서에 작성하지 않는다.

`ENCODER_MODEL_ID`, `DECODER_MODEL_ID`, version 값은 wrapper response metadata와
추후 rollback 추적에 사용한다. 실제 호출 대상은 endpoint URL이다.

## Hugging Face GUI Flow

모델링팀이 진행한 방식은 다음 흐름으로 이해하면 된다.

```text
Hugging Face model page
-> Deploy
-> Inference Endpoints
-> endpoint 생성
-> endpoint URL 복사
-> deploy wrapper 환경변수에 연결
```

Encoder와 Decoder는 역할이 다르므로 호출 방식도 분리해서 관리한다.

- Encoder Endpoint: 스미싱/정상 분류
- Decoder Endpoint: Qwen3 1.7B 기반 판단 이유 text-generation

Encoder가 Spaces 무료 CPU에서 동작하는 custom API라면 endpoint URL 자리에 Space의
API URL을 넣는다. 단, Space는 free CPU에서 sleep/cold start가 발생할 수 있으므로
첫 요청 latency를 smoke test에서 확인해야 한다.

Decoder가 Dedicated Endpoint를 쓰는 Qwen 모델이라면
`DECODER_API_TYPE=text_generation`으로 설정하고 `DECODER_ENDPOINT_URL`에 endpoint
URL을 넣는다. Inference Providers fallback을 써야 하는 경우에만
`DECODER_API_TYPE=chat_completion`, `DECODER_PROVIDER=featherless-ai`를 사용한다.

## Optional Serverless Fallback

별도 endpoint URL 없이 model ID 기반 serverless API를 호출해야 하는 경우에는
다음 설정으로 전환할 수 있다.

```text
HF_SERVING_TYPE=serverless
HF_SERVERLESS_BASE_URL=https://router.huggingface.co/hf-inference/models
ENCODER_MODEL_ID=kdt-2-team4-newbiz/kcelectra-smishing-classifier
DECODER_MODEL_ID=Qwen/Qwen3-1.7B
```

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

Decoder는 `Qwen/Qwen3-1.7B` text-generation endpoint를 기본값으로 사용한다.

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

현재 encoder는 전처리된 학습 `text`를 기준으로 학습되었으므로
`ENCODER_PREPROCESS_ENABLED=true`를 기본으로 사용한다. 이 값이 켜져 있으면
deploy wrapper가 `[Web발신]`을 제거하고 URL, 긴 전화번호, 금액 표현을
`<URL>`, `<PHONE>`, `<MONEY>`로 치환한 뒤 encoder endpoint에 전달한다.

## Fallback To Serverless

전용 endpoint 비용을 줄이거나 endpoint URL 없이 model ID 기반 호출을 시험해야
하면 serverless mode로 전환할 수 있다.

```text
HF_SERVING_TYPE=serverless
ENCODER_MODEL_ID=
DECODER_MODEL_ID=Qwen/Qwen3-1.7B
```

Backend contract는 그대로 유지한다.
