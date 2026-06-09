# Backend

## 로컬 실행 방법

### 1단계 — 환경변수 설정

```bash
# 루트에서 실행
cp .env.example .env
```

`.env` 파일을 열어 아래 값을 채웁니다.

```
MYSQL_ROOT_PASSWORD=
MYSQL_DATABASE=
MYSQL_USER=
MYSQL_PASSWORD=
DATABASE_URL=mysql+asyncmy://${MYSQL_USER}:${MYSQL_PASSWORD}@mysql:3306/${MYSQL_DATABASE}
```

> `USE_MOCK_MODEL=true` 가 기본값이므로 HF 토큰, 모델 엔드포인트, CLOVA OCR 키는 비워도 전체 플로우 동작합니다.

### 2단계 — 백엔드 + DB 시작

```bash
# 루트에서 실행
docker compose -f docker-compose.dev.yml up -d --build
```

백엔드(`http://localhost:8000`)와 MySQL이 함께 실행됩니다.

중지:

```bash
docker compose -f docker-compose.dev.yml down
```

### DB 로그 확인 (선택)

```bash
docker exec -it mysql_container mysql --default-character-set=utf8mb4 \
  -u $MYSQL_USER -p$MYSQL_PASSWORD $MYSQL_DATABASE \
  -e "SELECT id, content, is_smishing, detection_type, input_type, ai_score, created_at FROM smishing_logs ORDER BY id DESC LIMIT 10;"
```

---

## 직접 실행 (Docker 없이)

루트 폴더에서:

```bash
uv run --package backend fastapi dev backend/src/backend/main.py
```

또는 backend 폴더에서:

```bash
cd backend
uv run fastapi dev src/backend/main.py
```

---

## API 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/predict` | SMS / URL / 이미지 분석 |
| POST | `/api/reports` | 스미싱 신고 |
| GET | `/api/sender/{number}` | 전화번호 블랙리스트 조회 |
