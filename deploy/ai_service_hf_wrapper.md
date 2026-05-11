# AI Service Hugging Face Wrapper

`ai_service`는 모델을 직접 학습하거나 모델 파일을 직접 관리하는 서비스가 아니다. 이 서비스의 책임은 Hugging Face Inference Endpoint를 호출하고, 결과를 backend가 사용하기 쉬운 공통 응답 형식으로 정규화하는 것이다.

## Responsibilities

- Backend가 호출할 FastAPI API 제공
- Encoder Endpoint 호출
- Decoder Endpoint 호출
- Endpoint 응답 정규화
- mock mode 제공
- 모델 ID, 모델 version, serving mode를 응답에 포함
- inference 실패 시 일관된 error response 반환

## Non-Responsibilities

- 모델 학습
- 원본 학습 데이터 관리
- DB 저장
- frontend 렌더링
- 실제 secret 관리

## Serving Modes

### `AI_SERVICE_MODE=mock`

모델이 아직 준비되지 않았을 때 사용하는 기본 mode다. 고정된 응답 형식과 간단한 keyword rule을 사용해 backend/frontend 개발을 먼저 진행할 수 있다.

### `AI_SERVICE_MODE=hf_endpoint`

Hugging Face Inference Endpoint가 준비된 뒤 사용하는 mode다. `ENCODER_ENDPOINT_URL`, `DECODER_ENDPOINT_URL`, `HF_TOKEN`을 환경변수로 주입해 실제 endpoint를 호출한다.

## Environment-Based Switching

실제 코드에서는 다음 환경변수로 serving mode를 분기하는 것을 권장한다.

```text
AI_SERVICE_MODE=mock
```

또는:

```text
AI_SERVICE_MODE=hf_endpoint
```

## Future HF Endpoint Connection

Hugging Face Endpoint가 준비되면 다음 작업만으로 실제 추론 mode로 전환하는 것을 목표로 한다.

1. Encoder 모델을 Hugging Face Hub에 업로드한다.
2. Decoder 모델을 Hugging Face Hub에 업로드하거나 외부 LLM endpoint를 준비한다.
3. Encoder Inference Endpoint를 생성한다.
4. Decoder Inference Endpoint를 생성한다.
5. `.env` 또는 secret manager에 endpoint URL과 token을 등록한다.
6. `AI_SERVICE_MODE=hf_endpoint`로 변경한다.
7. `/health`, `/analyze` smoke test를 실행한다.

## Response Normalization

HF Endpoint마다 응답 형식이 다를 수 있으므로 `ai_service` 내부에서 다음 형태로 정규화한다.

```json
{
  "success": true,
  "label": "phishing",
  "confidence": 0.94,
  "reason": "계정 정지와 인증 링크 클릭을 유도하는 표현이 포함되어 피싱 가능성이 높습니다.",
  "encoder_model_id": "team/kcelectra-smishing-classifier",
  "encoder_model_version": "v1.0.0",
  "decoder_model_id": "team/decoder-explainer",
  "decoder_model_version": "v1.0.0",
  "serving_mode": "mock"
}
```

