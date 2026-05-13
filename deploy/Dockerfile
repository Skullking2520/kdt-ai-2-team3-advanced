# Deploy wrapper runtime image.

FROM python:3.12-slim

WORKDIR /app

COPY deploy/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY deploy/app /app/deploy/app

CMD ["uvicorn", "deploy.app.main:app", "--host", "0.0.0.0", "--port", "8001"]
