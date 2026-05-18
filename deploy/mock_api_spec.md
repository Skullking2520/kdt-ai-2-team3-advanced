# Mock API Specification

이 문서는 모델 학습 전에도 backend/frontend 개발이 가능하도록 mock mode 응답을 정의한다.

## Mode

```text
AI_SERVICE_MODE=mock
```

mock mode에서는 실제 Hugging Face Endpoint를 호출하지 않는다. 대신 prototype 흐름에서 사용하는 분석 신호를 가볍게 흉내 내어 `/analyze` API response shape을 유지한다.

Mock mode는 `deploy/app/`의 FastAPI wrapper에서 지원한다. `ai_service/` 폴더는 모델링 담당자 영역이므로 mock wrapper 구현을 두지 않는다.

URL filtering과 static pattern matching은 backend 책임이다. Mock mode에서 URL 형태를 감지하는 이유는 실제 URL 차단 정책을 구현하기 위해서가 아니라, 모델 연결 전 `features` field와 backend adapter 흐름을 테스트하기 위해서다.

## Purpose

- 실제 모델 연결 전 API 응답 형식을 고정한다.
- Backend가 DB 저장 로직을 먼저 개발할 수 있게 한다.
- Frontend가 결과 화면을 먼저 개발할 수 있게 한다.
- 추후 `hf_endpoint` mode로 전환해도 backend/frontend 변경을 최소화한다.

## Suggested Mock Logic

입력 text에서 다음 신호를 감지해 mock risk score를 계산한다.

- URL 포함 여부
- 전화번호 포함 여부
- 금액 표현 포함 여부
- `[Web발신]` 또는 해외 발신 표현
- 외부 메신저 연락처 유도
- suspicious keyword 개수

현재 suspicious keywords 예시는 다음과 같다.

- 계정 정지
- 계정
- 정지
- 인증
- 링크
- 비밀번호
- 결제
- 환불
- 배송
- 본인확인
- 즉시
- 차단
- 환급
- 상품권
- 급하게
- 폰 고장
- 번호 바뀜
- 저금리
- 무직자대출
- 당일입금
- 급전
- 카톡
- 텔레그램
- whatsapp
- line

URL과 suspicious keyword가 함께 있거나, 금전 표현과 전화번호가 함께 있거나, 외부 메신저 유도가 있으면 위험도를 더 높게 계산한다. 이 로직은 실제 모델 판단이 아니라 model endpoint 연결 전 contract와 분기 흐름을 확인하기 위한 mock이다.

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
  "reason": "위험 키워드 감지: 계정, 정지, 인증, 링크 같은 피싱 의심 요소가 포함되어 위험도가 높게 분류되었습니다.",
  "features": [
    "위험 키워드 감지: 계정, 정지, 인증, 링크"
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

## Normal Response Example

```json
{
  "success": true,
  "label": "normal",
  "confidence": 0.82,
  "reason": "피싱으로 의심되는 강한 표현이나 링크 클릭 유도 패턴이 뚜렷하지 않습니다.",
  "features": [],
  "risk_level": "정상 가능성 높음",
  "score": 8,
  "encoder_model_id": "team/kcelectra-smishing-classifier",
  "encoder_model_version": "v1.0.0",
  "decoder_model_id": "team/decoder-explainer",
  "decoder_model_version": "v1.0.0",
  "serving_mode": "mock"
}
```

## Future Switch to HF Inference API

모델팀이 Hugging Face 웹 GUI에서 생성한 Inference Endpoint를 연결할 때는 다음 환경변수를 설정하고 mode를 변경한다.

```text
AI_SERVICE_MODE=hf_endpoint
HF_SERVING_TYPE=endpoint
HF_TOKEN=
ENCODER_ENDPOINT_URL=
ENCODER_REQUEST_FORMAT=hf_inputs
DECODER_API_TYPE=chat_completion
DECODER_MODEL_ID=
DECODER_ON_NORMAL=false
```

`ENCODER_MODEL_ID`, `DECODER_MODEL_ID`, version 값은 응답 metadata와 rollback 추적용으로 유지한다.

Backend는 `/analyze` contract가 유지되는 한 별도 변경 없이 동일 API를 호출한다.

실제 endpoint 전환 전에는 Encoder가 반환하는 원시 label mapping을 확인해야 한다. 예를 들어 `LABEL_0`이 정상인지 피싱인지 모델 학습 설정에 따라 달라질 수 있다.

Encoder prototype output의 `features`가 문자열이면 mock/API response에서는 UI 리스트 렌더링을 위해 `features: string[]` 형태로 정규화한다.

Decoder는 text-generation 모델이라고 가정한다. Deploy wrapper는 문자 내용, encoder label, confidence, features를 prompt로 구성하고 decoder output을 `reason`으로 정규화한다.

Backend가 static pattern pre-filtering에서 hit을 찾은 경우에는 deploy wrapper mock mode도 호출하지 않을 수 있다. 이 경우 frontend 응답은 backend가 직접 구성한다.
