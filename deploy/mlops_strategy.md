# MLOps Strategy

이 문서는 모델 version 관리, endpoint 운영, 예측 로그 저장 방향을 정리한다.

## Model Registry

Hugging Face Hub를 Model Registry로 사용한다.

- Encoder model ID: `team/kcelectra-smishing-classifier`
- Decoder model ID: `team/decoder-explainer`
- 모델 version은 `v1.0.0` 같은 명시적 문자열로 관리한다.
- HF serverless API를 우선 사용한다면 model ID와 `HF_TOKEN`을 환경변수로 관리한다.
- Dedicated Inference Endpoint로 전환하는 경우 endpoint URL을 코드에 하드코딩하지 않고 환경변수로 관리한다.

## Environment Variables

HF serving 방식과 모델 metadata는 다음 환경변수로 분리한다.

```text
AI_SERVICE_MODE=hf_endpoint
HF_SERVING_TYPE=serverless
HF_TOKEN=
ENCODER_MODEL_ID=team/kcelectra-smishing-classifier
ENCODER_MODEL_VERSION=v1.0.0
DECODER_MODEL_ID=team/decoder-explainer
DECODER_MODEL_VERSION=v1.0.0
ENCODER_ENDPOINT_URL=
DECODER_ENDPOINT_URL=
```

## Versioning

모델 업데이트 시 다음 항목을 함께 변경한다.

- Hugging Face Hub model revision 또는 tag
- `ENCODER_MODEL_VERSION`
- `DECODER_MODEL_VERSION`
- `HF_SERVING_TYPE`
- Dedicated Endpoint URL이 바뀌는 경우 endpoint 환경변수
- 배포 기록 문서 또는 release note

## Rollback

문제 발생 시 이전 model version, 이전 model ID, 또는 이전 endpoint로 rollback한다.

권장 절차:

1. 문제가 발생한 prediction log를 확인한다.
2. 현재 `HF_SERVING_TYPE`, model ID, endpoint URL, model version을 확인한다.
3. serverless mode에서는 이전 model revision 또는 이전 model ID로 전환한다.
4. endpoint mode에서는 이전 endpoint 또는 이전 model revision으로 전환한다.
5. smoke test를 실행한다.
6. rollback 시점과 원인을 기록한다.

## Prediction Metadata

예측 결과에는 최소한 다음 정보를 포함한다.

- `label`
- `confidence`
- `reason`
- `encoder_model_id`
- `encoder_model_version`
- `decoder_model_id`
- `decoder_model_version`
- `serving_mode`

## Recommended DB Fields

Backend가 prediction log와 feedback을 저장할 때 다음 필드를 권장한다.

| Field | Description |
| --- | --- |
| `input_text` | 사용자가 입력한 원문 |
| `predicted_label` | 모델 예측 label |
| `confidence` | 예측 신뢰도 |
| `reason` | 설명 문장 |
| `encoder_model_id` | Encoder 모델 ID |
| `encoder_model_version` | Encoder 모델 version |
| `decoder_model_id` | Decoder 모델 ID |
| `decoder_model_version` | Decoder 모델 version |
| `created_at` | 예측 생성 시각 |
| `user_feedback` | 사용자 feedback |
| `corrected_label` | 사람이 수정한 label |

전화번호는 deploy wrapper가 받거나 저장하지 않는다. 사용자가 신고를 누르고 전화번호가 입력된 경우 backend가 별도 신고 데이터로 관리하는 것을 권장한다.

| Field | Description |
| --- | --- |
| `phone_number` | 사용자가 선택적으로 입력한 전화번호 |
| `report_count` | 해당 전화번호가 신고된 누적 횟수 |
| `last_reported_at` | 마지막 신고 시각 |

## Monitoring Ideas

- prediction count
- phishing/normal label distribution
- average confidence
- inference latency
- endpoint error rate
- serverless cold start 또는 rate limit
- user feedback rate
- corrected label distribution
