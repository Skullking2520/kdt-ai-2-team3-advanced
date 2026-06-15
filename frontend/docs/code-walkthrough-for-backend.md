# 프론트엔드 코드 워크스루 — 백엔드용

> 백엔드 담당자가 **우리 프론트 코드를 어떻게 읽는지** 안내.
> React/Vite 몰라도 **"어떤 함수가 백엔드랑 통신하는지"** 알면 됨.

---

## 📁 백엔드가 봐야 할 파일 (딱 3개)

```
frontend/
├── src/types/api.ts           ← ⭐ API 명세 (TypeScript 타입 20개 섹션)
├── src/lib/api.ts             ← API 클라이언트 (백엔드 호출하는 함수 13개)
└── src/lib/mock/responses.ts  ← Mock 응답 (백엔드가 만들어야 할 응답 모양 그대로)
```

**나머지 다 무시 가능.** 44개 컴포넌트는 UI 그리기용, 백엔드랑 무관.

---

## 1. `src/types/api.ts` — 백엔드가 가져야 할 "응답 모양"

> 이 파일이 **API 명세의 진짜 본체**. OpenAPI보다 정확함.

### 어떻게 읽나

TypeScript를 모르면 이렇게 읽어:

```ts
// "AnalysisRequest 라는 타입 = 백엔드로 보내는 요청"
export interface AnalysisRequest {
  type: 'sms' | 'url' | 'image';   // 문자열, 셋 중 하나
  content: string;                 // 문자열
  sender?: string;                 // 선택적 문자열
  ...
}
```

→ JSON으로 바꾸면:
```json
{
  "type": "sms",
  "content": "...",
  "sender": "010-1234-5678"
}
```

`?` 붙은 필드 = 있어도 되고 없어도 됨. `|`로 구분된 것 = enum (정해진 값만).

### 엔드포인트별 타입 위치

| 엔드포인트 | Request 타입 | Response 타입 |
|---|---|---|
| `POST /api/analyze` | `AnalysisRequest` | `AnalysisResult` (Union: `SmsAnalysisResult` / `UrlAnalysisResult` / `ImageAnalysisResult`) |
| `POST /api/ocr` | `{ image: string }` | `OcrResponse` |
| `GET /api/sender/:number` | - | `SenderLookupResult` |
| `GET /api/history` | - | `Paginated<HistoryItem>` |
| `POST /api/reports` | `ReportRequest` | `ReportResponse` |
| `POST /api/feedback` | `FeedbackRequest` | `{ ok: true }` |
| `POST /api/share` | `ShareRequest` | `ShareResponse` |
| `GET /api/cases` | - | `Paginated<CaseStudy>` |

**P0 우선**: 상위 6개.

---

## 2. `src/lib/api.ts` — 프론트가 백엔드 호출하는 코드

이 파일을 읽으면 **"프론트가 백엔드한테 뭐라고 물어보는지"** 정확히 알 수 있음.

### 핵심 함수 13개 (전부 한 페이지)

```ts
// SMS/URL/Image 통합 분석
analyze: (req: AnalysisRequest) =>
  request<AnalysisResult>('/api/analyze', { method: 'POST', body: req }),

// OCR (이미지에서 텍스트 추출)
ocr: (image: string) =>
  request<OcrResponse>('/api/ocr', { method: 'POST', body: { image } }),

// 발신번호 조회
lookupSender: (number: string) =>
  request<SenderLookupResult>(`/api/sender/${encodeURIComponent(number)}`),

// 이력 조회
getHistory: (page = 1, size = 20) =>
  request<Paginated<HistoryItem>>(`/api/history?page=${page}&size=${size}`),

// 이력 단건 조회
getHistoryItem: (id: string) =>
  request<AnalysisResult>(`/api/history/${encodeURIComponent(id)}`),

// 신고
submitReport: (req: ReportRequest) =>
  request<ReportResponse>('/api/reports', { method: 'POST', body: req }),

// 피드백
submitFeedback: (req: FeedbackRequest) =>
  request<{ ok: true }>('/api/feedback', { method: 'POST', body: req }),

// ... 외 6개
```

### 백엔드 입장에서 해석

- **`request<ResType>(url, options)`** = `fetch(url, options)` 래퍼
- POST body는 JSON
- 응답은 `ResType` 모양으로 옴 (TypeScript가 검증)
- `ApiException` 던지면 에러 (`{code, message, details?}`)

### base URL

- `VITE_API_BASE_URL` 환경변수 (기본 `http://localhost:8000`)
- 백엔드 dev 서버 띄우면 프론트가 자동으로 그쪽으로 요청 보냄

---

## 3. `src/lib/mock/responses.ts` — 백엔드가 만들어야 할 응답의 "그림"

> 이 파일 안 보면 응답 모양 헷갈림. **실제 Mock 응답을 그대로 보면 됨.**

### 가장 중요한 응답: SMS 분석 high 위험

`mockHandle.register('POST', '/api/analyze', ...)` 함수 안에서:
```ts
function buildSmsResult(req) {
  // ... 분석 로직 ...
  return {
    id: `anl_${Date.now()}`,
    type: 'sms',
    content: req.content,
    riskLevel: 'high',           // ← 백엔드가 이걸 계산해야 함
    riskScore: 88,               // ← 0~100 정수
    smishingType: '공공기관 사칭', // ← 한국어
    reasons: [
      { code: 'impersonation', label: '...', severity: 'high', matched: true },
      ...
    ],
    actionGuide: [
      { priority: 'critical', action: '링크를 절대 클릭하지 마세요' },
      ...
    ],
    similarCases: [...],
    governmentCriteria: [...],
    damageScenario: [...],
    modelVersion: 'kc-electra-v1.2.3',
    processingTime: 1240,
    cacheHit: false,
    createdAt: '2026-06-05T...',
  };
}
```

→ **백엔드는 이 함수를 FastAPI endpoint로 옮기면 됨.** 로직은 동일, 반환만 JSON으로.

### Mock 라우트 목록 (백엔드 우선순위)

```ts
mockHandle.register('POST', '/api/analyze', ...);          // P0
mockHandle.register('POST', '/api/ocr', ...);              // P0
mockHandle.register('GET',  '/api/sender/:number', ...);   // P0
mockHandle.register('GET',  '/api/history', ...);          // P0
mockHandle.register('POST', '/api/reports', ...);          // P0
mockHandle.register('POST', '/api/feedback', ...);         // P0
mockHandle.register('POST', '/api/share', ...);            // P1
mockHandle.register('GET',  '/api/cases', ...);            // P1
mockHandle.register('GET',  '/api/cases/:id', ...);        // P1
mockHandle.register('GET',  '/api/jobs/:jobId', ...);       // P1
```

---

## 4. 사용자 클릭 → 백엔드 호출 전체 흐름

```
[사용자] SMS 입력 + "검사" 클릭
   ↓
[Analyzer.tsx] handleAnalyze()
   ↓ await api.analyze({ type: 'sms', content: '...' })
[src/lib/api.ts] request<AnalysisResult>('/api/analyze', POST)
   ↓ fetch('http://localhost:8000/api/analyze', { body: JSON.stringify(...) })
[백엔드 FastAPI] @app.post('/api/analyze') 라우터
   ↓
[AI 모델] kc-electra / KoBERT 추론
   ↓
[백엔드] AnalysisResult JSON 응답
   ↓
[src/lib/api.ts] JSON 파싱 → AnalysisResult
   ↓
[Analyzer.tsx] setResult(analysisResult)
   ↓
[화면] 7-카드 결과 표시 (위험도/근거/사례/대응 등)
```

**백엔드 담당자 위치**: `FastAPI` ↔ `AI 모델` 사이.
**프론트는 신경 안 씀**: FastAPI → AI 호출은 백엔드 자유.

---

## 5. 자주 헷갈리는 점

### Q: `riskLevel` 대문자로 줘도 돼?
**A: 소문자 강력 권장.** (`'high' | 'medium' | 'low'`) — TypeScript의 `RiskLevel` enum이 이 값 그대로 매칭됨. 대문자 보내면 `tsc` 가 잡아내긴 하지만 일관성 위해 통일하는 게 깔끔.

### Q: `riskScore`를 0~10으로 줘도 돼?
**A: 0~100 정수가 깔끔.** AI 모델 출력이 보통 0~1 확률이라 100 곱하면 끝. 0~10은 프론트에서 임계값 비교할 때 소수점 생길 수 있음.

### Q: snake_case로 줘도 돼?
**A: ⚠️ 가능. 어댑터 한 줄 매핑. camelCase가 더 간단하니 camelCase 권장.**

### Q: 응답에 필드 하나 빠뜨리면?
**A: 프론트가 `undefined` 받아서 화면 깨짐. `tsc` 가 미리 잡아주기도 함.**

### Q: 한국어 값은 그대로 줘도 돼?
**A: `smishingType` 만 한국어. enum (`riskLevel`, `severity`, `priority` 등) 은 영문.**

### Q: CORS?
**A: 백엔드에서 `localhost:5173` 허용 필수.** ([backend-onboarding.md](./backend-onboarding.md) §3 참고)

### Q: 인증은?
**A: v1 없음.** 나중에 JWT 추가하면 됨.

---

## 6. 백엔드 작업 순서 (추천)

1. `src/types/api.ts` 정독 (30분)
2. `src/lib/mock/responses.ts` 의 `buildSmsResult()` 읽기 (15분)
3. FastAPI에서 `POST /api/analyze` 만 먼저 구현
4. 프론트 `.env` 에서 `VITE_USE_MOCK=false` + `VITE_API_BASE_URL=http://localhost:8000` 설정
5. **프론트에서 SMS 검사 → 진짜 백엔드 응답 오는지 확인** ← 이게 진짜 테스트
6. 통과하면 나머지 endpoint 순차 구현

**작은 거 하나만 먼저 끝내고 통합 테스트.** 큰 그림부터 만들지 말고.

---

## 7. 통합 테스트 체크리스트

프론트 입장에서 확인할 수 있는 거:

- [ ] 브라우저에서 문자 검사 → 결과가 백엔드에서 옴 (Mock 아님)
- [ ] 위험도/점수/근거가 화면에 잘 표시됨
- [ ] 콘솔에 CORS 에러 없음
- [ ] 콘솔에 404/500 에러 없음
- [ ] 응답 시간 5초 이내

**DevTools Network 탭** 켜고:
- `POST /api/analyze` 호출 보임
- Status 200
- Response JSON의 `riskLevel`, `riskScore`, `reasons` 등 다 들어있음

→ 이거 다 통과하면 통합 완료. 🎉
