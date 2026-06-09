# Backend

스미싱 탐지 백엔드 서버입니다. FastAPI + MySQL 기반으로 동작하며, `USE_MOCK_MODEL=true` 설정 시 AI 모델 없이도 전체 플로우를 로컬에서 재현할 수 있습니다.

---

## 사전 준비

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) 설치
- Node.js 18 이상 (프론트엔드 실행 시)

---

## 로컬 실행 방법

### 1단계 — 환경변수 설정

루트 디렉토리에서 `.env.example`을 복사합니다.

```bash
cp .env.example .env
```

`.env` 파일을 열어 아래 4개 값을 자유롭게 채웁니다.

```
MYSQL_ROOT_PASSWORD=원하는값
MYSQL_DATABASE=smishing_db
MYSQL_USER=원하는값
MYSQL_PASSWORD=원하는값
DATABASE_URL=mysql+asyncmy://${MYSQL_USER}:${MYSQL_PASSWORD}@mysql:3306/${MYSQL_DATABASE}
```

> **나머지 값은 비워도 됩니다.** `USE_MOCK_MODEL=true`가 기본값이라 HF 토큰, 모델 엔드포인트, CLOVA OCR 키 없이도 동작합니다.

---

### 2단계 — 백엔드 + DB 실행

루트 디렉토리에서 실행합니다.

```bash
docker compose -f docker-compose.dev.yml up -d --build
```

- 백엔드: `http://localhost:8000`
- MySQL: `localhost:3307` (로컬 MySQL 충돌 방지를 위해 3307 사용)

서버가 정상 실행됐는지 확인:

```bash
curl http://localhost:8000/health
```

중지:

```bash
docker compose -f docker-compose.dev.yml down
```

---

### 3단계 — 프론트엔드 실행

```bash
cd frontend
npm install
npm run dev
```

브라우저에서 `http://localhost:5173` 접속

---

## 동작 확인

### API 직접 테스트

**SMS 분석**
```bash
curl -X POST http://localhost:8000/api/predict \
  -H "Content-Type: application/json" \
  -d '{"type": "sms", "content": "엄마 나 폰 고장났어. 010-1234-5678로 연락줘"}'
```

**URL 분석**
```bash
curl -X POST http://localhost:8000/api/predict \
  -H "Content-Type: application/json" \
  -d '{"type": "url", "content": "http://cj-logistics-re.com/confirm"}'
```

**전화번호 조회**
```bash
curl http://localhost:8000/api/sender/010-1234-5678
```

### DB 저장 확인

```bash
docker exec -it mysql_container mysql --default-character-set=utf8mb4 \
  -u $MYSQL_USER -p$MYSQL_PASSWORD $MYSQL_DATABASE \
  -e "SELECT id, content, is_smishing, detection_type, input_type, ai_score, created_at FROM smishing_logs ORDER BY id DESC LIMIT 10;"
```

---

## API 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/health` | 서버 상태 확인 |
| POST | `/api/predict` | SMS / URL / 이미지 분석 |
| POST | `/api/reports` | 스미싱 신고 |
| GET | `/api/sender/{number}` | 전화번호 블랙리스트 조회 |

### `/api/predict` 요청 형식

```json
{
  "type": "sms",      // "sms" | "url" | "image"
  "content": "분석할 텍스트 또는 base64 이미지"
}
```

---

## 분석 파이프라인

```
입력
 ├── type=url   → 블랙리스트 URL 매칭 → 결과 반환
 ├── type=image → OCR 텍스트 추출 → SMS 파이프라인
 └── type=sms
      ├── 정적 패턴 매칭 (블랙리스트 URL/전화번호)
      │    └── 매칭 → STATIC_PATTERN 판정
      └── 인코더 분류
           ├── 정상 → ENCODER 판정
           └── 스미싱
                ├── 점수 ≥ 0.90 → ENCODER 판정
                └── 점수 < 0.90 → RAG_DECODER 판정 (디코더 설명 생성)
```

모든 분석 결과는 `smishing_logs` 테이블에 자동 저장됩니다.

---

## Mock 모드

`USE_MOCK_MODEL=true` (기본값) 시 동작:

| 기능 | Mock 동작 |
|------|-----------|
| 인코더 | `label=smishing, score=0.85` 고정 반환 |
| 디코더 | 고정 설명 텍스트 반환 |
| OCR | 고정 스미싱 문자 텍스트 반환 |

실제 모델 연동 시 `.env`에 아래 값을 채웁니다.

```
USE_MOCK_MODEL=false
ENCODER_API_KEY=
ENCODER_INFERENCE_ENDPOINT=
HF_TOKEN=
DECODER_ENDPOINT_URL=
CLOVA_OCR_URL=
CLOVA_OCR_SECRET=
```
