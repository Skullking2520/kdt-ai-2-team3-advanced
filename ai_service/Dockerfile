# ==========================================
# 1. Build Stage
# ==========================================
FROM python:3.12-slim AS builder

RUN apt-get update && apt-get install -y \
    build-essential \
    pkg-config \
    libgomp1 \
    libglib2.0-0 \
    libgl1 \
    libsm6 \
    libxext6 \
    libxrender1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# [개선 1] 설정 파일만 먼저 복사 (소스코드 복사 전에 실행하여 캐시 극대화)
COPY uv.lock pyproject.toml ./
# 모노리포 환경인 경우 루트의 pyproject.toml이나 관련 설정이 필요할 수 있으므로 뼈대만 복사합니다.
COPY ai_service/pyproject.toml ./ai_service/pyproject.toml

RUN pip install uv

# [개선 2] 특정 패키지(ai_service)의 의존성만 골라서 동기화 (--no-install-workspace)
# 소스코드가 없는 상태에서 뼈대(의존성)만 먼저 가상환경에 싱크합니다.
RUN uv sync --frozen --no-install-workspace --package ai_service

# ==========================================
# 2. Final Stage
# ==========================================
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

# builder 단계에서 생성된 정제된 가상환경(.venv)만 복사
COPY --from=builder /app/.venv .venv
ENV PATH="/app/.venv/bin:$PATH"

# [개선 3] 모델 가중치 굽고 가기 (소스코드 복사 전에 수행!)
# 의존성 환경만 준비된 상태에서 모델을 다운로드하여 독립된 레이어로 캐싱합니다.
# 이렇게 하면 소스코드가 바뀌어도 모델을 다시 다운로드하지 않습니다.
RUN python -c "from langchain_huggingface import HuggingFaceEmbeddings; HuggingFaceEmbeddings(model_name='jhgan/ko-sroberta-multitask')"

# [개선 4] 마지막에 실제 AI 서비스 소스코드만 복사
COPY ai_service ./

EXPOSE 8080

CMD ["uvicorn", "src.ai_service.main:app", "--host", "0.0.0.0", "--port", "8080"]
