# Deploy Wrapper API Contract

이 문서는 backend 담당자가 deploy wrapper를 호출할 때 참고할 API contract다. Deploy wrapper async FastAPI app은 `deploy/app/` 아래에 두며, `ai_service/` 폴더는 모델링 담당자 영역으로 유지한다.

내부 구현은 FastAPI lifespan에서 관리되는 공유 `httpx.AsyncClient`를 사용해 Hugging Face Encoder/Decoder inference API를 호출한다. Decoder는 encoder의 `label`, `confidence`, `features`가 필요하므로 두 호출은 병렬이 아니라 순차 `await` 구조로 처리한다. API contract는 기존과 동일하게 유지한다.

모델팀이 Hugging Face 웹 GUI의 `Deploy` 기능으로 Encoder Inference Endpoint를
생성하면 deploy wrapper는 `HF_SERVING_TYPE=endpoint`로 실행하고,
환경변수의 `ENCODER_ENDPOINT_URL`을 호출한다. Decoder는 기본적으로
`Qwen/Qwen3-1.7B`를 Hugging Face Inference Providers chat completion API로
호출한다.
`HF_SERVING_TYPE=serverless`는 model ID 기반 호출이 필요할 때 사용하는 보조
경로다.

Encoder가 Hugging Face Spaces의 custom API로 배포되는 경우에도
`ENCODER_ENDPOINT_URL`에 Space API URL을 넣어 같은 wrapper contract를 유지한다.
Space API가 `{"text": text}`를 기대하면 `ENCODER_REQUEST_FORMAT=text_json`으로
설정한다.

현재 encoder는 학습 시 전처리된 `text` 컬럼을 사용했으므로 deploy wrapper가
기본적으로 동일한 전처리를 적용한다. `ENCODER_PREPROCESS_ENABLED=true`이면
`[Web발신]` 제거, URL/긴 전화번호/금액 치환 등을 적용한 뒤 encoder endpoint에
전달한다.

Decoder가 Hugging Face Inference Providers의 Qwen chat completion을 사용하면
`DECODER_API_TYPE=chat_completion`과 `DECODER_MODEL_ID`를 설정한다. 모델링
prototype의 `EXPLAINER_PROVIDER`와 같은 provider 지정이 필요하면
`DECODER_PROVIDER=featherless-ai`를 함께 설정한다. Deploy wrapper는 모델링
prototype과 같은 `huggingface_hub.InferenceClient` 경로를 기본으로 사용하며,
필요하면 `DECODER_PROVIDER` 또는 `EXPLAINER_PROVIDER`로 provider를 바꿀 수 있다.

`DECODER_REQUIRED=false`이면 decoder 설정이 아직 없어도 encoder 결과와 정적
fallback reason으로 `/analyze` 응답을 반환한다. Encoder endpoint 연결을 먼저
검증하는 단계에서 사용한다.

Base URL 예시:

```text
http://localhost:8001
```

Backend가 deploy wrapper를 호출할 때는 backend 환경에서 `AI_SERVICE_URL` 같은 변수로 이 base URL을 관리하는 것을 권장한다. Deploy wrapper 자체는 이 값을 사용하지 않는다.

Backend는 frontend가 호출하는 `/predict` API와 deploy wrapper가 제공하는 `/analyze` API 사이의 adapter 역할을 한다. URL filtering, static pattern matching, DB 저장, frontend 응답 변환은 backend에서 처리한다.

## GET `/health`

Deploy wrapper 상태 확인용 endpoint다.

### Response

```json
{
  "status": "ok",
  "service": "deploy_wrapper",
  "serving_mode": "mock"
}
```

## GET `/ready`

현재 설정으로 deploy wrapper가 요청을 처리할 준비가 되었는지 확인한다.

`mock` mode에서는 별도 HF 설정 없이 ready 상태가 된다. `hf_endpoint` mode에서는 `HF_TOKEN`, endpoint URL 또는 model ID 같은 필수 설정이 있는지 확인한다. 실제 HF inference 호출은 하지 않는다.

### Ready Response

```json
{
  "ready": true,
  "service": "deploy_wrapper",
  "serving_mode": "mock",
  "hf_serving_type": "serverless",
  "decoder_on_normal": false,
  "errors": []
}
```

### Not Ready Response

```json
{
  "ready": false,
  "service": "deploy_wrapper",
  "serving_mode": "hf_endpoint",
  "hf_serving_type": "endpoint",
  "decoder_on_normal": false,
  "errors": [
    "HF_TOKEN is required",
    "ENCODER_ENDPOINT_URL is required",
    "DECODER_ENDPOINT_URL is required"
  ]
}
```

## POST `/analyze`

입력 문장을 분석해 피싱 여부, confidence, 설명을 반환한다.

Deploy wrapper는 문자 내용만 분석한다. `phone_number`는 선택 입력값이지만 deploy wrapper request에 포함하지 않는다. 전화번호 저장, 신고 횟수 증가, 신고 안내 페이지 이동은 backend/frontend 책임이다.

Backend가 `static_patterns` table에서 URL, 전화번호, keyword를 pre-filtering해 이미 알려진 위험 패턴을 찾은 경우, deploy wrapper 호출을 생략하고 backend가 직접 frontend 응답을 만들 수 있다. Static miss인 경우에만 `/analyze`를 호출하는 흐름을 권장한다.

### Request

```json
{
  "text": "고객님의 계정이 정지되었습니다. 아래 링크에서 인증하세요."
}
```

### Success Response

```json
{
  "success": true,
  "label": "phishing",
  "confidence": 0.91,
  "reason": "위험 키워드 감지: 계정, 정지, 인증, 링크 같은 피싱 의심 요소가 포함되어 위험도가 높게 분류되었습니다.",
  "features": [
    "위험 키워드 감지: 계정, 정지, 인증, 링크"
  ],
  "risk_level": "위험 높음",
  "score": 91,
  "encoder_model_id": "Skullking1123/kcelectra-smishing-classifier",
  "encoder_model_version": "v1.0.0",
  "decoder_model_id": "Qwen/Qwen3-1.7B",
  "decoder_model_version": "v1.0.0",
  "serving_mode": "mock"
}
```

### Error Response

```json
{
  "success": false,
  "error_code": "INFERENCE_FAILED",
  "message": "Deploy wrapper inference failed"
}
```

HF API 관련 오류는 같은 error response shape를 유지하면서 `error_code`로 원인을 구분한다. 예를 들어 serverless token/model ID 또는 endpoint URL 설정 누락은 `CONFIGURATION_ERROR`, upstream 호출 실패는 `UPSTREAM_INFERENCE_FAILED`, 예상하지 못한 응답 형식은 `INFERENCE_RESPONSE_INVALID`로 반환될 수 있다. 실제 token이나 secret 값은 response에 포함하지 않는다.

잘못된 요청 body는 같은 error shape로 반환한다.

```json
{
  "success": false,
  "error_code": "INVALID_REQUEST",
  "message": "Request body is invalid"
}
```

### Verified Curl Examples

Health check:

```bash
curl http://localhost:8001/health
```

Analyze mock request:

```bash
curl -X POST http://localhost:8001/analyze \
  -H "Content-Type: application/json" \
  -d '{"text":"고객님의 계정이 정지되었습니다. 아래 링크에서 인증하세요."}'
```

Invalid request:

```bash
curl -X POST http://localhost:8001/analyze \
  -H "Content-Type: application/json" \
  -d '{}'
```

Readiness check:

```bash
curl http://localhost:8001/ready
```

## Request Fields

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `text` | string | yes | 분석할 메시지 원문 |

추가 필드는 허용하지 않는다. 예를 들어 `phone_number`는 backend가 별도로 관리해야 하며 `/analyze`에 전달하지 않는다.

## Response Fields

| Field | Type | Description |
| --- | --- | --- |
| `success` | boolean | 요청 처리 성공 여부 |
| `label` | string | `phishing` 또는 `normal` |
| `confidence` | number | 0.0부터 1.0 사이의 예측 신뢰도 |
| `reason` | string | 사용자에게 보여줄 수 있는 판단 근거 |
| `features` | array of string | UI에서 판단 근거 하단에 리스트로 표시할 감지 특징 |
| `risk_level` | string | Encoder 또는 wrapper가 계산한 위험 단계 |
| `score` | integer | 0부터 100 사이의 위험 점수 |
| `encoder_model_id` | string | Encoder 모델 식별자 |
| `encoder_model_version` | string | Encoder 모델 version |
| `decoder_model_id` | string | Decoder 모델 식별자 |
| `decoder_model_version` | string | Decoder 모델 version |
| `serving_mode` | string | `mock` 또는 `hf_endpoint` |
| `error_code` | string | 실패 시 error code |
| `message` | string | 실패 시 사람이 읽을 수 있는 message |

## HF Runtime Options

| Env | Description |
| --- | --- |
| `HF_SERVING_TYPE` | `endpoint` 또는 `serverless` |
| `ENCODER_ENDPOINT_URL` | Encoder Inference Endpoint 또는 Space API URL |
| `ENCODER_PREPROCESS_ENABLED` | Encoder 호출 전 학습 전처리 규칙 적용 여부 |
| `ENCODER_REQUEST_FORMAT` | `hf_inputs` 또는 `text_json` |
| `DECODER_API_TYPE` | `text_generation` 또는 `chat_completion` |
| `DECODER_PROVIDER` | HF Inference Providers provider 이름. 기본값: `featherless-ai` |
| `DECODER_REQUIRED` | decoder 미설정 시 오류를 낼지 여부 |
| `DECODER_ENDPOINT_URL` | Decoder dedicated/custom endpoint URL |

## Recommended Backend Handling

- Backend는 frontend의 `/predict` request를 받은 뒤 static pattern pre-filtering을 먼저 수행할 수 있다.
- Static hit이면 `detection_source=STATIC`으로 smishing log를 저장하고, deploy wrapper 호출 없이 frontend 응답을 생성할 수 있다.
- Static miss이면 deploy wrapper의 `/analyze`를 호출한다.
- Backend는 `/analyze` 응답을 받은 뒤 `detection_source=AI`로 prediction/smishing log를 저장한다.
- `success=false`이면 frontend에 일반화된 오류 메시지를 전달하고 내부 로그에 상세 내용을 남긴다.
- Backend가 `X-Request-ID` header를 전달하면 deploy wrapper가 같은 ID를 로그와 HF 요청 header에 사용한다.
- `model_id`, `model_version`, `serving_mode`는 추후 모델 변경과 rollback 추적을 위해 함께 저장한다.
- `label=phishing`이고 URL 또는 전화번호가 포함되어 있으면 backend 정책에 따라 `static_patterns` 후보로 저장하거나 count를 갱신할 수 있다.
- 사용자가 신고를 누르고 전화번호가 입력된 경우, backend가 전화번호와 신고 횟수를 별도 DB 테이블 또는 필드로 관리한다.

## Backend to Frontend Mapping

Frontend MVP는 backend `/predict` 응답에서 다음과 같은 field를 기대한다.

| Frontend field | Source from deploy `/analyze` | Notes |
| --- | --- | --- |
| `inputText` | original backend request message | Backend가 보존 |
| `riskScore` | `score` | 0부터 100 사이 점수 |
| `riskLevel` | `risk_level` | 필요하면 backend가 UI 문구로 변환 |
| `suspiciousEvidence` | `features` | UI의 의심 근거 리스트로 사용 가능 |
| `explanation` | `reason` | Decoder 설명 한 줄 |
| `highlightedTerms` | `features` 또는 backend pre-filter result | Backend 변환 정책에 따름 |
| `factorScores` | backend rule/static result 또는 fallback | Deploy wrapper는 제공하지 않음 |

Deploy wrapper는 frontend contract를 직접 맞추지 않는다. Backend가 `/analyze` 응답을 받아 frontend `/predict` response로 변환한다.

## Label Normalization

Deploy wrapper는 backend에 원시 모델 label을 그대로 넘기지 않고 `phishing` 또는 `normal`로 정규화한다.

현재 wrapper 예시의 기본 mapping:

| Raw encoder label | API label |
| --- | --- |
| `LABEL_0` | `normal` |
| `LABEL_1` | `phishing` |
| `NORMAL` | `normal` |
| `PHISHING` | `phishing` |
| `SMISHING` | `phishing` |

실제 Encoder 학습 label mapping이 다르면 Hugging Face Endpoint 연결 전에 wrapper mapping을 수정해야 한다.

## Encoder Output Normalization

모델링팀 Encoder Endpoint가 다음과 같은 prototype output을 반환할 수 있다.

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

Deploy wrapper는 이 값을 backend contract에 맞춰 정규화한다.

- `label_name: "스미싱"` 또는 `pred: 1` -> `label: "phishing"`
- `label_name: "정상"` 또는 `pred: 0` -> `label: "normal"`
- `prob_1_risk` -> `confidence`
- `features` 문자열 -> `features: string[]`
- `risk_level`, `score`는 가능한 경우 그대로 전달

Decoder는 `Qwen/Qwen3-1.7B` chat completion 모델을 기본값으로 사용한다. Deploy wrapper는 Encoder의 `text`, `label`, `confidence`, `features`를 prompt 문자열로 구성해 decoder에 전달하고, decoder output을 `reason`으로 정규화한다.

기본값은 `DECODER_ON_NORMAL=false`다. 이 경우 Encoder가 `normal`을 반환하면 decoder를 호출하지 않고 정적 안전 설명을 반환한다. Encoder가 `phishing`을 반환하면 Qwen chat completion API를 호출해 설명을 생성한다.

## HF Serverless Text-Classification Response

HF serverless text-classification API는 prototype response가 아니라 다음처럼 classifier label list를 반환할 수 있다.

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

또는 다음처럼 list of objects로 반환될 수 있다.

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

Deploy wrapper는 가장 높은 `score`의 label을 선택하고 `LABEL_0 -> normal`, `LABEL_1 -> phishing` 기본 mapping을 적용한다. 실제 모델 학습 label mapping이 다르면 이 mapping을 먼저 수정해야 한다.
