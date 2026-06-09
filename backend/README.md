# Backend

`uv init --package`로 만든 백엔드용 폴더입니다.

## 실행

```bash
uv run --package backend fastapi dev backend/src/backend/main.py
```

`backend` 폴더에서 시작하려면:

```bash
cd backend
uv run fastapi dev src/backend/main.py
```

운영 환경에서 시작하려면:

```bash
uv run gunicorn -w 4 -k uvicorn.workers.UvicornWorker src.backend.main:app --bind 0.0.0.0:8000
```

루트에서 MySQL을 시작하려면 Docker가 필요합니다.

```bash
docker compose --env-file .env -f docker-compose.dev.yml up -d
docker compose -f docker-compose.dev.yml down
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
