# Deploy Wrapper Team Overview

이 문서는 deploy wrapper가 무엇을 하는지 빠르게 이해할 수 있도록 쉽게 정리한 설명서다.

## 한 줄 요약

Deploy wrapper는 backend와 AI 모델 사이에 있는 작은 FastAPI 서버다.

```text
Frontend
-> Backend
-> Deploy Wrapper
-> Hugging Face AI Models
```

Backend가 AI 모델을 직접 호출하지 않고, deploy wrapper가 대신 호출한 뒤 결과를 backend가 쓰기 쉬운 형태로 정리해서 돌려준다.

## 왜 필요한가

AI 모델은 아직 학습과 배포 방식이 바뀔 수 있다. 하지만 backend와 frontend는 미리 개발해야 한다.

그래서 deploy wrapper가 중간에서 API 모양을 고정한다.

```text
Backend는 항상 deploy wrapper의 POST /analyze만 호출한다.
모델이 mock이든, HF serverless든, dedicated endpoint든 backend contract는 크게 바뀌지 않는다.
```

## 전체 흐름

운영 시 예상 흐름은 다음과 같다.

```text
1. 사용자가 frontend에서 문자 내용을 입력한다.
2. Frontend가 backend /predict API를 호출한다.
3. Backend가 먼저 정적 패턴을 검사한다.
   - 예: 이미 알려진 URL, 전화번호, keyword
4. 정적 패턴에 걸리면 backend가 바로 결과를 만들 수 있다.
5. 정적 패턴에 걸리지 않으면 backend가 deploy wrapper /analyze를 호출한다.
6. Deploy wrapper가 Hugging Face encoder 모델을 호출한다.
7. Encoder가 스미싱 여부, 점수, 특징을 반환한다.
8. Deploy wrapper가 Qwen decoder chat completion API를 호출해 설명 문장을 만든다.
9. Deploy wrapper가 결과를 정리해서 backend에 반환한다.
10. Backend가 DB에 저장하고 frontend 응답 형식으로 바꿔 반환한다.
```

## 역할 분담

| 영역           | 담당 역할                                                                     |
| -------------- | ----------------------------------------------------------------------------- |
| Frontend       | 사용자 입력, 결과 화면, 신고 화면                                             |
| Backend        | `/predict` API, URL/static pattern pre-filtering, DB 저장, frontend 응답 변환 |
| Deploy Wrapper | `/analyze` API, AI 모델 호출, 모델 응답 정규화, mock mode, Docker 실행        |
| Modeling       | 모델 학습, 전처리, encoder/decoder 모델 준비, Hugging Face 업로드             |
| DB             | 정적 패턴, 분석 로그, 신고 데이터 저장                                        |

## Deploy Wrapper가 하는 일

Deploy wrapper는 backend가 호출할 내부 API를 제공한다.

```http
POST /analyze
```

Request:

```json
{
  "text": "배송 주소 오류로 반송 예정입니다. http://fake.kr/track"
}
```

Response:

```json
{
  "success": true,
  "label": "phishing",
  "confidence": 0.91,
  "reason": "외부 링크 포함: http://fake.kr/track 같은 피싱 의심 요소가 포함되어 위험도가 높게 분류되었습니다.",
  "features": ["외부 링크 포함: http://fake.kr/track"],
  "risk_level": "위험 높음",
  "score": 91,
  "encoder_model_id": "Skullking1123/kcelectra-smishing-classifier",
  "encoder_model_version": "v1.0.0",
  "decoder_model_id": "Qwen/Qwen3-1.7B",
  "decoder_model_version": "v1.0.0",
  "serving_mode": "mock"
}
```

Backend는 이 응답을 받아 frontend가 기대하는 `/predict` 응답으로 바꾼다.

## Deploy Wrapper가 하지 않는 일

Deploy wrapper는 다음 일을 맡지 않는다.

- URL 차단 정책 결정
- 정적 패턴 table 조회 또는 저장
- DB 저장
- 신고 횟수 증가
- frontend 화면 구성
- 모델 학습
- 실제 secret 관리

이 부분은 각각 backend, frontend, modeling, DB 영역에서 처리한다.

## Mock Mode란

현재 모델 endpoint가 아직 완전히 준비되지 않았기 때문에 기본값은 mock mode다.

```text
AI_SERVICE_MODE=mock
```

mock mode는 실제 Hugging Face API를 호출하지 않는다. 대신 URL, 전화번호, 금액 표현, 위험 keyword 같은 신호를 간단히 보고 가짜 분석 결과를 반환한다.

목적은 실제 모델이 없어도 backend와 frontend가 먼저 개발할 수 있게 하는 것이다.

## 실제 모델 연결 방식

현재 모델팀은 Encoder를 Hugging Face Inference Endpoint 또는 Spaces API로
배포하고, Decoder는 `Qwen/Qwen3-1.7B`를 Inference Providers에서
few-shot chat completion으로 호출한다.

```text
AI_SERVICE_MODE=hf_endpoint
HF_SERVING_TYPE=endpoint
HF_TOKEN=...
ENCODER_ENDPOINT_URL=...
ENCODER_REQUEST_FORMAT=hf_inputs
DECODER_API_TYPE=chat_completion
DECODER_PROVIDER=featherless-ai
DECODER_MODEL_ID=Qwen/Qwen3-1.7B
```

이 방식은 Encoder URL을 deploy wrapper가 HTTP로 호출하고, Decoder는 Hugging Face
Inference Providers의 chat completion router를 호출한다. `ENCODER_MODEL_ID`,
`DECODER_MODEL_ID`는 응답 metadata와 모델 추적용으로 계속 관리한다.
모델링 코드의 `EXPLAINER_PROVIDER`와 같은 provider인 `featherless-ai`를
deploy에서는 `DECODER_PROVIDER`로 설정한다.

별도 endpoint URL 없이 model ID로 호출해야 하면 serverless 방식도 열어둔다.

```text
HF_SERVING_TYPE=serverless
ENCODER_MODEL_ID=...
DECODER_MODEL_ID=Qwen/Qwen3-1.7B
```

Backend는 두 방식의 차이를 몰라도 된다. Backend는 계속 deploy wrapper의 `/analyze`만 호출한다.

## Backend와 Deploy 응답 매핑

Frontend는 backend `/predict` 응답을 본다. Deploy wrapper 응답은 backend 내부용이다.

| Deploy Wrapper              | Backend/Frontend 의미           |
| --------------------------- | ------------------------------- |
| `label`                     | 스미싱 여부                     |
| `confidence`                | 모델 신뢰도                     |
| `reason`                    | AI 상세 설명                    |
| `features`                  | 의심 근거 리스트                |
| `risk_level`                | 위험 단계                       |
| `score`                     | 위험 점수                       |
| `model_id`, `model_version` | 모델 추적과 rollback용 metadata |

## Docker는 무엇을 실행하나

Docker는 deploy wrapper FastAPI 서버를 실행한다.

```text
Docker container
-> uvicorn
-> deploy/app/main.py
-> /health, /analyze API 제공
```

중요한 점은 Docker 안에서 KcELECTRA나 decoder LLM을 직접 실행하지 않는다는 것이다. 실제 모델은 Hugging Face 쪽에서 실행되고, deploy wrapper는 HTTP API로 호출한다.

## 로컬 실행

Python으로 실행:

```bash
cd deploy
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

Docker로 실행:

```bash
cd deploy
docker compose -f docker-compose.example.yml up --build
```

확인:

```bash
curl http://localhost:8001/health
```

종료:

```bash
docker compose -f docker-compose.example.yml down
```

## 기억하면 좋은 것

- Frontend는 deploy wrapper를 직접 호출하지 않는다.
- Backend가 deploy wrapper를 호출한다.
- URL/static pattern filtering은 backend 책임이다.
- Deploy wrapper는 AI 모델 호출과 응답 정규화를 담당한다.
- mock mode와 실제 Hugging Face model 호출 mode를 모두 지원한다.
- 실제 모델 연결 시에도 backend는 `/analyze` contract만 유지하면 된다.
- 실제 token, DB password, HF token은 Git에 올리지 않는다.
