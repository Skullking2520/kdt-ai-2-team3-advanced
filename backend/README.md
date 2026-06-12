# Backend

스미싱 탐지 백엔드 서버입니다. FastAPI + MySQL 기반으로 동작하며, `USE_MOCK_MODEL=true` 설정 시 AI 모델 없이도 전체 플로우를 로컬에서 재현할 수 있습니다.

---

## 사전 준비

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) 설치
- [uv](https://docs.astral.sh/uv/getting-started/installation/) 설치 (Python 패키지 매니저)
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
# MySQL + 모니터링 실행
docker compose -f docker-compose.dev.yml up -d mysql prometheus grafana node-exporter

# FastAPI 로컬 실행 (별도 터미널)
cd backend && uv run uvicorn src.backend.main:app --reload
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

| 환경변수 | 기본값 | Mock 동작 |
|----------|--------|-----------|
| `USE_MOCK_MODEL` | `true` | 인코더: `label=smishing, score=0.85` 고정 반환 |
| `USE_MOCK_OCR` | `false` | OCR: 고정 스미싱 문자 텍스트 반환 |

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

## URL 후보 검증

모델이 스미싱으로 판정한 문자나 사용자 신고 문자에서 추출한 URL은
`static_patterns`에 즉시 등록하지 않습니다. 먼저 `url_candidates`에 누적하고,
별도 VirusTotal worker가 검증합니다.

검증 정책:

- `malicious >= 3`: 승인 후 `static_patterns`로 승격
- `malicious >= 1` 또는 `suspicious >= 1`: `REVIEW_REQUIRED`
- 탐지 결과가 없거나 아직 알려지지 않은 URL: `PENDING` 유지 후 재검사
- VirusTotal에 없는 URL은 분석 요청 제출 후 기본 15분 뒤 재검사
- `REJECTED`: 관리자가 정상 URL로 판정하여 자동 재검사에서 제외

VirusTotal API 요청은 분당·일일 한도를 함께 적용합니다. 429 응답이나 일일 한도
도달 시 후보의 `next_check_at`을 뒤로 미루고, 해당 실행에서는 추가 호출을
중단합니다. 호출 시도 수는 `virustotal_quota`에 날짜별로 기록됩니다. URL은
길이를 자르지 않고 보관하며, 정규화된 전체 URL의 SHA-256 값으로 중복을
구분합니다. 따라서 경로의 대소문자도 보존됩니다.

worker는 API 프로세스와 별도로 실행합니다.

```bash
cd backend
uv run python -m backend.workers.virustotal_worker
```

Docker Compose에서는 `url-validator` 서비스가 같은 backend 이미지를 별도 명령으로
실행합니다.

```bash
docker compose -f docker-compose.dev.yml up -d --build
docker compose -f docker-compose.dev.yml logs -f url-validator
```

`VIRUSTOTAL_API_KEY`가 필요하며 실행 주기, 배치 크기, 재시도 간격과 자동 승인
기준은 루트 `.env.example`에 정의된 환경변수로 조정할 수 있습니다.

기존 DB에는 애플리케이션의 `create_all`만으로 컬럼 변경과 유니크 제약이
반영되지 않습니다. 배포 전에 DB 백업 후 아래 마이그레이션을 한 번 적용합니다.

```bash
docker compose exec -T mysql sh -c \
  'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' \
  < backend/migrations/001_url_candidate_validation.sql
```

## URL 후보 수동 검토

VirusTotal 신호가 약한 후보는 `REVIEW_REQUIRED`로 남습니다. `ADMIN_API_KEY`를
설정한 뒤 관리자 전용 API에서 조회하고 승인 또는 거절할 수 있습니다.

```bash
curl "http://localhost:8000/admin/url-candidates?status=REVIEW_REQUIRED" \
  -H "X-Admin-API-Key: $ADMIN_API_KEY"

curl -X POST \
  "http://localhost:8000/admin/url-candidates/1/approve" \
  -H "Content-Type: application/json" \
  -H "X-Admin-API-Key: $ADMIN_API_KEY" \
  -d '{"reviewer":"team-admin","note":"URL 확인 완료"}'

curl -X POST \
  "http://localhost:8000/admin/url-candidates/2/reject" \
  -H "Content-Type: application/json" \
  -H "X-Admin-API-Key: $ADMIN_API_KEY" \
  -d '{"reviewer":"team-admin","note":"정상 공식 도메인"}'
```

승인된 후보만 `static_patterns`에 URL 패턴으로 등록됩니다. 거절된 후보는
재검사 대상에서 제외되며 검토자와 메모가 후보 레코드에 남습니다. 관리자가 이미
승인된 후보를 거절하면 URL 후보 검증 기능이 생성한 정적 패턴만 함께 제거됩니다.
기존 수동 패턴은 제거하지 않습니다. 거절된 URL이 사용자에게 다시 신고되면
`PENDING`으로 돌아가 VirusTotal 검증을 다시 받습니다.

worker는 MySQL advisory lock으로 한 인스턴스만 VT 검증을 수행합니다. 각 후보도
처리 전에 lease와 처리 토큰을 잡으므로 worker가 중단되더라도 lease 만료 후 다시
처리됩니다. 관리자가 검토하면 처리 토큰이 무효화되어, 늦게 도착한 VirusTotal
응답이 관리자 판단을 덮어쓰지 않습니다.
