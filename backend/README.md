uv init --package로 만든 백엔드용 폴더

루트 폴더에서 시작하기

```bash
uv run --package backend fastapi dev backend/src/backend/main.py
```

cd backend 후 시작하기

```bash
uv run fastapi dev backend/src/backend/main.py
```

production 배포 환경에서 시동

```bash
# gunicorn, uvicorn 설치 후
uv run gunicorn -w 4 -k uvicorn.workers.UvicornWorker src.backend.main:app --bind 0.0.0.0:8000
```

루트에서 mysql 시작하는 법(경로만 수정하면 됨)
docker 설치는 필수입니다.

```docker
docker compose --env-file .env -f ./backend/docker-compose.dev.yml up -d
# 중지하려면 docker compose down
```
