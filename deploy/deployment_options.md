# Deployment Options

이 문서는 모델 서빙과 `ai_service` 배포 선택지를 비교한다. 현재 추천 구조는 Hugging Face Inference Endpoint를 `ai_service` FastAPI wrapper가 감싸는 B안이다.

## Option A: FastAPI Direct Model Serving

FastAPI 서버 안에서 PyTorch/Transformers 모델을 직접 로드하고 추론한다.

### Pros

- 구조가 단순하다.
- Encoder KcELECTRA처럼 상대적으로 작은 모델은 직접 서빙 가능성이 있다.
- endpoint 비용을 직접 제어할 수 있다.

### Cons

- 서버에 모델 runtime, GPU/CPU 자원, dependency를 직접 관리해야 한다.
- Decoder LLM까지 직접 올리면 자원 부담이 크다.
- 모델 교체와 rollback 절차를 직접 운영해야 한다.

## Option B: Hugging Face Inference Endpoint + FastAPI Wrapper

Hugging Face Inference Endpoint가 모델 추론을 담당하고, `ai_service`는 endpoint 호출과 응답 정규화만 담당한다.

### Pros

- 모델 serving 운영 부담이 줄어든다.
- Encoder와 Decoder를 독립 endpoint로 관리할 수 있다.
- 모델 교체 시 endpoint URL 또는 model version 기준으로 전환하기 쉽다.
- Backend는 항상 동일한 `ai_service` API만 호출하면 된다.

### Cons

- Hugging Face Endpoint 비용과 quota 관리가 필요하다.
- 네트워크 latency가 추가될 수 있다.
- Endpoint 장애에 대비한 retry, timeout, fallback 정책이 필요하다.

## Option C: AWS SageMaker / Vertex AI / Azure ML

클라우드 ML 플랫폼을 사용해 모델 registry, endpoint, monitoring을 관리한다.

### Pros

- 운영, 모니터링, scaling 기능이 강력하다.
- 팀이나 회사 인프라와 통합하기 좋다.

### Cons

- 초기 설정 난이도가 높다.
- 비용 구조가 복잡할 수 있다.
- 현재 팀 프로젝트 단계에서는 과할 수 있다.

## Comparison

| Criteria | FastAPI Direct Serving | HF Endpoint Wrapper | Cloud ML Platform |
| --- | --- | --- | --- |
| 비용 | 낮게 시작 가능하나 자원 직접 부담 | endpoint 사용량 기반 | 플랫폼/자원 비용 부담 |
| 난이도 | 중간 | 낮음-중간 | 높음 |
| 운영 부담 | 높음 | 중간 | 중간-높음 |
| 모델 교체 용이성 | 직접 구현 필요 | 높음 | 높음 |
| 백엔드 연결 방식 | FastAPI 직접 호출 | `ai_service` API 호출 | wrapper 또는 SDK 필요 |
| Decoder LLM 부담 | 큼 | 상대적으로 낮음 | 관리 가능하지만 복잡 |

## Current Decision

- Encoder KcELECTRA classifier는 FastAPI 직접 서빙도 가능하다.
- Decoder LLM은 직접 서버에 올리면 자원 부담이 크므로 Hugging Face Endpoint 또는 외부 API가 현실적이다.
- 이번 설계는 B안, 즉 Hugging Face Endpoint를 사용하는 `ai_service` wrapper 구조를 기준으로 한다.

