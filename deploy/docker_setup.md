# Docker Setup

현재 단계에서는 실제 Docker image를 완성하지 않고, `deploy/` 폴더에서 적용 방향과 예시 파일만 정리한다.

`ai_service`가 FastAPI wrapper라면 Docker image는 비교적 가볍게 구성할 수 있다. Hugging Face Inference Endpoint를 사용하면 wrapper image 안에 PyTorch나 Transformers 전체 runtime을 포함하지 않아도 될 수 있다.

## Expected Packages

FastAPI wrapper에 필요한 최소 패키지 예시는 다음과 같다.

```text
fastapi
uvicorn
requests
pydantic
python-dotenv
```

실제 dependency는 `ai_service` 구현 시점에 `pyproject.toml` 또는 requirements 파일에서 관리한다.

## Example Command

```bash
docker compose -f deploy/docker-compose.example.yml up --build
```

`docker-compose.example.yml`의 `env_file` 경로는 compose 파일 위치인 `deploy/`를 기준으로 한다. 따라서 예시 실행 명령은 repo root에서 실행하고, compose 파일 안에서는 `.env.example`로 참조한다.

## Notes

- `docker-compose.example.yml`은 예시 파일이다.
- 실제 운영용으로 사용하기 전에 build context, Dockerfile 위치, port, env file 경로를 확인해야 한다.
- `AI_SERVICE_MODE` 기본값은 `deploy/.env.example`에서 관리한다. compose `environment`로 하드코딩하면 `hf_endpoint` 전환 시 env file 값을 덮어쓸 수 있으므로 피한다.
- 실제 secret은 `.env.example`에 작성하지 않는다.
- 운영 환경에서는 GitHub Secrets, cloud secret manager, server environment variables 중 하나로 secret을 주입한다.
