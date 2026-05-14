# Deploy Documentation

이 폴더는 AI 모델 배포, 모델 서빙, backend 연동 구조를 정리하기 위한 설계 문서와 deployment wrapper 예시 코드를 담는다.

현재 `frontend_python`, `backend`, `ai_service`, 모델 학습이 모두 진행 중이므로 이 단계에서는 실제 백엔드나 실제 모델에 직접 연결하지 않는다. 대신 mock-first 방식으로 API 형태와 배포 구조를 먼저 고정한다.

`ai_service/` 폴더는 모델링 담당자가 학습, 평가, inference 실험 코드를 관리하는 영역이므로 이 작업에서는 수정하지 않는다. Hugging Face Endpoint 기반 async FastAPI wrapper는 `deploy/app/` 아래에 작성한다.

최종 목표는 `deploy` wrapper가 Hugging Face Inference Endpoint를 직접 감싸는 async FastAPI wrapper 역할을 하는 구조다. 백엔드는 deploy wrapper의 `/analyze` API만 호출하고, deploy wrapper는 FastAPI lifespan에서 관리되는 공유 `httpx.AsyncClient`로 Encoder Endpoint와 Decoder Endpoint를 순차 호출한 뒤 `label`, `confidence`, `reason` 형식으로 정규화한다.

사용자가 입력하는 전화번호는 deploy wrapper의 분석 대상이 아니다. 전화번호 선택 입력, 신고 버튼, 신고 안내 페이지, 신고된 전화번호 저장, 신고 횟수 증가는 frontend/backend/DB 책임으로 둔다. Deploy wrapper는 문자 내용 `text`만 받아 분석 결과를 반환한다.

## Scope

- `deploy/` 내부 문서 및 예시 파일 작성
- `deploy/app/` 내부 mock-first async FastAPI wrapper 작성
- mock mode 기준 API contract 정리
- Hugging Face Endpoint 전환을 위한 환경변수와 체크리스트 정리
- Docker/docker-compose 적용 방향 초안 정리

## Out of Scope

- 기존 `frontend_python/`, `backend/`, `ai_service/` 코드 수정
- 실제 모델 학습 코드 작성
- 실제 Hugging Face Endpoint 생성
- 실제 DB 연결
- 전화번호 저장 또는 신고 횟수 업데이트
- 실제 토큰, 비밀번호, secret 작성

## Security Rule

이 폴더에는 실제 민감정보를 절대 작성하지 않는다.

- 실제 `HF_TOKEN` 금지
- 실제 DB 비밀번호 금지. deploy wrapper는 DB에 직접 연결하지 않는다.
- 실제 운영 endpoint secret 금지
- `.env` 파일 대신 `.env.example`만 사용

## Local Verification

Deploy wrapper는 로컬 Python 환경에서 mock mode 기준으로 정상 실행을 확인했다.

내부 구현은 async FastAPI endpoint와 공유 `httpx.AsyncClient` 기반 HF Endpoint 호출 구조를 사용한다. API request/response contract는 기존과 동일하다.

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

Docker compose validation has been completed for the deploy wrapper. Docker 검증은 추후 선택 사항이 아니라, Docker 기반 실행 전 반드시 확인해야 하는 검증 항목이다.

`deploy/` 디렉터리 기준으로 다음 명령을 실행한다.

```bash
cd deploy
docker compose -f docker-compose.example.yml config
docker compose -f docker-compose.example.yml up --build
```

다른 터미널에서 실행 후 확인:

```bash
curl http://localhost:8001/health
curl -X POST http://localhost:8001/analyze \
  -H "Content-Type: application/json" \
  -d '{"text":"고객님의 계정이 정지되었습니다. 아래 링크에서 인증하세요."}'
```

검증 후 종료:

```bash
cd deploy
docker compose -f docker-compose.example.yml down
```

Verified:

- `docker compose -f docker-compose.example.yml config`
- `docker compose -f docker-compose.example.yml up --build`
- `curl http://localhost:8001/health`
- `curl -X POST http://localhost:8001/analyze ...`
- `docker compose -f docker-compose.example.yml down`
