# API Contract — NewBiz Shield Frontend ↔ Backend ↔ AI

> 최종 수정: 2026-06-22
> 대상: 프론트엔드 라우트에서 호출하는 API endpoint 전체 명세 + 누락/충돌 정리
> 참조 백엔드 위키: `docs/BACKEND_WIKI.md`

---

## 1. 이 문서가 뭔가요

프론트엔드 라우트(URL)에서 호출하는 API endpoint의 전체 목록, 각 endpoint의 request/response 스키마, 그리고 백엔드/AI팀과 합의가 필요한 항목을 한 곳에 모은 문서입니다.

프론트엔드 ↔ 백엔드 ↔ AI 모델 사이의 single source of truth 역할을 하고, 백엔드팀이 빠르게 endpoint를 구현/수정할 수 있도록 돕습니다.

**참조 파일 (코드):**

| 역할 | 파일 |
|---|---|
| 프론트 타입 (TypeScript) | `frontend/src/types/api.ts` (403줄) |
| 프론트 API 클라이언트 | `frontend/src/lib/api.ts` (단일 진입점) |
| 프론트 mock 응답 | `frontend/src/lib/mock/responses.ts` (501줄) |
| 백엔드 routers (FastAPI) | `backend/src/backend/api/*.py` |
| 백엔드 스키마 (Pydantic) | `backend/src/backend/schemas/*.py` |
| 백엔드 서비스 레이어 | `backend/src/backend/services/*.py` |

---

## 2. 합의 원칙 (Cross-cutting)

프론트 `types/api.ts` 헤더와 동일한 약속입니다. 백엔드/AI 구현 시 준수 부탁드립니다.

1. `riskLevel` = `"high" | "medium" | "low"` (소문자, 통일)
2. `riskScore` = 0~100 (정수, 통일) — 백엔드 내부의 0~1 float은 변환 시점에 0~100 정수로 매핑
3. 날짜/시간 = ISO 8601 문자열 (예: `2026-06-22T11:24:00Z`)
4. 에러 = `{ code: ApiErrorCode, message: string, details?: Record<string, unknown> }` 구조
5. 사용자 노출 텍스트는 한국어 (UI 매핑용 상수 `RISK_LEVEL_KO`, `SENDER_STATUS_KO` 등), 로직 enum은 영문
6. 인증이 필요한 경우 `Authorization: Bearer <token>` 헤더 (현재는 admin endpoint만 해당)
7. 정직성: 추측 가능한 데이터는 placeholder로 표시하거나 필드 자체를 제거 (mock에서 가짜 채우기 금지)

---

## 3. 프론트엔드 라우트 → API 매핑

### 3.1 Public 라우트 (실서비스 빌드 포함)

| Route | Component | 호출 API |
|---|---|---|
| `/` | `Landing` | (없음) |
| `/analyze` | `Analyzer` | `POST /api/analyze` |
| `/analyze/progress` | `AnalysisProgress` | `GET /api/jobs/{id}` (폴링, 장시간 작업용) |
| `/analyze/result/:id` | `AnalysisResult` | `POST /api/analyze` + `POST /api/reports` |
| `/senior-home` | `SeniorHome` | (없음, 라우팅만) |
| `/senior-analyze` | `SeniorAnalyzer` | `POST /api/analyze` |
| `/url` | `URLAnalyzer` | `POST /api/analyze` (type=`url`) |
| `/image` | `ImageAnalyzer` | `POST /api/ocr` → `POST /api/analyze` (type=`image`) |
| `/senior-image` | `SeniorImageAnalyzer` | `POST /api/ocr` → `POST /api/analyze` |
| `/guide` | `VulnerableGuide` | (자체 정적 콘텐츠 + 자체 퀴즈) |
| `/report` | `ReportPage` | `POST /api/reports` + `GET /api/reports/stats` |
| `/emergency` | `Emergency` | (자체 정적, 시나리오별 5단계 가이드) |

### 3.2 Admin 라우트 (DEV 빌드에서만 등록, 프로덕션 번들 제외)

| Route | Component | 호출 API |
|---|---|---|
| `/admin` | `AdminLogin` | (자체 클라이언트 가드, 백엔드 인증 없음) |
| `/compare` | `CompareAnalysis` | (자체 클라이언트 mock 분석, API 호출 없음) |
| `/dashboard` | `Dashboard` | (자체 정적 mock, "데모용 가상 데이터" 라벨 명시) |
| `/health` | `SystemHealth` | (자체 정적 + 모니터링 메트릭, "정직 처리" 라벨) |

> 어드민 라우트는 DEV 빌드에서만 router에 등록되며 `import.meta.env.DEV` 가드로 prod 번들에서 제거됩니다 (`routes.admin.tsx:51`).

---

## 4. API 엔드포인트 전체 (현황)

| # | Method | Path | Frontend 호출 | Backend 구현 | 우선순위 |
|---|---|---|---|---|---|
| 1 | POST | `/api/analyze` | 사용 중 | `/api/predict`로 구현 (path 불일치) | **P0** |
| 2 | POST | `/api/ocr` | 사용 중 | 없음 (OCR은 predict 내부 통합) | **P1** |
| 3 | GET | `/api/sender/{number}` | 사용 중 | 구현됨 (필드 충돌 — §5.3) | 충돌 |
| 4 | GET | `/api/history` | 사용 중 | 없음 | P1 |
| 5 | GET | `/api/history/{id}` | 사용 중 | 없음 | P1 |
| 6 | POST | `/api/reports` | 사용 중 | 구현됨 | OK |
| 7 | GET | `/api/reports/{receiptId}` | 사용 중 | 없음 | P1 |
| 8 | GET | `/api/reports/stats` | 사용 중 (ReportPage 명시) | 없음 | **P0** |
| 9 | POST | `/api/feedback` | 사용 중 | 없음 | P1 |
| 10 | POST | `/api/share` | 사용 중 | 없음 | P1 |
| 11 | GET | `/api/cases` | 사용 중 | 없음 | P1 |
| 12 | GET | `/api/cases/{id}` | 사용 중 | 없음 | P1 |
| 13 | GET | `/api/jobs/{jobId}` | 사용 중 | 없음 | P1 |
| 14 | GET | `/health` | 미사용 | 구현됨 | OK |

---

## 5. 스키마 상세

스키마 표기: TypeScript 인터페이스. 백엔드 구현 시 Pydantic 모델로 1:1 매핑 부탁드립니다.

### 5.1 `POST /api/analyze` — 분석 (핵심)

**Request:**

```typescript
interface AnalysisRequest {
  type: 'sms' | 'url' | 'image';
  content: string;            // SMS 텍스트, URL, 또는 image일 때 base64/data URI
  sender?: string;            // SMS에서 발신번호
  receivedAt?: string;        // ISO 8601
  imageId?: string;           // image에서 OCR 선행 시 발급된 ID
  allowTrainingUse?: boolean; // 모델 개선용 학습 데이터 활용 동의
}
```

**Response** — type별 union:

```typescript
interface AnalysisResultBase {
  id: string;
  type: AnalysisType;
  content: string;            // 원문 (image는 ocrText)
  riskLevel: 'high' | 'medium' | 'low';
  riskScore: number;          // 0~100
  smishingType: SmishingType;
  reasons: DetectionReason[];
  actionGuide: ActionGuideItem[];
  similarCases: SimilarCase[];
  damageScenario?: DamageStep[];     // high/medium일 때만
  modelVersion: string;
  processingTime?: number;
  cacheHit?: boolean;
  createdAt: string;
}

interface SmsAnalysisResult extends AnalysisResultBase {
  type: 'sms';
  senderNumber?: string;
  extractedUrl?: string;
  urlAnalysis?: UrlDetails;
}

interface UrlAnalysisResult extends AnalysisResultBase {
  type: 'url';
  urlDetails: UrlDetails;
}

interface ImageAnalysisResult extends AnalysisResultBase {
  type: 'image';
  ocrText: string;
  imageId: string;
  imageUrl?: string;
}

type AnalysisResult = SmsAnalysisResult | UrlAnalysisResult | ImageAnalysisResult;
```

**백엔드 현재 상태:** `POST /api/predict`로 구현됨 (`backend/api/predict.py:8`).
**권장:** backend path를 `/api/analyze`로 변경 또는 `/api/analyze` → `/api/predict` alias 추가. frontend가 `/api/analyze`로 호출 중이므로 미통일 시 404 발생.

---

### 5.2 `POST /api/ocr` — OCR

**Request:**

```typescript
{ image: string /* base64 또는 data URI */ }
```

**Response:**

```typescript
interface OcrResponse {
  imageId: string;
  text: string;
  confidence: number;          // 0~1
  blocks: { text: string; bbox: number[] }[];
}
```

**백엔드 현재 상태:** 없음. 현재 backend OCR은 `/api/predict` 안에서 자동 실행 후 SMS 파이프라인으로 직행 (백엔드 위키 §이미지 파이프라인).
**권장:** frontend는 OCR 결과를 별도로 받아서 사용자에게 미리 보여주고 분석 호출하는 흐름. 두 가지 옵션:
- (a) backend에 OCR endpoint 분리 추가 (`imageId` 발급 + 이후 analyze에서 `imageId`로 OCR 결과 참조)
- (b) 현재처럼 통합 처리하되, frontend는 `POST /api/analyze` 한 번만 호출 (UX 변경)

---

### 5.3 `GET /api/sender/{number}` — 발신번호 조회

**Response:**

```typescript
interface SenderLookupResult {
  number: string;
  trustScore: number;          // 0~100
  status: 'safe' | 'caution' | 'danger' | 'unknown';
  reportCount: number;
  lastReportedAt: string | null;  // ISO 8601
  categories: string[];
  history: { date: string; type: string; count: number }[];
  // 정직성: isp, region은 우리 백엔드가 알 수 있는 정보가 아님.
  // mock에서 추측해 채우면 거짓 데이터 → 필드 자체를 제거 (types/api.ts:255-257)
}
```

**백엔드 현재 상태:** 구현됨 (`backend/api/sender.py:13`). 단, 응답에 `isp: "알 수 없음"`, `region: "알 수 없음"` 필드 포함 — types의 정직성 합의와 충돌.

**권장:**
- backend 응답에서 `isp`, `region` 필드 제거
- `history`는 빈 배열이라도 형식 유지 (`{date, type, count}[]`)

---

### 5.4 `GET /api/history` — 검사 이력

**Query:** `?page=1&size=20`

**Response:**

```typescript
interface Paginated<T> {
  items: T[];
  total: number;
  page: number;                // 1-based
  pageSize: number;
  hasMore: boolean;
}

interface HistoryItem {
  id: string;
  type: AnalysisType;
  content: string;             // 미리보기 (잘린)
  riskLevel: RiskLevel;
  riskScore: number;
  smishingType: SmishingType;
  sender?: string;
  createdAt: string;
}
```

**백엔드 현재 상태:** 없음. `smishing_logs` 테이블에서 조회 필요 (백엔드 위키 §DB 구조).

---

### 5.5 `GET /api/history/{id}` — 이력 상세

**Response:** `AnalysisResult` (§5.1 참조)

---

### 5.6 `POST /api/reports` — 신고

**Request:**

```typescript
interface ReportRequest {
  type: AnalysisType;
  content: string;
  category: SmishingType;
  sender?: string;
  url?: string;
  notes?: string;
  agreeShare: boolean;
}
```

**Response:**

```typescript
interface ReportResponse {
  receiptId: string;            // 'NB20260622-001234'
  status: 'received' | 'reviewing' | 'completed';
  createdAt: string;
}
```

**백엔드 현재 상태:** 구현됨 (`backend/api/report.py:11`).

---

### 5.7 `GET /api/reports/{receiptId}` — 신고 조회

**Response:** `ReportResponse`

**용도:** 신고 접수 후 사용자가 "내 신고 상태 확인" 시.

---

### 5.8 `GET /api/reports/stats` — 신고 통계 [P0 신규]

**Response:**

```typescript
interface ReportStats {
  total: number;
  byCategory: { category: SmishingType; count: number }[];
  byStatus: { status: ReportStatus; count: number }[];
  period: { from: string; to: string };  // ISO 8601
}
```

**용도:** `ReportPage` 사이드바의 "유형별 제보 현황" 표시. 현재는 정적 mock (342/218/156/...) 사용 중.

**백엔드 현재 상태:** 없음. 추가 필요.

---

### 5.9 `POST /api/feedback` — 분석 피드백

**Request:**

```typescript
interface FeedbackRequest {
  analysisId: string;
  isCorrect: boolean;
  userComment?: string;
  correctLabel?: 'high' | 'medium' | 'low';  // 사용자가 생각하는 정답
}
```

**Response:** `{ ok: true }`

**용도:** 분석 결과 정확도 피드백 수집 → 재학습 데이터.

---

### 5.10 `POST /api/share` — 공유 링크

**Request:**

```typescript
interface ShareRequest {
  analysisId: string;
  channel: 'link' | 'kakao' | 'clipboard';
}
```

**Response:**

```typescript
interface ShareResponse {
  shareId: string;
  shortUrl: string;
  expiresAt: string;
}
```

---

### 5.11 `GET /api/cases` — 사례/교육 콘텐츠

**Query:** `?category={SmishingType}&page=1`

**Response:** `Paginated<CaseStudy>`

```typescript
interface CaseStudy {
  id: string;
  year: string;
  title: string;
  category: SmishingType;
  damage: string;
  victims: string;
  method: string;
  actualTexts: string[];
  redFlags: string[];
  prevention: string[];
  outcome: string;
  severity: 'critical' | 'high' | 'medium';
  arrested: boolean;
}
```

---

### 5.12 `GET /api/cases/{id}` — 사례 상세

**Response:** `CaseStudy`

---

### 5.13 `GET /api/jobs/{jobId}` — 비동기 작업 폴링

**Response:**

```typescript
interface AsyncJob {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;           // 0~100
  currentStep?: string;       // 'ocr' | 'vt_lookup' | 'sandbox' 등
  result?: unknown;           // 완료 시 결과 (구조는 job type별 상이)
  error?: ApiError;
}
```

**용도:** OCR·VirusTotal·샌드박스 등 시간이 오래 걸리는 작업의 진행률 폴링.

---

## 6. 표준 에러 응답

```typescript
type ApiErrorCode =
  | 'INVALID_INPUT'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'RATE_LIMIT'
  | 'MODEL_TIMEOUT'
  | 'OCR_FAILED'
  | 'SANDBOX_FAILED'
  | 'VIRUSTOTAL_FAILED'
  | 'INTERNAL';

interface ApiError {
  code: ApiErrorCode;
  message: string;
  details?: Record<string, unknown>;
}
```

선택적 응답 래퍼 사용 가능 (`api.ts:104-118`):

```typescript
interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: ApiError;
}
```

래퍼가 있으면 frontend가 `data.data` 자동 unwrap, 없으면 본문 그대로 사용. 백엔드팀 합의 부탁드립니다.

---

## 7. 우선순위 및 작업 권장

### P0 — 시연 안정성 + 즉시 합의

| 항목 | 이유 | 작업 위치 |
|---|---|---|
| `/api/predict` → `/api/analyze` path 통일 | frontend가 `/api/analyze` 호출 중, 미통일 시 404 | backend `api/predict.py` |
| sender 응답 `isp`/`region` 제거 | types와 정직성 합의 위배 | backend `api/sender.py:43,55` |
| `/api/reports/stats` 추가 | ReportPage 명시 요구 (사이드바 통계) | backend `api/report.py` + `schemas/report_api.py` + `services/report_service.py` |

### P1 — 백엔드 누락 endpoint (현재 frontend mock이 커버 중)

| Endpoint | frontend 사용처 |
|---|---|
| `POST /api/ocr` | ImageAnalyzer, SeniorImageAnalyzer |
| `GET /api/history`, `GET /api/history/{id}` | 검사 이력 페이지 |
| `GET /api/reports/{receiptId}` | 신고 접수 확인 |
| `POST /api/feedback` | 분석 결과 피드백 |
| `POST /api/share` | 공유 버튼 |
| `GET /api/cases`, `GET /api/cases/{id}` | 사례/교육 페이지 |
| `GET /api/jobs/{jobId}` | 분석 진행률 |

### P2 — 스키마 1:1 매핑 + 어드민 페이지

- `types/api.ts` ↔ `schemas/*.py` TypeScript ↔ Pydantic 1:1 변환 표
- 어드민 모니터링 endpoint (`/api/admin/metrics`, `/api/admin/health`) — SystemHealth/Dashboard 실 데이터 연동 시
- 어드민 페이지(/dashboard, /compare, /health)는 현재 자체 mock + 정직 라벨 → 우선순위 낮음

---

## 8. 현재 작동 상태 (2026-06-22 11:35)

| 서비스 | 상태 | 비고 |
|---|---|---|
| Frontend dev 서버 | 실행 중 | `localhost:5173` (Vite) |
| Frontend API 호출 | mock 응답 중 | `VITE_USE_MOCK=true` (`.env` 기본값) |
| Backend (FastAPI) | 미실행 | `localhost:8000` connection refused |
| 발표 시연 | 정상 동작 | mock이 안정적, HF 콜드스타트 없음 |

**백엔드 띄우는 법:**

```bash
cd "/Users/aku/Downloads/심화 프로젝트 웹사이트"
cp .env.example backend/.env  # backend/.env에 MySQL 4개 값 입력
docker compose -f docker-compose.dev.yml up -d --build
curl http://localhost:8000/health
# → {"status":"ok"}
```

**Frontend에서 실제 backend 호출하도록 전환:**

```bash
# frontend/.env 수정
VITE_USE_MOCK=false
VITE_API_BASE_URL=http://localhost:8000
```

---

## 9. 협의 invitation

백엔드팀·AI팀 검토 후 다음 항목에 코멘트 부탁드립니다. 합의 후 한 번에 정리되면 PR 하나로 머지 가능합니다.

1. **`/api/predict` vs `/api/analyze` path** — frontend는 `/api/analyze` 사용 중. backend path 변경 또는 alias 추가 의견?
2. **OCR 분리 vs 통합** — frontend는 OCR 결과 별도 호출 흐름. 통합 유지할지 분리 endpoint 만들지?
3. **sender `isp`/`region` 정직 처리** — 필드 제거 / "알 수 없음" placeholder 유지 / 외부 API (KISA 등) 연동 중 어느 방향?
4. **P0/P1 우선순위** — 발표 일정에 맞춰 어느 것까지 백엔드팀이 우선 구현 가능한지?
5. **누락 endpoint 중 미사용 처리** — frontend에서 현재 안 쓰면 제거 검토 가능 (예: `/api/share`는 UI 노출 없음)
6. **에러 응답 래퍼 형식** — `ApiResponse<T>` 래퍼 사용 or 본문 그대로?

이견 있으시면 코멘트 부탁드립니다. 권장 사항이지만 합의 시 변경 가능 — 중요한 건 함께 정렬되는 것.