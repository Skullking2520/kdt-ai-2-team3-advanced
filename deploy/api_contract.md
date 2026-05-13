# Deploy Wrapper API Contract

이 문서는 backend 담당자가 deploy wrapper를 호출할 때 참고할 API contract다. Deploy wrapper async FastAPI app은 `deploy/app/` 아래에 두며, `ai_service/` 폴더는 모델링 담당자 영역으로 유지한다.

내부 구현은 `httpx.AsyncClient`를 사용해 Hugging Face Encoder/Decoder Endpoint를 호출한다. Decoder는 encoder의 `label`과 `confidence`가 필요하므로 두 endpoint 호출은 병렬이 아니라 순차 `await` 구조로 처리한다. API contract는 기존과 동일하게 유지한다.

Base URL 예시:

```text
http://localhost:8001
```

Backend가 deploy wrapper를 호출할 때는 backend 환경에서 `AI_SERVICE_URL` 같은 변수로 이 base URL을 관리하는 것을 권장한다. Deploy wrapper 자체는 이 값을 사용하지 않는다.

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

## POST `/analyze`

입력 문장을 분석해 피싱 여부, confidence, 설명을 반환한다.

Deploy wrapper는 문자 내용만 분석한다. `phone_number`는 선택 입력값이지만 deploy wrapper request에 포함하지 않는다. 전화번호 저장, 신고 횟수 증가, 신고 안내 페이지 이동은 backend/frontend 책임이다.

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
  "reason": "계정 정지, 인증 요구, 링크 클릭 유도와 같은 피싱 의심 표현으로 위험도가 높게 분류되었습니다.",
  "encoder_model_id": "team/kcelectra-smishing-classifier",
  "encoder_model_version": "v1.0.0",
  "decoder_model_id": "team/decoder-explainer",
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
| `encoder_model_id` | string | Encoder 모델 식별자 |
| `encoder_model_version` | string | Encoder 모델 version |
| `decoder_model_id` | string | Decoder 모델 식별자 |
| `decoder_model_version` | string | Decoder 모델 version |
| `serving_mode` | string | `mock` 또는 `hf_endpoint` |
| `error_code` | string | 실패 시 error code |
| `message` | string | 실패 시 사람이 읽을 수 있는 message |

## Recommended Backend Handling

- Backend는 `/analyze` 응답을 받은 뒤 DB에 prediction log를 저장한다.
- `success=false`이면 frontend에 일반화된 오류 메시지를 전달하고 내부 로그에 상세 내용을 남긴다.
- `model_id`, `model_version`, `serving_mode`는 추후 모델 변경과 rollback 추적을 위해 함께 저장한다.
- 사용자가 신고를 누르고 전화번호가 입력된 경우, backend가 전화번호와 신고 횟수를 별도 DB 테이블 또는 필드로 관리한다.

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
