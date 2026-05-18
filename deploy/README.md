# Deploy Documentation

이 폴더는 AI 모델 배포, 모델 서빙, backend 연동 구조를 정리하기 위한 설계 문서와 deployment wrapper 예시 코드를 담는다.

전체 공유용 쉬운 설명은 [team_overview.md](team_overview.md)를 먼저 참고한다.
실제 Hugging Face Inference Endpoint 연결 전 확인할 항목은
[hf_endpoint_checklist.md](hf_endpoint_checklist.md)를 참고한다.
선택된 Encoder 모델을 Hugging Face Dedicated Inference Endpoint에 배포하는
절차는 [encoder_endpoint_deploy.md](encoder_endpoint_deploy.md)를 참고한다.

현재 deploy wrapper는 frontend/backend 병렬 개발을 위한 mock mode와 실제 Hugging Face 모델을 호출하는 `hf_endpoint` mode를 함께 지원한다. 실제 운영 또는 통합 테스트에서는 환경변수로 `AI_SERVICE_MODE=hf_endpoint`를 주입해 Encoder Endpoint와 Qwen decoder API를 사용한다.

`ai_service/` 폴더는 모델링 담당자가 학습, 평가, inference 실험 코드를 관리하는 영역이므로 이 작업에서는 수정하지 않는다. Hugging Face Endpoint 기반 async FastAPI wrapper는 `deploy/app/` 아래에 작성한다.

최종 목표는 `deploy` wrapper가 Hugging Face inference API를 직접 감싸는 async FastAPI wrapper 역할을 하는 구조다. 백엔드는 deploy wrapper의 `/analyze` API만 호출하고, deploy wrapper는 FastAPI lifespan에서 관리되는 공유 `httpx.AsyncClient`로 Encoder와 Decoder를 순차 호출한 뒤 `label`, `confidence`, `reason` 형식으로 정규화한다. 기본값에서는 Encoder가 `normal`을 반환하면 decoder 호출을 생략하고 정적 안전 설명을 반환한다.

현재 모델팀은 Encoder를 Hugging Face Inference Endpoint 또는 Spaces의 가벼운
API로 배포하고, Decoder는 `Qwen/Qwen3-1.7B`를 Hugging Face Inference
Providers chat completion API로 few-shot 호출한다. 따라서 실제 연결 기본값은
`HF_SERVING_TYPE=endpoint`로 두고, Encoder는 `ENCODER_ENDPOINT_URL`에 연결한다.
Decoder는 기본적으로 `DECODER_API_TYPE=chat_completion`,
`DECODER_MODEL_ID=Qwen/Qwen3-1.7B`를 사용한다. dedicated/custom decoder URL을
쓰는 경우에만 `DECODER_ENDPOINT_URL`을 설정한다.
모델링 prototype과 같은 provider인 `DECODER_PROVIDER=featherless-ai`를 사용한다.
`chat_completion` decoder는 모델링 prototype과 같은
`huggingface_hub.InferenceClient` 경로로 호출한다.

운영 확인용 endpoint는 두 단계로 나눈다. `/health`는 앱 프로세스가 살아 있는지만 확인하고, `/ready`는 현재 mode에서 필요한 환경변수가 준비되었는지 확인한다.

사용자가 입력하는 전화번호는 deploy wrapper의 분석 대상이 아니다. 전화번호 선택 입력, 신고 버튼, 신고 안내 페이지, 신고된 전화번호 저장, 신고 횟수 증가는 frontend/backend/DB 책임으로 둔다. Deploy wrapper는 문자 내용 `text`만 받아 분석 결과를 반환한다.

URL filtering과 정적 패턴 매칭은 backend 책임으로 둔다. Backend는 `static_patterns` 같은 DB table을 사용해 알려진 URL, 전화번호, keyword를 모델 호출 전에 pre-filtering할 수 있다. Deploy wrapper의 mock mode가 URL 형태를 감지하는 것은 실제 URL 차단 정책이 아니라 model endpoint 연결 전 `features` 응답 형태를 흉내 내기 위한 contract test 용도다.

예상 운영 흐름:

```text
Frontend /predict request
-> Backend static pattern pre-filtering
-> Static hit이면 backend가 DB log 저장 후 frontend 응답 생성
-> Static miss이면 backend가 deploy wrapper POST /analyze 호출
-> Deploy wrapper가 Encoder Endpoint와 Decoder Provider API 결과를 정규화
-> Backend가 smishing log, model metadata, static pattern 후보를 저장
-> Backend가 frontend 응답 형식으로 변환
```

## Scope

- `deploy/` 내부 문서 및 예시 파일 작성
- `deploy/app/` 내부 mock-first 및 HF endpoint async FastAPI wrapper 작성
- mock mode 기준 API contract 정리
- Hugging Face Inference Endpoint 전환을 위한 환경변수와 체크리스트 정리
- Docker/docker-compose 적용 방향 초안 정리

## Out of Scope

- 기존 `frontend/`, `backend/`, `ai_service/` 코드 수정
- 실제 모델 학습 코드 작성
- 실제 Hugging Face Endpoint 생성
- 실제 DB 연결
- 전화번호 저장 또는 신고 횟수 업데이트
- URL filtering 또는 static pattern matching 정책
- 실제 토큰, 비밀번호, secret 작성

## Security Rule

이 폴더에는 실제 민감정보를 절대 작성하지 않는다.

- 실제 `HF_TOKEN` 금지
- 실제 DB 비밀번호 금지. deploy wrapper는 DB에 직접 연결하지 않는다.
- 실제 운영 endpoint secret 금지
- `.env` 파일 대신 `.env.example`만 사용

## Local Verification

Deploy wrapper는 로컬 Python 환경에서 mock mode 기준으로 정상 실행을 확인했다.

내부 구현은 async FastAPI endpoint와 공유 `httpx.AsyncClient` 기반 HF API 호출 구조를 사용한다. API request/response contract는 기존과 동일하다.

Deploy wrapper dependency는 루트 `uv` workspace가 아니라 `deploy/requirements.txt`로 별도 관리한다. 로컬 Python 환경에서 처음 실행할 때는 다음처럼 deploy 전용 dependency를 먼저 설치한다.

```bash
python -m pip install -r deploy/requirements.txt
```

`deploy/` 디렉터리에서 실행할 때:

```bash
cd deploy
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

repo root에서 실행할 때:

```bash
uvicorn deploy.app.main:app --reload --host 0.0.0.0 --port 8001
```

FastAPI docs page:

```text
http://localhost:8001/docs
```

Readiness check:

```bash
curl http://localhost:8001/ready
```

Normalization test:

```bash
python -m unittest deploy.tests.test_normalization
```

### Health Check

```bash
curl http://localhost:8001/health
```

Response:

```json
{
  "status": "ok",
  "service": "deploy_wrapper",
  "serving_mode": "mock"
}
```

### Analyze Mock Request

```bash
curl -X POST http://localhost:8001/analyze \
  -H "Content-Type: application/json" \
  -d '{"text":"고객님의 계정이 정지되었습니다. 아래 링크에서 인증하세요."}'
```

Response:

```json
{
  "success": true,
  "label": "phishing",
  "confidence": 0.91,
  "reason": "위험 키워드 감지: 계정, 정지, 인증, 링크 같은 피싱 의심 요소가 포함되어 위험도가 높게 분류되었습니다.",
  "features": ["위험 키워드 감지: 계정, 정지, 인증, 링크"],
  "risk_level": "위험 높음",
  "score": 91,
  "encoder_model_id": "Skullking1123/kcelectra-smishing-classifier",
  "encoder_model_version": "v1.0.0",
  "decoder_model_id": "Qwen/Qwen3-1.7B",
  "decoder_model_version": "v1.0.0",
  "serving_mode": "mock"
}
```

### Invalid Request Test

```bash
curl -X POST http://localhost:8001/analyze \
  -H "Content-Type: application/json" \
  -d '{}'
```

Response:

```json
{
  "success": false,
  "error_code": "INVALID_REQUEST",
  "message": "Request body is invalid"
}
```

### Docker Verification

Docker 검증은 추후 선택 사항이 아니라, Docker 기반 실행 전 반드시 확인해야 하는 검증 항목이다.

현재 확인된 항목:

- `docker compose -f docker-compose.example.yml config`
- `docker compose -f docker-compose.example.yml up --build`
- container 실행 후 `/health`, `/ready`, `/analyze` 확인
- `docker compose -f docker-compose.example.yml down`

`deploy/` 디렉터리 기준으로 다음 명령을 실행한다.

```bash
cd deploy
docker compose -f docker-compose.example.yml config
docker compose -f docker-compose.example.yml up --build
```

다른 터미널에서 실행 후 확인:

```bash
curl http://localhost:8001/health
curl http://localhost:8001/ready
curl -X POST http://localhost:8001/analyze \
  -H "Content-Type: application/json" \
  -H "X-Request-ID: docker-smoke-test" \
  -d '{"text":"고객님의 계정이 정지되었습니다. 아래 링크에서 인증하세요."}'
```

검증 후 종료:

```bash
cd deploy
docker compose -f docker-compose.example.yml down
```

Required verification:

- `docker compose -f docker-compose.example.yml config`
- `docker compose -f docker-compose.example.yml up --build`
- `curl http://localhost:8001/ready`
- `curl http://localhost:8001/health`
- `curl -X POST http://localhost:8001/analyze ...`
- `docker compose -f docker-compose.example.yml down`
