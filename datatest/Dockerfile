FROM python:3.12-slim

WORKDIR /app

COPY datatest/requirements.scheduler.txt .
RUN pip install --no-cache-dir -r requirements.scheduler.txt

COPY datatest/test-code/pipeline/ ./pipeline/

CMD ["python", "-m", "pipeline.scheduler"]
