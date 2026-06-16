# Build stage: install dependencies with uv and create a virtualenv
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

COPY uv.lock ./
COPY ai_service/pyproject.toml ./pyproject.toml
COPY ai_service ./ai_service

RUN pip install uv && uv sync --frozen

# Final stage: runtime image with only the virtualenv and source tree
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
# ai_service 소스 복사
COPY ai_service ./

ENV PATH="/app/.venv/bin:$PATH"
#ENV PYTHONPATH="/app"

EXPOSE 8080
CMD ["uvicorn", "src.ai_service.main:app", "--host", "0.0.0.0", "--port", "8080"]
