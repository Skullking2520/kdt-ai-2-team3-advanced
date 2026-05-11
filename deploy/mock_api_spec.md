# Mock API Specification

이 문서는 모델 학습 전에도 backend/frontend 개발이 가능하도록 mock mode 응답을 정의한다.

## Mode

```text
AI_SERVICE_MODE=mock
```

mock mode에서는 실제 Hugging Face Endpoint를 호출하지 않는다. 대신 간단한 rule 또는 고정 응답으로 `/analyze` API response shape을 유지한다.

## Purpose

- 실제 모델 연결 전 API 응답 형식을 고정한다.
- Backend가 DB 저장 로직을 먼저 개발할 수 있게 한다.
- Frontend가 결과 화면을 먼저 개발할 수 있게 한다.
- 추후 `hf_endpoint` mode로 전환해도 backend/frontend 변경을 최소화한다.

## Suggested Mock Logic

입력 text에 다음과 같은 suspicious keywords가 포함되면 `phishing`을 반환할 수 있다.

- 계정 정지
- 인증
- 링크
- 비밀번호
- 결제
- 환불
- 배송
- 본인확인
- 즉시
- 차단

그 외에는 `normal`을 반환한다.

## Mock Request

```json
{
  "text": "고객님의 계정이 정지되었습니다. 아래 링크에서 인증하세요."
}
```

## Mock Response Example

```json
{
  "success": true,
  "label": "phishing",
  "confidence": 0.91,
  "reason": "해당 메시지는 계정 정지, 인증 요구, 링크 클릭 유도와 같은 피싱 의심 표현을 포함할 가능성이 있어 위험도가 높게 분류되었습니다.",
  "encoder_model_id": "team/kcelectra-smishing-classifier",
  "encoder_model_version": "v1.0.0",
  "decoder_model_id": "team/decoder-explainer",
  "decoder_model_version": "v1.0.0",
  "serving_mode": "mock"
}
```

## Normal Response Example

```json
{
  "success": true,
  "label": "normal",
  "confidence": 0.82,
  "reason": "해당 메시지는 피싱으로 의심되는 강한 표현이나 링크 클릭 유도 패턴이 뚜렷하지 않습니다.",
  "encoder_model_id": "team/kcelectra-smishing-classifier",
  "encoder_model_version": "v1.0.0",
  "decoder_model_id": "team/decoder-explainer",
  "decoder_model_version": "v1.0.0",
  "serving_mode": "mock"
}
```

## Future Switch to HF Endpoint

Hugging Face Endpoint가 준비되면 다음 환경변수를 설정하고 mode를 변경한다.

```text
AI_SERVICE_MODE=hf_endpoint
ENCODER_ENDPOINT_URL=
DECODER_ENDPOINT_URL=
HF_TOKEN=
```

Backend는 `/analyze` contract가 유지되는 한 별도 변경 없이 동일 API를 호출한다.

