# Deploy Hugging Face Wrapper

`ai_service/` 폴더는 모델링 담당자가 모델 학습, 평가, inference 실험 코드를 관리하는 영역이다. 따라서 deployment wrapper는 `ai_service/`가 아니라 `deploy/app/` 아래에 작성한다.

Deploy wrapper의 책임은 Hugging Face inference API를 호출하고, 결과를 backend가 사용하기 쉬운 공통 응답 형식으로 정규화하는 것이다. 현재 모델팀은 Encoder를 Hugging Face Inference Endpoint 또는 Spaces API로 배포하고, Decoder는 Qwen 계열 모델을 Hugging Face Inference Providers에서 few-shot 호출하는 방향을 검토 중이다. 따라서 실제 연결은 `HF_SERVING_TYPE=endpoint`를 기본 흐름으로 두되, Decoder는 `DECODER_API_TYPE=chat_completion`도 지원한다.

## Responsibilities

- Backend가 호출할 FastAPI API 제공
- Encoder inference API 호출
- Decoder text-generation API 호출
- Endpoint 응답 정규화
- Encoder output의 `features`, `risk_level`, `score` 정규화
- mock mode 제공
- 모델 ID, 모델 version, serving mode를 응답에 포함
- inference 실패 시 일관된 error response 반환
- `/ready`에서 mode별 필수 환경변수 검증
- HF 호출 retry/backoff
- `X-Request-ID` 기반 요청 추적

## Non-Responsibilities

- 모델 학습
- 원본 학습 데이터 관리
- DB 저장
- URL filtering 정책
- static pattern table 조회 또는 갱신
- frontend 렌더링
- 실제 secret 관리
- `ai_service/` 내부 모델링 코드 수정

## Backend Static Pre-Filtering

Backend는 deploy wrapper 호출 전에 `static_patterns` table을 사용해 URL, 전화번호, keyword 같은 알려진 위험 패턴을 먼저 검사할 수 있다. 이 경우 static hit은 backend가 `detection_source=STATIC`으로 처리하고, deploy wrapper 호출을 생략할 수 있다.

Deploy wrapper는 static miss 이후 AI inference가 필요한 요청을 받아 Encoder/Decoder Endpoint를 호출하고, backend가 저장하고 변환하기 쉬운 형태로 응답을 정규화한다.

## Serving Modes

### `AI_SERVICE_MODE=mock`

모델이 아직 준비되지 않았을 때 사용하는 기본 mode다. 고정된 응답 형식과 간단한 keyword rule을 사용해 backend/frontend 개발을 먼저 진행할 수 있다.

### `AI_SERVICE_MODE=hf_endpoint`

Hugging Face inference API가 준비된 뒤 사용하는 mode다.

- `HF_SERVING_TYPE=endpoint`: `ENCODER_ENDPOINT_URL`, `DECODER_ENDPOINT_URL`, `HF_TOKEN`으로 Hugging Face 웹 GUI에서 생성한 Inference Endpoint를 호출한다.
- `HF_SERVING_TYPE=serverless`: `ENCODER_MODEL_ID`, `DECODER_MODEL_ID`, `HF_TOKEN`으로 Hugging Face serverless API를 호출한다.

Encoder가 Hugging Face Spaces의 custom FastAPI/Gradio API로 제공되는 경우에도
wrapper 입장에서는 URL을 호출한다는 점이 같으므로 `HF_SERVING_TYPE=endpoint`를
사용한다. Space API가 `{"text": "..."}`를 기대하면
`ENCODER_REQUEST_FORMAT=text_json`으로 바꾼다.

Decoder가 Hugging Face Inference Providers의 OpenAI-compatible chat completion을
사용하면 다음 값을 설정한다.

```text
DECODER_API_TYPE=chat_completion
HF_PROVIDER_CHAT_URL=https://router.huggingface.co/v1/chat/completions
DECODER_MODEL_ID=Qwen/...
```

HF 호출은 일시적인 5xx 또는 네트워크 실패에 대비해 retry/backoff를 적용한다.

```text
HF_MAX_RETRIES=2
HF_RETRY_BACKOFF_SECONDS=0.5
```

## Environment-Based Switching

실제 코드에서는 다음 환경변수로 serving mode를 분기하는 것을 권장한다.

```text
AI_SERVICE_MODE=mock
```

또는:

```text
AI_SERVICE_MODE=hf_endpoint
```

## Future HF Inference Connection

Hugging Face Inference Endpoint가 준비되면 다음 작업만으로 실제 추론 mode로 전환하는 것을 목표로 한다.

1. Encoder 모델을 Hugging Face Hub에 업로드한다.
2. Decoder text-generation 모델을 Hugging Face Hub에서 사용할 수 있게 준비한다.
3. Hugging Face 웹 GUI에서 각 모델의 `Deploy`를 눌러 Inference Endpoint를 생성한다.
4. 생성된 Encoder/Decoder endpoint URL을 복사한다.
5. `.env` 또는 secret manager에 `HF_TOKEN`, `ENCODER_ENDPOINT_URL`, decoder 관련 값을 등록한다.
6. `AI_SERVICE_MODE=hf_endpoint`, `HF_SERVING_TYPE=endpoint`로 변경한다.
7. `/ready`, `/health`, `/analyze` smoke test를 실행한다.

`ENCODER_MODEL_ID`, `DECODER_MODEL_ID`, model version 값은 endpoint 호출 대상이 아니라 response metadata와 rollback 추적용으로 계속 유지한다.

자세한 연결 전 확인 항목은 [hf_endpoint_checklist.md](hf_endpoint_checklist.md)를 참고한다.

## Response Normalization

HF inference API마다 응답 형식이 다를 수 있으므로 deploy wrapper 내부에서 다음 형태로 정규화한다.

Encoder Endpoint가 `LABEL_0`, `LABEL_1`, `SMISHING` 같은 원시 label을 반환할 수 있으므로 wrapper는 backend contract에 맞춰 `normal` 또는 `phishing`으로 변환한다. 현재 예시 구현은 일반적인 binary classifier 관례에 맞춰 `LABEL_0 -> normal`, `LABEL_1 -> phishing`으로 처리한다. 실제 학습 label mapping이 다르면 endpoint 연결 시 이 mapping을 먼저 확인해야 한다.

HF serverless text-classification API가 classifier label list를 반환하는 경우 deploy wrapper는 가장 높은 `score`의 label을 선택한다. 모델링 prototype처럼 `pred`, `label_name`, `prob_1_risk`, `features`가 포함된 dict response가 오면 해당 값을 우선 정규화한다.

기본값은 `DECODER_ON_NORMAL=false`다. 정상 문자까지 decoder를 호출하면 비용과 latency가 늘 수 있으므로, Encoder가 `normal`을 반환하면 정적 안전 설명을 반환하고 decoder 호출을 생략한다. 정상 문자도 LLM 설명이 필요하면 `DECODER_ON_NORMAL=true`로 바꾼다.

```json
{
  "success": true,
  "label": "phishing",
  "confidence": 0.91,
  "reason": "외부 링크 포함: http://fake.kr/track 같은 피싱 의심 요소가 포함되어 위험도가 높게 분류되었습니다.",
  "features": [
    "외부 링크 포함: http://fake.kr/track"
  ],
  "risk_level": "위험 높음",
  "score": 91,
  "encoder_model_id": "team/kcelectra-smishing-classifier",
  "encoder_model_version": "v1.0.0",
  "decoder_model_id": "team/decoder-explainer",
  "decoder_model_version": "v1.0.0",
  "serving_mode": "mock"
}
```
