# 프로젝트 루트 경로에서 실행 가정
# 빌드 방법: docker build -f backend/Dockerfile -t smishing-backend .
# 1단계: 빌드 환경
FROM python:3.12-slim AS builder

RUN apt-get update && apt-get install -y \
    build-essential \
    default-libmysqlclient-dev \
    pkg-config \
    libgomp1 \
    libglib2.0-0 \
    libgl1 \
    libsm6 \
    libxext6 \
    libxrender1 \
    && rm -rf /var/lib/apt/lists/*

# default-libmysqlclient-dev: MySQL 클라이언트 라이브러리의 개발 헤더와 라이브러리를 설치
# apt-get update를 하면 패키지 인덱스 파일들이 /var/lib/apt/lists/에 저장되므로
# 이미지 경량화를 위해서 제거

WORKDIR /app

# [개선 1] 설정 파일만 먼저 복사 (소스코드 복사 전에 실행하여 캐시 극대화)
COPY uv.lock pyproject.toml ./
# 모노리포 환경인 경우 루트의 pyproject.toml이나 관련 설정이 필요할 수 있으므로 뼈대만 복사합니다.
COPY backend/pyproject.toml ./backend/pyproject.toml

RUN pip install uv

# [개선 2] 특정 패키지(ai_service)의 의존성만 골라서 동기화 (--no-install-workspace)
# 소스코드가 없는 상태에서 뼈대(의존성)만 먼저 가상환경에 싱크합니다.
RUN uv sync --frozen --no-install-workspace --package backend

# 2단계: 실행 환경 (최종 이미지)
FROM python:3.12-slim

RUN apt-get update && apt-get install -y \
    libgomp1 \
    libglib2.0-0 \
    libgl1 \
    libsm6 \
    libxext6 \
    libxrender1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# builder 단계에서 생성된 가상환경(.venv)만 복사
COPY --from=builder /app/.venv .venv

# backend 소스 복사
COPY backend ./

# PATH 설정 (uv가 .venv 안에 설치되어 있으므로)
ENV PATH="/app/.venv/bin:$PATH"

# 런타임에 실행될 스크립트에 확실하게 실행 권한 부여
RUN chmod +x ./entrypoint.sh

EXPOSE 8000

# 빌드 타임의 크래시를 피하고, EC2 인스턴스가 활성화될 때 모델을 안전하게 다운로드
ENTRYPOINT ["./entrypoint.sh"]

# 클라우드에서 docker run이나 docker compose시 .env로 db url 맞춰서 주입하기

# 필독!: 환경이 linux/amd64이므로 빌드 명령어 (cicd에서 쓰세요.)
# 맥북에서는 qemu 가상화(aarch64 -> x86/64)를 안 쓰면 아예 이 도커파일이 빌드가 안됩니다.
# docker buildx build --platform linux/amd64 -t <ECR_CONTAINER_REGISTRY_URL>/smishing-backend:v1 --push .
