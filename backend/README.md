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

`.env` 파일을 열어 아래 값을 채웁니다.

```
MYSQL_ROOT_PASSWORD=원하는값
MYSQL_DATABASE=smishing_db
MYSQL_USER=원하는값
MYSQL_PASSWORD=원하는값
DATABASE_URL=mysql+asyncmy://${MYSQL_USER}:${MYSQL_PASSWORD}@mysql:3306/${MYSQL_DATABASE}
```

> **나머지 값은 비워도 됩니다.** `USE_MOCK_MODEL=true`, `USE_MOCK_OCR=true`로 설정하면 HF 토큰, 모델 엔드포인트, CLOVA OCR 키 없이도 전체 플로우가 동작합니다.

---

### 2단계 — 백엔드 + DB 실행

루트 디렉토리에서 실행합니다.

```bash
# 백엔드 + MySQL + 모니터링 전체 실행
docker compose -f docker-compose.dev.yml up -d --build

# 또는 FastAPI만 로컬에서 실행 (별도 터미널)
cd backend && uv run uvicorn src.backend.main:app --reload
```

- 백엔드: `http://localhost:8000`
- MySQL: `localhost:3307` (로컬 MySQL 충돌 방지를 위해 3307 사용)
- Swagger 문서: `http://localhost:8000/docs`

서버 상태 확인:

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
# 실제 백엔드 연동 시
VITE_USE_MOCK=false VITE_API_BASE_URL=http://localhost:8000 npm run dev
```

브라우저에서 `http://localhost:5173` 접속

---

## 동작 확인

### API 직접 테스트

**SMS 분석**
```bash
curl -X POST http://localhost:8000/api/predict \
  -H "Content-Type: application/json" \
  -d '{"type": "sms", "content": "[국외발신] 계좌가 정지되었습니다 http://test.com"}'
```

**URL 분석**
```bash
curl -X POST http://localhost:8000/api/predict \
  -H "Content-Type: application/json" \
  -d '{"type": "url", "content": "http://cj-logistics-re.com/confirm"}'
```

**이미지 분석 (OCR)** — base64 data URI 전달
```bash
curl -X POST http://localhost:8000/api/ocr \
  -H "Content-Type: application/json" \
  -d '{"image": "data:image/png;base64,..."}'
```

**신고**
```bash
curl -X POST http://localhost:8000/api/reports \
  -H "Content-Type: application/json" \
  -d '{"type":"sms","content":"신고 내용","category":"기타","agreeShare":true}'
```

### DB 저장 확인

> 블랙리스트(전화번호/URL 패턴)는 `static_patterns` → **`blacklist` 테이블로 통합**되었습니다.

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
| POST | `/api/ocr` | 이미지 OCR (텍스트 추출, 분석 전 단계) |
| POST | `/api/reports` | 스미싱 신고 |
| GET | `/api/history` | 분석 이력 조회 (현재 준비 중, `501`) |
| GET | `/api/cases` | 스미싱 사례 목록 (현재 준비 중, `501`) |
| POST | `/api/feedback` | 사용자 피드백 제출 (현재 준비 중, `501`) |
| GET | `/api/jobs/{job_id}` | 비동기 작업 상태 조회 (현재 준비 중, `501`) |
| POST | `/api/share` | 분석 결과 공유 (현재 준비 중, `501`) |
| GET | `/api/sender/{number}` | 전화번호 블랙리스트 조회 |
| GET | `/admin/url-candidates` | (관리자) URL 후보 조회 |
| POST | `/admin/url-candidates/{id}/approve` | (관리자) URL 후보 승인 |
| POST | `/admin/url-candidates/{id}/reject` | (관리자) URL 후보 거절 |

### `/api/predict` 요청 형식

```json
{
  "type": "sms",      // "sms" | "url" | "image"
  "content": "분석할 텍스트 또는 base64 이미지"
}
```

- `type=sms`/`url`: `content`는 텍스트, 최대 2000자
- `type=image`: `content`는 base64 data URI, 최대 약 5MB
- 초과 시 `422` 반환 (대용량 페이로드 남용 방어)

> 응답은 `response_model_exclude_none`이 적용되어, 해당 타입과 무관한 필드(`null`)는 제외됩니다.

---

## 분석 파이프라인

```
입력
 ├── type=url   → 블랙리스트 URL 매칭
 │                 ├── 매칭     → STATIC_PATTERN 판정
 │                 └── 미매칭   → 안전 처리 + VirusTotal 검증 큐 등록
 ├── type=image → OCR 텍스트 추출(CLOVA/PaddleOCR) → SMS 파이프라인
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

> **URL 단독 분석**(`type=url`)에서 블랙리스트에 없는 신규 URL도 VirusTotal 검증 큐(`url_candidates`)에 등록되어, 검증 사각지대 없이 추적됩니다.

---

## Mock / 모델 설정

| 환경변수 | 기본값 | 설명 |
|----------|--------|------|
| `USE_MOCK_MODEL` | `false` | `true` 시 인코더/디코더 모의 응답 (`label=smishing, score=0.85`) |
| `USE_MOCK_OCR` | `false` | `true` 시 OCR 고정 텍스트 반환 |
| `USE_CLOVA_ONLY` | `false` | `true` 시 PaddleOCR 없이 CLOVA OCR만 사용 (PaddleOCR 워밍업/초기화 스킵) |

> **모델 설정 누락 시 동작**: `USE_MOCK_MODEL=false`인데 인코더 키/엔드포인트가 없으면, 가짜 결과 대신 `503 (CONFIGURATION_ERROR)`를 반환합니다. 모의 응답이 필요하면 반드시 `USE_MOCK_MODEL=true`를 명시해야 합니다.

실제 모델 연동 시 `.env`에 아래 값을 채웁니다.

```
USE_MOCK_MODEL=false
USE_MOCK_OCR=false
ENCODER_API_KEY=
ENCODER_INFERENCE_ENDPOINT=
DECODER_ENDPOINT_URL=

# CLOVA OCR 사용 시
USE_CLOVA_ONLY=true
CLOVA_OCR_URL=
CLOVA_OCR_SECRET=
```

### OCR 모드

- `USE_CLOVA_ONLY=true`: CLOVA OCR만 호출 (EC2 등 PaddleOCR 미사용 환경에 적합)
- `USE_CLOVA_ONLY=false` (기본): PaddleOCR 1차 인식 → 품질 미달 시 CLOVA fallback

> 디코더(Modal)·인코더(HuggingFace)는 서버리스라 첫 요청에 cold start(수십 초)가 발생할 수 있습니다. 백엔드는 디코더 호출에 60초 타임아웃 + fallback 안내 메시지를 적용합니다.

---

## URL 후보 검증

모델이 스미싱으로 판정한 문자, 사용자 신고 문자, URL 직접 분석에서 추출한 URL은
`blacklist`에 즉시 등록하지 않습니다. 먼저 `url_candidates`에 누적하고,
별도 VirusTotal worker가 검증합니다.

검증 정책:

- `malicious >= 3`: 승인 후 `blacklist`로 승격
- `malicious >= 1` 또는 `suspicious >= 1`: `REVIEW_REQUIRED`
- 탐지 결과가 없거나 아직 알려지지 않은 URL: `PENDING` 유지 후 재검사
- VirusTotal에 없는 URL은 분석 요청 제출 후 기본 15분 뒤 재검사
- `REJECTED`: 관리자가 정상 URL로 판정하여 자동 재검사에서 제외

VirusTotal API 요청은 분당·일일 한도를 함께 적용합니다. 429 응답이나 일일 한도
도달 시 후보의 `next_check_at`을 뒤로 미루고, 해당 실행에서는 추가 호출을
중단합니다. 호출 시도 수는 `virustotal_quota`에 날짜별로 기록됩니다. URL은
길이를 자르지 않고 보관하며, 정규화된 전체 URL의 SHA-256 값으로 중복을
구분합니다.

### VirusTotal worker 실행

운영 배포에서는 `url-validator` 컨테이너를 worker 실행 주체로 사용합니다.
현재 FastAPI 애플리케이션도 lifespan에서 worker를 시작하므로, 같은 DB를 대상으로
API 컨테이너와 `url-validator`를 동시에 실행하면 중복 처리 위험이 있습니다.
둘 중 하나만 실행하도록 배포 구성을 통일해야 합니다.

```bash
# 로컬 단독 실행
cd backend
uv run python -m backend.workers.virustotal_worker

# Docker Compose (url-validator 서비스)
docker compose -f docker-compose.dev.yml up -d --build
docker compose -f docker-compose.dev.yml logs -f url-validator
```

`VIRUSTOTAL_API_KEY`가 필요하며 실행 주기, 배치 크기, 재시도 간격과 자동 승인
기준은 루트 `.env.example`의 환경변수로 조정합니다.

worker는 MySQL advisory lock으로 한 인스턴스만 VT 검증을 수행합니다. 각 후보도
처리 전에 lease와 처리 토큰을 잡으므로 worker가 중단되더라도 lease 만료 후 다시
처리됩니다.

### URL 후보 수동 검토

VirusTotal 신호가 약한 후보는 `REVIEW_REQUIRED`로 남습니다. `ADMIN_API_KEY`를
설정한 뒤 관리자 전용 API에서 조회하고 승인 또는 거절할 수 있습니다.

```bash
curl "http://localhost:8000/admin/url-candidates?status=REVIEW_REQUIRED" \
  -H "X-Admin-API-Key: $ADMIN_API_KEY"

curl -X POST "http://localhost:8000/admin/url-candidates/1/approve" \
  -H "Content-Type: application/json" \
  -H "X-Admin-API-Key: $ADMIN_API_KEY" \
  -d '{"reviewer":"team-admin","note":"URL 확인 완료"}'
```

승인된 후보만 `blacklist`에 URL 패턴으로 등록됩니다.

---

## DB 마이그레이션

애플리케이션의 `create_all`만으로는 컬럼 변경·유니크 제약이 반영되지 않습니다.
배포 전 DB 백업 후 아래 마이그레이션을 순서대로 적용합니다.

```bash
docker compose exec -T mysql sh -c \
  'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' \
  < backend/migrations/001_url_candidate_validation.sql
```

| 파일 | 내용 |
|------|------|
| `001_url_candidate_validation.sql` | URL 후보 검증 테이블 |
| `002_blacklist_schema_unification.sql` | `static_patterns` → `blacklist` 스키마 통합 |
| `002_training_collection_fields.sql` | 학습 데이터 수집 필드 |
| `003_smishing_logs_schema_alignment.sql` | `smishing_logs` 스키마 정렬 |

---

## 배포 (AWS)

CI/CD는 GitHub Actions(`.github/workflows/cicd.yml`)로 동작하며, **`main` 또는 `deploy` 브랜치 push 시** 트리거됩니다.

```
push (main/deploy)
  → 백엔드 Docker 이미지 빌드 & ECR push
  → 프론트엔드 빌드 → EC2로 전송
  → EC2에서 새 이미지 pull + 컨테이너 재시작 (force-recreate)
```

- **ECR**: `395120012527.dkr.ecr.ap-northeast-2.amazonaws.com/smishing-server:latest`
- **EC2 구성** (`docker-compose.prod.yml`):
  - `fastapi` — API 서버
  - `url-validator` — VirusTotal worker (단독)
  - `data-pipeline` — 데이터 수집 파이프라인
  - `prometheus` / `grafana` / `node-exporter` — 모니터링
  - `nginx` — 리버스 프록시 (도메인: `smishing-detect-kdt2.cloud`)
- **모니터링 접속**: `https://smishing-detect-kdt2.cloud/grafana/`

### 백엔드만 수동 배포 (예: 프론트 빌드 실패 시)

```bash
aws ecr get-login-password --region ap-northeast-2 | \
  docker login --username AWS --password-stdin \
  395120012527.dkr.ecr.ap-northeast-2.amazonaws.com
docker-compose -f ~/docker-compose.prod.yml pull fastapi
docker-compose -f ~/docker-compose.prod.yml up -d --no-deps --force-recreate fastapi
```

---

## 남용 방어

| 방어 | 내용 |
|------|------|
| Rate Limiting | IP당 분당 15회 (`slowapi`, 전역 적용) |
| 입력 길이 제한 | predict content 텍스트 2000자 / 이미지 ~5MB, report 필드별 제한 |
| 중복 신고 억제 | `blacklist` INSERT IGNORE로 중복 전화번호/URL 무시 |
