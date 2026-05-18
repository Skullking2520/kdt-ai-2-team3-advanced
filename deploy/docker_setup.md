# Docker Setup

이 문서는 deploy wrapper의 Docker 실행 절차를 정리한다. Docker 검증은 추후 선택 사항이 아니라, Docker CLI가 설치된 환경에서 반드시 완료해야 하는 검증 항목이다.

Deploy wrapper가 async FastAPI app이라면 Docker image는 비교적 가볍게 구성할 수 있다. Hugging Face serverless API 또는 dedicated Inference Endpoint를 사용하면 wrapper image 안에 PyTorch나 Transformers 전체 runtime을 포함하지 않아도 될 수 있다.

HF API 호출은 `httpx.AsyncClient` 기반으로 처리한다. API contract와 Docker/로컬 실행 명령은 기존과 동일하게 유지한다.

Wrapper app은 `deploy/app/` 아래에 둔다. `ai_service/`는 모델링 담당자가 모델 학습, 평가, inference 실험 코드를 관리하는 영역이므로 Docker wrapper 구현에서 수정하지 않는다.

## Expected Packages

FastAPI wrapper에 필요한 최소 패키지 예시는 다음과 같다.

```text
fastapi==0.136.1
uvicorn==0.47.0
httpx==0.28.1
pydantic==2.12.4
```

Docker dependency는 `deploy/requirements.txt`에 둔다. Docker image는 이 파일을 직접 설치하고 `deploy/Dockerfile`을 사용해 wrapper app을 실행한다. 루트 `uv` workspace dependency와는 별도로 관리되는 deploy wrapper 전용 runtime dependency다.

Docker image는 운영 기본값에 가깝게 다음 설정을 포함한다.

- non-root user 실행
- Python bytecode 생성 비활성화
- `/health` 기반 container healthcheck

## Docker Files

- `deploy/Dockerfile`: deploy wrapper runtime image
- `deploy/docker-compose.example.yml`: local Docker compose execution example
- `deploy/.env.example`: local compose env file. 실제 secret을 작성하지 않는다.

## Required Verification Commands

`deploy/` 디렉터리에서 실행한다.

```bash
cd deploy
docker compose -f docker-compose.example.yml config
docker compose -f docker-compose.example.yml up --build
```

다른 터미널에서 health check와 mock analyze를 확인한다.

```bash
curl http://localhost:8001/health
curl -X POST http://localhost:8001/analyze \
  -H "Content-Type: application/json" \
  -d '{"text":"고객님의 계정이 정지되었습니다. 아래 링크에서 인증하세요."}'
```

검증 후 컨테이너를 종료한다.

```bash
cd deploy
docker compose -f docker-compose.example.yml down
```

`docker-compose.example.yml`의 `env_file` 경로는 compose 파일 위치인 `deploy/`를 기준으로 한다. 따라서 compose 파일 안에서는 `.env.example`로 참조한다.

## Verification Status

Docker compose validation has been completed for the deploy wrapper.

Verified commands:

- `docker compose -f docker-compose.example.yml config`
- `docker compose -f docker-compose.example.yml up --build`
- `curl http://localhost:8001/ready`
- `curl http://localhost:8001/health`
- `curl -X POST http://localhost:8001/analyze ...`
- `docker compose -f docker-compose.example.yml down`

## Notes

- `AI_SERVICE_MODE` 기본값은 `deploy/.env.example`에서 관리한다. compose `environment`로 하드코딩하면 `hf_endpoint` 전환 시 env file 값을 덮어쓸 수 있으므로 피한다.
- 모델팀이 Hugging Face 웹 GUI에서 생성한 endpoint를 연결할 때는 `HF_SERVING_TYPE=endpoint`와 `ENCODER_ENDPOINT_URL`, `DECODER_ENDPOINT_URL`을 사용한다.
- `HF_SERVING_TYPE=serverless`는 endpoint URL 없이 model ID 기반 호출이 필요할 때만 사용한다.
- 실제 secret은 `.env.example`에 작성하지 않는다.
- 운영 환경에서는 GitHub Secrets, cloud secret manager, server environment variables 중 하나로 secret을 주입한다.
