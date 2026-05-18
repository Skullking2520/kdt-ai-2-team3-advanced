# 빌드 방법: docker build -f backend/Dockerfile -t smishing-backend .
# 1단계: 빌드 환경
FROM python:3.12-slim AS builder

RUN apt-get update && apt-get install -y \
    build-essential \
    default-libmysqlclient-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# default-libmysqlclient-dev: MySQL 클라이언트 라이브러리의 개발 헤더와 라이브러리를 설치
# apt-get update를 하면 패키지 인덱스 파일들이 /var/lib/apt/lists/에 저장되므로
# 이미지 경량화를 위해서 제거

WORKDIR /app

# 의존성 파일과 소스 복사
COPY uv.lock ./
COPY backend ./backend
COPY backend/pyproject.toml ./pyproject.toml

# uv 설치 및 의존성 동기화
RUN pip install uv && uv sync --frozen

# 2단계: 실행 환경 (최종 이미지)
FROM python:3.12-slim

WORKDIR /app

# builder 단계에서 생성된 가상환경(.venv)만 복사
COPY --from=builder /app/.venv .venv

# backend 소스 복사
COPY backend ./

# PATH 설정 (uv가 .venv 안에 설치되어 있으므로)
ENV PATH="/app/.venv/bin:$PATH"

EXPOSE 8000
CMD [ "uvicorn", "src.backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
# 실행 방법: docker run -d -p 8000:8000 --env.file .env --name smishing-api smishing-backend:latest
# 클라우드에서 docker run시 .env로 db url 맞춰서 주입하기

# NCP 환경이 linux/amd64인 경우를 가정한 빌드 명령어
# docker buildx build --platform linux/amd64 -t <NCP_CONTAINER_REGISTRY_URL>/smishing-backend:v1 --push .
