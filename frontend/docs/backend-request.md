# [API Contract] NewBiz Shield 프론트↔백엔드 응답 스키마 합의 요청

> **GitHub Issue 제목 그대로 복붙해서 쓰면 됩니다.**

---

## 📌 요약 (TL;DR)

NewBiz Shield 프론트엔드에서 사용할 **API 응답 스키마 합의**가 필요합니다.

- 프론트엔드 측 초안: `src/types/api.ts` (TypeScript 타입 20개 섹션, 371줄)
- 백엔드 측 초안: TBD
- 합의 후 본 문서와 `src/types/api.ts` 양쪽 동기화

**필요 응답**: 7가지 결정 포인트 합의 + 실제 JSON 응답 1개 (SMS 분석 high 위험 케이스)

---

## 🎯 왜 이게 필요한가

현재 프론트엔드는 **클라이언트 사이드 Mock 로직**으로 분석을 구현 중입니다 (`analyzeText()` 8개 파일에 중복). 발표 데모는 가능하지만, 백엔드/AI 모델이 붙으면 이걸 전부 교체해야 합니다.

교체 작업 시작 전에 **응답 스키마 합의**가 선행되지 않으면:
- 백엔드 구현 → 프론트 타입 불일치 → 양쪽 다 재작업
- AI 모델 출력 → 백엔드 변환 → 프론트가 또 변환 → 지연/손실

**지금 합의 → 나중에 한 번에 통합**이 가장 빠릅니다.

---

## 🔑 합의 핵심 (3가지, 양보 불가)

| # | 결정 | 값 | 절대 변경 불가 이유 |
|---|---|---|---|
| 1 | 위험도 enum | `"high" \| "medium" \| "low"` (소문자) | 임계값 분기 단순화, JSON 호환 |
| 2 | 점수 스케일 | `0~100` 정수 | 임계값 명확성, AI 모델 출력 그대로 |
| 3 | 날짜 포맷 | ISO 8601 (`2026-06-05T17:32:00+09:00`) | 표준, JS Date 호환 |

상세 7가지 결정 포인트는 [`docs/api-integration-guide.md`](./api-integration-guide.md) § "7가지 결정 포인트" 참고.

---

## 📂 참고 파일 (이 레포 내)

| 파일 | 설명 |
|---|---|
| `src/types/api.ts` | **TypeScript 타입 = API 명세 본체**. 백엔드 담당자분은 이 파일을 우선 봐주세요. |
| `src/lib/api.ts` | 프론트 API 클라이언트 (요청 어떻게 보내는지) |
| `src/lib/mock/responses.ts` | Mock 응답 예시 모음 (백엔드 응답과 동일 모양) |
| `docs/api-integration-guide.md` | 통합 가이드 전체 문서 (상세 설명) |

---

## 🔌 우선순위 엔드포인트 (P0, 발표 데모용)

| 메서드 | 경로 | Request | Response |
|---|---|---|---|
| `POST` | `/api/analyze` | `AnalysisRequest` | `AnalysisResult` (SMS/URL/Image Union) |
| `POST` | `/api/ocr` | `{ image: string }` | `OcrResponse` |
| `GET` | `/api/sender/:number` | - | `SenderLookupResult` |
| `GET` | `/api/history?page=N&size=20` | - | `Paginated<HistoryItem>` |
| `POST` | `/api/reports` | `ReportRequest` | `ReportResponse` |
| `POST` | `/api/feedback` | `FeedbackRequest` | `{ ok: true }` |

나머지 엔드포인트 (`/api/cases`, `/api/share`, `/api/jobs/:id` 등)는 P1 (발표 후).

---

## 📄 응답 예시 (SMS 분석 — high 위험 케이스)

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
    { "priority": "critical", "action": "링크를 절대 클릭하지 마세요" },
    { "priority": "high", "action": "공식 앱이나 대표번호로 직접 확인하세요" }
  ],
  "similarCases": [
    { "id": "case_001", "title": "건강보험 미납 통지 위장", "similarity": 87, "year": "2024", "category": "공공기관 사칭" }
  ],
  "governmentCriteria": [
    { "id": "url_included", "label": "의심 URL 포함", "matched": true },
    { "id": "impersonation", "label": "기관 사칭", "matched": true }
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

전체 필드 정의는 `src/types/api.ts` 1번 섹션부터 20번 섹션까지 참고.

---

## ✅ 합의 체크리스트 (각 항목 코멘트 부탁)

- [ ] **riskLevel enum**: `"high" | "medium" | "low"` OK? (대문자 `HIGH` 안 됨)
- [ ] **riskScore**: `0~100` 정수 OK?
- [ ] **날짜 포맷**: ISO 8601 OK? (Unix timestamp 안 됨)
- [ ] **에러 포맷**: `{ code, message, details? }` 구조 OK?
- [ ] **필드 네이밍**: camelCase OK? (snake_case 원하시면 매핑 어댑터 추가 가능)
- [ ] **페이지네이션**: `page` + `pageSize` (v1은 OK, v2는 cursor)
- [ ] **분석 응답 동기/비동기**: v1은 동기 (3~5초), 10초+ 필요시 Job ID 추가 — 동의?

---

## 🛠️ 합의 후 작업

1. 양쪽 팀 대표 (프론트 1명 + 백엔드 1명) 30분 화상회의로 차이 해결
2. 합의된 최종본을 `src/types/api.ts` 와 백엔드 OpenAPI 양쪽에 동시 반영
3. 통합 가이드(`docs/api-integration-guide.md`) § "다음 액션" 따라 진행

---

## 📅 일정

| 마일스톤 | 기한 |
|---|---|
| 본 요청 검토 + 코멘트 | **이번 주 내 (06-12)** |
| 초안 응답 (JSON 1개) 공유 | **06-12까지** |
| 합의 회의 | **06-13 (30분)** |
| 양쪽 동기화 완료 | **06-15** |
| 발표 데모 (Mock으로 진행) | 발표일 |

---

## 🏷️ 라벨 (GitHub Issue 등록 시)

`api`, `contract`, `backend`, `frontend`, `priority:P0`, `discussion-needed`

---

## 📞 담당

- 프론트엔드: NewBiz Shield 팀
- 백엔드: TBD (본 이슈에 assign 부탁드립니다)
- AI 모델: TBD (응답 형식 관련 의견 환영)

---

**읽어주셔서 감사합니다 🙏** 의견 있으시면 본 이슈에 코멘트 달아주세요. 합의되면 체크박스 체크 + 최종본 별도 PR 올리겠습니다.
