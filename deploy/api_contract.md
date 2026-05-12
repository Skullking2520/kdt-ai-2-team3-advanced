# Deploy Wrapper API Contract

이 문서는 backend 담당자가 deploy wrapper를 호출할 때 참고할 API contract다. Deploy wrapper FastAPI app은 `deploy/app/` 아래에 두며, `ai_service/` 폴더는 모델링 담당자 영역으로 유지한다.

Base URL 예시:

```text
http://localhost:8001
```

운영 환경에서는 `AI_SERVICE_URL` 환경변수로 관리한다.

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
  "confidence": 0.94,
  "reason": "계정 정지와 인증 링크 클릭을 유도하는 표현이 포함되어 피싱 가능성이 높습니다.",
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

## Request Fields

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `text` | string | yes | 분석할 메시지 원문 |

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
