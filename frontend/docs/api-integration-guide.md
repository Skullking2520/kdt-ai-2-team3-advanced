# 📡 NewBiz Shield API 통합 가이드

> **백엔드/AI 담당자분께 보내는 문서입니다.**
> 작성일: 2026-06-05 / 작성자: 프론트엔드 (Mavis 협업)
> 합의 후 본 문서는 백엔드 저장소로 이동합니다.

---

## 🎯 합의 핵심 (3줄 요약)

1. **위험도**: `"high" | "medium" | "low"` (소문자 enum)
2. **점수**: `0~100` 정수 (`riskLevel`과 별개로 둘 다 응답)
3. **날짜**: ISO 8601 (`2026-06-05T17:32:00+09:00`)

---

## 📁 참고 파일

| 파일 | 용도 |
|---|---|
| `src/types/api.ts` | **TypeScript 타입 = API 명세 본체** (20개 섹션, 371줄) |
| `src/lib/api.ts` | 프론트 API 클라이언트 (axios 대용 fetch 래퍼) |
| `src/lib/mock/responses.ts` | Mock 응답 데이터 (백엔드 응답과 동일 모양) |
| `src/lib/env.ts` | 환경변수 (VITE_USE_MOCK 토글) |

---

## 🔌 엔드포인트 목록 (우선순위순)

### 🔴 P0 — 발표 데모 핵심 (오늘 합의 필요)

| 메서드 | 경로 | Request | Response |
|---|---|---|---|
| `POST` | `/api/analyze` | `AnalysisRequest` | `AnalysisResult` (SMS/URL/Image Union) |
| `POST` | `/api/ocr` | `{ image: string }` | `OcrResponse` |
| `GET` | `/api/sender/:number` | - | `SenderLookupResult` |
| `GET` | `/api/history?page=N&size=20` | - | `Paginated<HistoryItem>` |
| `POST` | `/api/reports` | `ReportRequest` | `ReportResponse` |
| `POST` | `/api/feedback` | `FeedbackRequest` | `{ ok: true }` |

### 🟡 P1 — 발표 이후

| 메서드 | 경로 | Request | Response |
|---|---|---|---|
| `GET` | `/api/history/:id` | - | `AnalysisResult` |
| `GET` | `/api/reports/:receiptId` | - | `ReportResponse` |
| `POST` | `/api/share` | `ShareRequest` | `ShareResponse` |
| `GET` | `/api/cases?category=&page=` | - | `Paginated<CaseStudy>` |
| `GET` | `/api/cases/:id` | - | `CaseStudy` |
| `GET` | `/api/jobs/:jobId` | - | `AsyncJob` (비동기 폴링용) |

---

## 📄 응답 예시 (SMS 분석 — high 위험)

```json
{
  "id": "anl_20260605_abc123",
  "type": "sms",
  "content": "【국민건강보험】미납보험료 89,200원...",
  "riskLevel": "high",
  "riskScore": 88,
  "smishingType": "공공기관 사칭",
  "reasons": [
    { "code": "impersonation", "label": "국민건강보험을 사칭", "severity": "high", "matched": true },
    { "code": "suspicious_url", "label": "의심스러운 URL 포함", "severity": "high", "matched": true }
  ],
  "actionGuide": [
    { "priority": "critical", "action": "링크를 절대 클릭하지 마세요" }
  ],
  "similarCases": [
    { "id": "case_001", "title": "건강보험 미납 통지 위장", "similarity": 87, "year": "2024", "category": "공공기관 사칭" }
  ],
  "governmentCriteria": [
    { "id": "url_included", "label": "의심 URL 포함", "matched": true }
  ],
  "damageScenario": [
    { "step": 1, "icon": "message", "title": "문자 수신", "description": "..." }
  ],
  "extractedUrl": "http://nhis-pay.kr/login",
  "urlAnalysis": {
    "domain": "nhis-pay.kr",
    "ssl": { "valid": false, "issuer": "Unknown", "expiry": "만료됨" },
    "domainAge": 12,
    "redirects": [],
    "ipCountry": "CN",
    "similarDomains": ["nhis.or.kr"],
    "flags": [
      { "type": "유사 도메인", "desc": "nhis.or.kr을 사칭", "severity": "high" }
    ]
  },
  "modelVersion": "kc-electra-v1.2.3",
  "processingTime": 1240,
  "cacheHit": false,
  "createdAt": "2026-06-05T17:32:00+09:00"
}
```

---

## 🤝 7가지 결정 포인트 (우리 추천 + 이유)

이건 **프론트 측 의견**이야. 백엔드/AI에서 더 좋은 이유가 있으면 얼마든지 협의 가능.

| # | 결정 | 우리 추천 | 추천 이유 (참고만) | 협의 |
|---|---|---|---|---|
| 1 | 위험도 enum | `"high" \| "medium" \| "low"` (소문자) | 임계값 분기 단순, JSON 친화적 | 다른 케이스도 가능 |
| 2 | 점수 스케일 | `0~100` 정수 | 임계값 명확, AI 출력 그대로 | |
| 3 | 필드 네이밍 | `camelCase` | TS 기본, 어댑터 불필요 | snake_case도 OK (어댑터 매핑) |
| 4 | 날짜 | ISO 8601 | JS Date 호환, 표준 | Unix timestamp는 변환 필요 |
| 5 | 에러 포맷 | `{ code, message, details? }` | i18n, 자동 재시도 판단에 유리 | |
| 6 | 분석 응답 | 동기 (3~5초) | v1 단순함 | 10초+ 필요하면 Job ID 패턴 추가 |
| 7 | 페이지네이션 | `page` + `pageSize` | v1 단순 | cursor 방식도 OK |

**이견 있으면 편하게 코멘트 달아주세요. 이유가 있으면 다 협의 가능해요.** 👍

---

## 🛠️ Mock 동작 (현재)

- `VITE_USE_MOCK=true` → `src/lib/mock/responses.ts` 가 응답
- `VITE_USE_MOCK=false` + `VITE_API_BASE_URL=http://localhost:8000` → 실제 백엔드 호출
- 발표 시: Mock으로 전체 데모 가능, 백엔드 안 올라와도 OK
- 백엔드 준비되면 `.env` 한 줄만 바꾸면 전환

---

## ✅ 다음 액션

1. 백엔드에서 초안 응답 (JSON 1개) 받으면 → 본 문서와 비교
2. 차이 5개 이하면 → 슬랙/구글독 코멘트로 해결
3. 차이 10개 이상 → 30분 화상회의
4. 합의된 최종본 → `src/types/api.ts` 와 백엔드 OpenAPI 양쪽 동시 업데이트

---

## 📞 연락

- 프론트엔드: NewBiz Shield 팀 (Figma Make export 기반)
- 사용 프레임워크: React 18 + Vite 6 + TypeScript
- 통합 시점 목표: 발표 데모 (Mock으로 진행, 백엔드는 발표 후 본 통합)
- 우선순위: 백엔드/AI 합의 → 발표 데모 → 실서비스 백엔드 연결
