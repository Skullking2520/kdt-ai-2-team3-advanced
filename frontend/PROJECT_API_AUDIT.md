# API Audit

> 작성일: 2026-06-09
> 대상: `/Users/aku/Downloads/심화 프로젝트 웹사이트/frontend`
> 목표: 실서비스 수준 백엔드 연결 준비 상태 검증

---

## 완료된 항목

### 1. API Contract v1.0 (types/api.ts, 371줄, 20개 섹션)

| 섹션 | 상태 | 비고 |
|------|------|------|
| 1. 공통 Enum/상수 | 완료 | `RiskLevel`, `AnalysisType`, `SenderStatus`, `ReportStatus`, `ActionPriority`, `DamageIcon` + 한국어 매핑 객체 |
| 2. 분석 입력 (`AnalysisRequest`) | 완료 | `type` + `content` + `sender?` + `receivedAt?` + `imageId?` |
| 3. 분석 응답 (Union) | 완료 | `SmsAnalysisResult \| UrlAnalysisResult \| ImageAnalysisResult` |
| 4. URL 상세 (`UrlDetails`) | 완료 | SSL, domainAge, redirects, ipCountry, similarDomains, flags |
| 5. OCR 응답 (`OcrResponse`) | 완료 | `imageId`, `text`, `confidence`, `blocks` |
| 6. 스미싱 유형 (SmishingType) | 완료 | 7가지 한국어 enum + '정상 문자' |
| 7. 탐지 근거 (DetectionReason) | 완료 | code/label/severity/matched |
| 8. 유사 사례 (SimilarCase) | 완료 | RAG 결과 0~100 similarity |
| 9. 정부기관 기준 (GovernmentCriterion) | 완료 | id/label/matched |
| 10. 피해 시나리오 (DamageStep) | 완료 | step/icon/title/description, high/medium일 때만 |
| 11. 대응 가이드 (ActionGuideItem) | 완료 | priority/action/detail/contact |
| 12. 발신번호 조회 (SenderLookupResult) | 완료 | trustScore/status/reportCount/history/isp/region |
| 13. 검사 이력 (HistoryItem + Paginated) | 완료 | 1-based page, hasMore |
| 14. 신고 (ReportRequest/Response) | 완료 | receiptId format `NB20260605-001234` |
| 15. 피드백 (FeedbackRequest) | 완료 | analysisId + isCorrect + correctLabel? |
| 16. 공유 (ShareRequest/Response) | 완료 | link/kakao/clipboard channel |
| 17. 비동기 작업 (AsyncJob) | 완료 | queued/processing/completed/failed + progress + currentStep |
| 18. 사례/교육 (CaseStudy + QuizQuestion) | 완료 | 11개 필드 + severity + arrested |
| 19. 표준 에러 (ApiError + ApiErrorCode) | 완료 | 10개 enum |
| 20. 공통 응답 래퍼 (ApiResponse) | 완료 | ok/data/error 패턴 |

### 2. API Client (lib/api.ts, 182줄, 12개 엔드포인트)

- Mock 토글: `VITE_USE_MOCK=true` → `mockHandle.invoke` / `false` → `fetch`
- 일관된 에러 처리: `ApiException` (code/message/details)
- 자동 타임아웃 (AbortController, `env.API_TIMEOUT`)
- `ApiResponse<T>` 래퍼 자동 unwrap (백엔드가 `{ok, data, error}` 반환 시)
- 엔드포인트 12개: `analyze`, `ocr`, `lookupSender`, `getHistory`, `getHistoryItem`, `submitReport`, `getReport`, `submitFeedback`, `share`, `getCases`, `getCase`, `getJob`

### 3. Mock 응답 (lib/mock/responses.ts, 519줄, 13개 라우트)

- `MockRouter` 클래스 (path + method 키)
- 패턴 기반 SMS 분석 (`buildSmsResult`): 가족사칭/공공기관/개인정보/긴급성 4가지 케이스
- URL 분석 (`buildUrlResult`): 의심 패턴 정규식 매칭
- Image 분석 (`buildImageResult`): OCR 결과를 SMS로 재분석
- 발신번호 3개 하드코딩 (`010-8821-3947`, `010-3392-1847`, `1588-1234`)
- 이력 6개 / 사례 3개 (실제 사건 기반)
- 비동기 작업 1개 (`/api/jobs/job_demo_001`)

### 4. 라우트 분리 (routes.public.tsx + routes.admin.tsx)

- `publicRoutes`: 19개 사용자 페이지 (Landing, Analyzer, EasyCheck, Emergency 등)
- `adminRoutes`: `import.meta.env.DEV` 가드 → 프로덕션 빌드 시 bundle 제외
- `routes.tsx`: 두 라우트 합치고 `*` catch-all (NotFound)

### 5. 환경변수 타입화 (lib/env.ts)

- `USE_MOCK` / `API_BASE_URL` / `API_TIMEOUT` / `MOCK_DELAY_MS` / `DEBUG`
- 모두 `import.meta.env.VITE_*`에서 안전 변환 (`bool` / `str` / `num`)

---

## 문제점

### 🔴 CRITICAL — 분석 API 미연결 (3개 핵심 페이지)

| 페이지 | 현재 동작 | 문제 |
|--------|-----------|------|
| `Analyzer.tsx` | `analyzeSms(textInput)` (로컬 함수) | `api.analyze()` 안 부름, 백엔드 결과 무시됨 |
| `SeniorAnalyzer.tsx` | `analyzeSms(textInput)` (로컬 함수) | 위와 동일 |
| `AnalysisResult.tsx` | URL `?text=...` 받아서 `analyzeSms(text)` (로컬 함수) | URL에 결과 ID만 있어도 로컬 재분석 |

→ **백엔드 모델이 무시되고 클라이언트 규칙 기반 분석만 동작**. 백엔드 합의가 무의미해짐.

### 🔴 CRITICAL — OCR API 미연결

- `ImageAnalyzer.tsx`의 `handleOcr()`:
  - `setInterval` + `setTimeout`으로 5단계 시뮬레이션
  - 5% 확률로 랜덤 실패 (`Math.random() < 0.05`)
  - `MOCK_OCR_RESULTS` 하드코딩 배열에서 픽
  - `api.ocr(image)` 호출 없음
- → **백엔드 OCR/Computer Vision 미연동, 시뮬레이션만 동작**

### 🔴 CRITICAL — 발신번호 조회 API 미연결

- `SenderLookup.tsx`:
  - `KNOWN` 객체에 5개 번호 하드코딩
  - `mockLookup(target)` 자체 함수
  - `setTimeout(800ms)` 시뮬레이션
  - `api.lookupSender()` 호출 없음
- → **백엔드 발신번호 DB 미연결**

### 🟠 HIGH — 사례 조회 API 미연결

- `CaseStudies.tsx`:
  - `OFFICIAL_ALERTS` 자체 상수 (외부에서 import)
  - `setTimeout(800ms)` 시뮬레이션
  - `api.getCases()` 호출 없음
- → **백엔드 사례 DB 미연결** (정적 데이터만)

### 🟠 HIGH — AnalysisProgress 흐름 미흡

- `AnalysisProgress.tsx`:
  - 4단계 로컬 시뮬레이션 (입력확인/분석/RAG/결과)
  - `STEPS` 배열의 `duration` 합만큼 대기 후 결과 페이지로 navigate
  - 진짜 진행률 추적 없음 (50ms 간격 progress bar만)
- → **백엔드 비동기 작업 흐름과 무관** (AsyncJob/jobId 기반 폴링 안 함)

### 🟡 MEDIUM — Dead Code

- `URLAnalyzer.tsx`의 `_analyzeURL(raw: string): URLResult` (44번 줄)
  - 정의만 있고 호출 0건
  - `analyzeUrl()`이 `api.analyze()` 사용
  - 파일 약 50줄 dead code

### 🟡 MEDIUM — 컴포넌트 내부 타입 충돌 (Backend 호환 시 수정 필요)

- `AnalysisResult.tsx`의 `setResult({...})` 결과는 컴포넌트 내부 `AnalysisResult` (snake_case) 모양:
  - `risk_level`, `risk_score`, `smishing_type`, `reasons`, `action_guide`, `similar_cases`, `has_url`, `has_impersonation`, `has_payment_request`, `has_personal_info_request`
- 백엔드/타입은 camelCase (`riskLevel`, `riskScore`, `smishingType`, `actionGuide`, `similarCases`)
- → `analyzeSms()`가 snake_case 반환, `toLegacyRiskLevel()` 어댑터 사용
- → 백엔드 응답을 받으면 이 어댑터는 무의미해짐

### 🟡 MEDIUM — SenderLookup 내부 타입이 백엔드와 다름

- `SenderResult.status`: `"안전" | "주의" | "위험" | "알 수 없음"` (한국어)
- `SenderLookupResult.status` (API): `"safe" | "caution" | "danger" | "unknown"` (영문 enum)
- → 백엔드 결과 받으면 매핑 필요

---

## 타입 불일치

| 위치 | 컴포넌트 내부 타입 | API 타입 | 차이 |
|------|-------------------|----------|------|
| `AnalysisResult.tsx` | `risk_level`, `risk_score`, `smishing_type`, `action_guide`, `similar_cases`, `has_url`, `has_impersonation`, `has_payment_request`, `has_personal_info_request` | `riskLevel`, `riskScore`, `smishingType`, `actionGuide`, `similarCases` (없음: `has_url` 등) | snake_case + 추가 필드 (`has_*`) |
| `SenderLookup.tsx` | `SenderResult.status: "안전"\|"주의"\|"위험"\|"알 수 없음"` | `SenderLookupResult.status: "safe"\|"caution"\|"danger"\|"unknown"` | 한국어 vs 영문 enum |
| `SenderLookup.tsx` | `lastSeen: string` | `lastReportedAt: string \| null` | 필드명 다름 + null 허용 |
| `SenderLookup.tsx` | `categories: string[]` (예: ["금융 피싱"]) | `categories: string[]` (예: ["공공기관 사칭", "보험 피싱"]) | 동일 형태 |

→ 마이그레이션 시 어댑터 또는 컴포넌트 내부 타입 통일이 필요.

---

## Mock 불일치

### ✅ Mock 라우트 등록 (총 13개, API Contract와 일치)

| 엔드포인트 | Mock | 타입 일치 |
|-----------|------|-----------|
| `POST /api/analyze` (sms/url/image) | ✅ | ✅ `satisfies SmsAnalysisResult` / `UrlAnalysisResult` / `ImageAnalysisResult` |
| `POST /api/ocr` | ✅ | ✅ `satisfies OcrResponse` |
| `GET /api/sender/{number}` (3개 하드코딩) | ⚠️ | ✅ 타입은 맞지만 **3개만** 등록 |
| `GET /api/history` + `/api/history/{id}` (3개) | ⚠️ | ✅ `Paginated<HistoryItem>` 일치 |
| `POST /api/reports` | ✅ | ✅ `ReportResponse` |
| `GET /api/reports/{id}` (1개) | ⚠️ | ✅ |
| `POST /api/feedback` | ✅ | ✅ `{ ok: true }` |
| `POST /api/share` | ✅ | ✅ `ShareResponse` |
| `GET /api/cases` + `/api/cases/{id}` (3개) | ⚠️ | ✅ `Paginated<CaseStudy>` |
| `GET /api/jobs/{jobId}` (1개) | ⚠️ | ✅ `AsyncJob` |

### ⚠️ Mock에서 빠진 케이스

- 발신번호: `010-5571-2938` (SenderLookup.tsx의 SAMPLES에 있음) → Mock에 없음
- 이력 ID: `h2`, `h5`, `h6` → Mock에 없음
- 사례 ID: c4+ → Mock에 없음
- 작업 ID: `job_demo_001` 외 → 없음

→ 클라이언트가 `api.lookupSender('010-5571-2938')` 호출 시 Mock router가 `Mock route not found` 던짐.

### ✅ Mock 응답은 백엔드 응답 모양과 일치

- `buildSmsResult`는 `AnalysisResultBase` + `SmsAnalysisResult` 필드 정확히 채움
- `OcrResponse.blocks: []` (빈 배열, 실제 OCR은 blocks 포함해야 함)
- `processingTime`, `cacheHit`, `createdAt`, `modelVersion` 모두 채워짐

---

## 백엔드 연동 전 필수 수정

### 1. 분석 API 연결 (3개 페이지)

- **Analyzer.tsx** (line 168): `analyzeSms(textInput)` → `await api.analyze({ type: 'sms', content: textInput, sender })`
- **SeniorAnalyzer.tsx** (line 48, 69): 동일 패턴
- **AnalysisResult.tsx** (line 38~53): URL `?text=`로 받은 텍스트를 `analyzeSms()`로 재분석하는 부분 → `api.analyze()`로 교체

### 2. OCR API 연결

- **ImageAnalyzer.tsx** (`handleOcr`, line 59~85):
  - 5단계 setInterval/setTimeout 시뮬레이션 제거
  - `await api.ocr(base64Image)` 호출
  - 응답의 `text`를 `setOcrText`
  - `confidence < 0.6`이면 신뢰도 낮음 경고 (선택)
  - 에러 시 `setOcrError(true)`

### 3. 발신번호 API 연결

- **SenderLookup.tsx** (`handleSearch`, line 73~87):
  - `setTimeout + mockLookup` 제거
  - `await api.lookupSender(target)`
  - 컴포넌트 내부 `SenderResult` ↔ `SenderLookupResult` 매핑 어댑터
  - 한국어 status → 영문 enum 매핑, `lastReportedAt` → `lastSeen`

### 4. 사례 조회 API 연결

- **CaseStudies.tsx** (`handleRefresh`, line 213~217):
  - `setTimeout + OFFICIAL_ALERTS` 재할당 제거
  - `await api.getCases()`
  - `OfficialAlert` ↔ `CaseStudy` 매핑 (필드 다름 — 정적 데이터가 `year`/`title`만 있고 `CaseStudy`는 11개 필드)

### 5. URL 분석 결과 어댑터 통합

- **URLAnalyzer.tsx**: `adaptUrlResult()`는 이미 잘 만들어져 있어 재사용 가능
- `_analyzeURL` dead code 정리 (옵션, 자동 수정 금지 룰로 보류)

### 6. 비동기 작업 흐름 정의

- **AnalysisProgress.tsx**:
  - 현재: 로컬 단계 시뮬레이션
  - 목표: `POST /api/analyze` → `jobId` 반환 → `GET /api/jobs/{jobId}` 폴링 → progress 표시
  - **자세한 설계는 별도 섹션 "AsyncJob 구조 점검" 참조**

---

## 권장 개선사항

### 🟢 LOW

- **컴포넌트 내부 타입 통일**: `SenderResult`의 `status`를 영문 enum으로 변경하고 매핑 테이블 사용 (또는 그 반대 — 한국어 노출 시 매핑)
- **`AnalysisResult.tsx` 결과 페이지가 URL에 텍스트를 실어 나르는 패턴**: 보안·URL 길이 측면에서 비추천. 결과 ID만 가지고 결과 페이지에서 `api.getHistoryItem(id)` 호출이 바람직
- **History 페이지 fallback 주석**: 코드에 "API items가 0건이면 mock fallback"이라고 적혀있는데, 이 로직이 실제로 동작하는지 확인 필요 (현재 라우터는 6개 항목 항상 반환)
- **라우트 정리**: `routes.tsx`에서 admin이 DEV일 때만 등록되지만, `import.meta.env.DEV` 가드가 `routes.admin.tsx` 안에 있을 가능성 → 확인 필요 (실제로는 routes.tsx에 그대로 import 되어 있어 dead code elimination에 의존)

### 🟢 마이그레이션 안전장치

- **점진적 전환**: `VITE_USE_MOCK=true`에서 시작 → `false`로 토글 → 페이지별로 API 호출 부분만 교체
- **타입 안전성**: `api.ts`의 `request<T>`가 응답 unwrap을 자동 처리. 백엔드가 `{ok, data, error}` 형태를 반환하지 않으면 unwrap 로직이 자동으로 무시됨
- **에러 UI**: `ErrorState` (5 type: network/timeout/server/unknown/ocr) 이미 존재 → `ApiException.code`별 분기만 추가하면 됨

---

## 단계 판단

> "프론트 목업 단계 / 백엔드 연결 준비 단계 / 실서비스 MVP 단계" 중 어디인가?

### 결론: **백엔드 연결 준비 단계 (준비 중)**

| 평가 항목 | 점수 | 코멘트 |
|-----------|------|--------|
| API Contract 정의 | ★★★★★ | 20개 섹션, 371줄, 매우 완성도 높음 |
| API Client 구현 | ★★★★★ | 12개 엔드포인트, Mock 토글, 에러/타임아웃 처리 완료 |
| Mock 응답 | ★★★★★ | 13개 라우트, 백엔드 응답 모양과 일치 |
| 환경변수/설정 | ★★★★★ | `.env.example` + `env.ts` 타입화 |
| 라우트 분리 | ★★★★☆ | public/admin 분리, DEV 가드 |
| **실제 페이지 API 연결** | **★★☆☆☆** | **6개 중 4개 페이지가 로컬 함수/setTimeout 사용** |
| **OCR 연결** | **☆☆☆☆☆** | **시뮬레이션만** |
| **발신번호/사례 연결** | **☆☆☆☆☆** | **자체 mock 데이터** |
| AsyncJob 흐름 | ★★☆☆☆ | 클라이언트 시뮬레이션만, 실제 폴링 없음 |

### 이유

- **프론트 목업 단계 아님**: API Contract + Client + Mock 모두 완성, 단순한 "그림만 있는" 단계가 아님
- **실서비스 MVP 단계 아님**: 핵심 3개 페이지(Analyzer, SeniorAnalyzer, AnalysisResult)가 로컬 분석 사용, OCR·발신번호·사례 페이지 모두 자체 mock 데이터. **백엔드 모델을 사용하지 않음**
- **백엔드 연결 준비 단계**: 인프라는 다 갖춰져 있고, **남은 건 페이지 단위의 호출 교체 + Mock → 실 API 토글**만. 합의된 API Contract가 있고 Mock이 그 모양과 일치하므로, 백엔드 응답이 도착하면 `VITE_USE_MOCK=false` 한 줄 변경 + 페이지별 `await api.xxx()` 호출 추가로 전환 가능

### 다음 단계 (우선순위)

1. **Analyzer / SeniorAnalyzer / AnalysisResult** 의 `analyzeSms()` → `api.analyze()` 교체 (Mock 모드에서 동일 동작 확인)
2. **ImageAnalyzer** `handleOcr()` → `api.ocr()` 교체
3. **SenderLookup** `mockLookup` → `api.lookupSender()` 교체 + 어댑터
4. **CaseStudies** `OFFICIAL_ALERTS` → `api.getCases()` 교체
5. **AsyncJob 흐름 설계** (별도 보고서)
6. **Mock → 실 API 토글 테스트** (`VITE_USE_MOCK=false`, `VITE_API_BASE_URL=http://localhost:8000`)
7. **E2E**: SMS/URL/Image 각각 분석 → 결과 페이지 → 신고 → 이력 → 사례 전체 흐름

---
