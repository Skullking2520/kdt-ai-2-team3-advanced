# Docker Setup

현재 단계에서는 실제 Docker image를 완성하지 않고, `deploy/` 폴더에서 적용 방향과 예시 파일만 정리한다.

Deploy wrapper가 FastAPI app이라면 Docker image는 비교적 가볍게 구성할 수 있다. Hugging Face Inference Endpoint를 사용하면 wrapper image 안에 PyTorch나 Transformers 전체 runtime을 포함하지 않아도 될 수 있다.

Wrapper app은 `deploy/app/` 아래에 둔다. `ai_service/`는 모델링 담당자가 모델 학습, 평가, inference 실험 코드를 관리하는 영역이므로 Docker wrapper 구현에서 수정하지 않는다.

## Expected Packages

FastAPI wrapper에 필요한 최소 패키지 예시는 다음과 같다.

```text
fastapi
uvicorn
requests
pydantic
python-dotenv
```

예시 dependency는 `deploy/requirements.example.txt`에 둔다. 실제 운영 dependency는 배포 방식이 확정될 때 별도 잠금 파일이나 프로젝트 설정으로 관리한다.

## Example Command

repo root에서 실행할 때:

```bash
docker compose -f deploy/docker-compose.example.yml up --build
```

`docker-compose.example.yml`의 `env_file` 경로는 compose 파일 위치인 `deploy/`를 기준으로 한다. 따라서 예시 실행 명령은 repo root에서 실행하고, compose 파일 안에서는 `.env.example`로 참조한다.

`deploy/` 디렉터리에서 실행할 때:

```bash
cd deploy
docker compose -f docker-compose.example.yml config
docker compose -f docker-compose.example.yml up --build
```

## Verification Status

Docker compose validation is pending because Docker CLI is not available in the current local environment.

## Notes

- `docker-compose.example.yml`은 예시 파일이다.
- 실제 운영용으로 사용하기 전에 build context, Dockerfile 위치, port, env file 경로를 확인해야 한다.
- `AI_SERVICE_MODE` 기본값은 `deploy/.env.example`에서 관리한다. compose `environment`로 하드코딩하면 `hf_endpoint` 전환 시 env file 값을 덮어쓸 수 있으므로 피한다.
- 실제 secret은 `.env.example`에 작성하지 않는다.
- 운영 환경에서는 GitHub Secrets, cloud secret manager, server environment variables 중 하나로 secret을 주입한다.
