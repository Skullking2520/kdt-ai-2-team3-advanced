# 백엔드 온보딩 — 프론트엔드 어떻게 보면 되는지

> 이 문서는 **백엔드 담당자분**이 우리 프론트엔드랑 같이 일할 때 필요한 최소한만 정리한 거예요.
> React/Vite/TypeScript 몰라도 **REST API + JSON만 알면** 90% 작업 가능.

---

## 1. 프론트엔드가 뭔지 (백엔드 시각에서)

프론트엔드는 **사용자가 브라우저에서 클릭/입력하는 화면**이에요.

```
[사용자] → [브라우저 (프론트)] → [HTTP 요청] → [백엔드]
                                              ↓
              ← [JSON 응답] ← [백엔드] ← [DB 조회/AI 추론]
```

**백엔드가 알면 되는 것:**
- 프론트는 HTTP로 요청 보냄 (GET, POST)
- 백엔드는 JSON으로 응답하면 됨
- 끝

**백엔드가 몰라도 되는 것:**
- ❌ React, Vite, TypeScript, Tailwind
- ❌ 컴포넌트, props, state, hook
- ❌ 라우팅, 빌드, npm install
- ❌ UI 어떻게 생겼는지

---

## 2. 실제로 봐야 할 파일 (딱 4개)

| 파일 | 봐야 할까? | 왜? |
|---|---|---|
| `frontend/src/types/api.ts` | ✅ **필수** | **API 명세서 본체**. 모든 endpoint, request, response 타입이 여기 있음 |
| `frontend/src/lib/api.ts` | ⬇️ 참고 | 프론트가 백엔드 어떻게 호출하는지 (axios 대용 fetch) — endpoint URL만 확인용 |
| `frontend/src/lib/env.ts` | ⬇️ 참고 | 환경변수 (백엔드 URL, Mock 토글) |
| 그 외 frontend/src/ 하위 | ❌ 안 봐도 됨 | React 코드 — 백엔드랑 무관 |

**핵심**: `src/types/api.ts` 한 파일만 정독하면 됨.

---

## 3. CORS — 이거 안 하면 프론트가 백엔드 못 불러요

브라우저 보안 정책상 프론트(`localhost:5173`)가 백엔드(`localhost:8000`) 호출하려면 백엔드에서 CORS 허용해야 함.

### FastAPI 기준 최소 설정

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",      # 프론트 dev 서버
        "https://yourdomain.com",     # 프로덕션 도메인 (발표 후)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**자주 하는 실수:**
- ❌ `allow_origins=["*"]` + `allow_credentials=True` → 브라우저가 거부
- ❌ origin 끝에 `/` 붙이기 → 매칭 안 됨 (`localhost:5173/` ❌, `localhost:5173` ✅)

---

## 4. 응답 에러는 이 모양으로

프론트는 모든 에러를 이렇게 파싱함:

```json
{
  "code": "INVALID_INPUT",
  "message": "문자 내용이 비어있습니다",
  "details": { "field": "content" }
}
```

**필수 3종**:
- `code`: 영문 enum (INVALID_INPUT, NOT_FOUND, RATE_LIMIT, INTERNAL 등)
- `message`: 사람이 읽는 메시지
- `details` (선택): 추가 정보

### FastAPI 예시

```python
from fastapi import HTTPException
from fastapi.responses import JSONResponse

class ApiError(Exception):
    def __init__(self, code: str, message: str, status: int = 400, details: dict = None):
        self.code = code
        self.message = message
        self.status = status
        self.details = details or {}

@app.exception_handler(ApiError)
async def api_error_handler(request, exc: ApiError):
    return JSONResponse(
        status_code=exc.status,
        content={
            "code": exc.code,
            "message": exc.message,
            "details": exc.details,
        },
    )

# 사용
@app.post("/api/analyze")
async def analyze(req: AnalysisRequest):
    if not req.content.strip():
        raise ApiError("INVALID_INPUT", "문자 내용이 비어있습니다", 400, {"field": "content"})
    # ... 분석 로직
```

---

## 5. 자주 받는 질문

### Q: 백엔드는 어떤 endpoint를 만들어야 하나요?

**`src/types/api.ts` 의 "P0 엔드포인트" 6개부터**:

| 메서드 | 경로 | 용도 |
|---|---|---|
| `POST` | `/api/analyze` | SMS/URL/Image 분석 (3종 통합) |
| `POST` | `/api/ocr` | 이미지에서 텍스트 추출 |
| `GET` | `/api/sender/:number` | 발신번호 평판 조회 |
| `GET` | `/api/history?page=N&size=20` | 검사 이력 |
| `POST` | `/api/reports` | 사용자 신고 접수 |
| `POST` | `/api/feedback` | 분석 결과 피드백 |

나머지(`/api/cases`, `/api/share`, `/api/jobs/:id`)는 P1 (발표 후).

### Q: 분석은 백엔드에서 어떻게 하나요?

```
1. /api/analyze 받음
2. AI 모델 호출 (FastAPI에서 직접 or 별도 ai_service 호출)
3. 결과 받음
4. AnalysisResult 모양으로 가공
5. JSON 반환
```

`riskLevel`은 소문자 enum (`'high' | 'medium' | 'low'`), `riskScore`는 0~100 정수.

### Q: AI 모델은 어디서 호출하나요?

우리 레포에 `ai_service/`, `ai_monitoring/` 폴더가 이미 있음. 백엔드는 `ai_service` 호출하거나 FastAPI 내부에 임베드.

### Q: 응답 시간은?

- 단순 조회 (sender, history): < 200ms
- 분석 (analyze): 1~5초 (AI 모델 추론 시간)
- OCR: 2~5초

5초 넘으면 비동기 작업 + 폴링 패턴 필요하지만, 일단 동기로 충분.

### Q: 인증은?

v1 (발표 단계)에는 인증 **없음**. 익명 사용. 나중에 JWT 추가 가능.

### Q: 데이터는 어디 저장하나요?

백엔드 자유. PostgreSQL, SQLite, 뭐든. 프론트는 모름. 응답 JSON에 `id`, `createdAt`만 있으면 됨.

---

## 6. 한 줄 요약

> **"REST API 6개 + JSON 응답 + CORS 허용"만 하면 됨. 나머지는 다 프론트가 알아서 함.**

자세한 스펙은 **`frontend/src/types/api.ts` (필수) + `frontend/docs/api-integration-guide.md` (선택)** 참고.

질문은 슬랙/구글독 코멘트로!
