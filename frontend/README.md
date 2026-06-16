# NewBiz Shield — Frontend

> 프론트엔드 개발자 온보딩 / 작업 가이드

이 레포의 `frontend/` 하위만 다룸. 백엔드/AI는 다른 폴더.

---

##  개발 환경

| | |
|---|---|
| **언어** | TypeScript 5.6 |
| **빌드** | Vite 6 |
| **프레임워크** | React 18 |
| **스타일** | Tailwind CSS 4 (유틸리티 클래스) |
| **UI 키트** | Radix UI (shadcn-style) + Lucide Icons |
| **차트** | Recharts 2 (Dashboard, TrendReport) |
| **라우팅** | React Router 7 |
| **HTTP** | Native `fetch` (axios 없음) |
| **상태** | useState/useEffect (전역은 Context: `AdminContext`, `SeniorContext`) |
| **테스트** | Vitest 2 (2개 테스트: smsAnalysis, mock/responses) |
| **린트** | ESLint 9 (flat config) |

---

##  실행

```bash
npm install
cp .env.example .env       # 처음 한 번만
npm run dev               # → http://localhost:5173
```

기타 스크립트:
- `npm run build` — 프로덕션 번들 (`dist/`, 1.80s)
- `npm run typecheck` — `tsc -b --noEmit` (CI에서 사용)
- `npm run lint` — ESLint 9 (`--max-warnings 0`)
- `npm run lint:fix` — 자동 수정
- `npm run test` — Vitest 2개 테스트
- `npm run preview` — 빌드 결과 미리보기

##  환경변수

`.env` 파일에 정의 (`frontend/.env`):

| 변수 | 기본값 | 설명 |
|---|---|---|
| `VITE_USE_MOCK` | `true` | Mock 응답 사용 (true: mock, false: 실 백엔드) |
| `VITE_API_BASE_URL` | `http://localhost:8000` | 실 백엔드 호출 시 base URL |
| `VITE_API_TIMEOUT` | `10000` | HTTP 타임아웃 (ms) |
| `VITE_MOCK_DELAY_MS` | `400` | Mock 응답 지연 (발표 데모용) |
| `VITE_DEBUG` | `true` | 디버그 로그 |
| `VITE_ADMIN_PASSWORD` | `newbiz2026` | 어드민 GNB 로그인 (학원 데모용 — 운영 시 강력한 랜덤 값으로 교체) |

---

##  폴더 구조 (프론트 핵심만)

```
 src/
├── app/                  ← 라우트 + 페이지 (Figma export)
│   ├── App.tsx
│   ├── routes.public.tsx  일반 사용자 라우트 (19개, 실서비스 빌드 포함)
│   ├── routes.admin.tsx   어드민/연구/개발 라우트 (24개, DEV 빌드에서만)
│   ├── components/        페이지 컴포넌트 (45개)
│   │   ├── ui/            공통 UI 컴포넌트 (shadcn-style 프리미티브)
│   │   ├── result/        결과 카드
│   │   ├── senior/        시니어 모드 전용 (SeniorBottomBar)
│   │   └── figma/         Figma 헬퍼
│   └── context/
│       ├── AdminContext.tsx
│       └── SeniorContext.tsx
│
├── lib/                  ← 백엔드 연동 레이어
│   ├── api.ts            API 클라이언트
│   ├── env.ts            환경변수
│   ├── smsAnalysis.ts    클라이언트 사이드 분석 (Mock, API 마이그레이션 예정)
│   ├── ErrorState.tsx    공통 에러 UI
│   └── mock/             VITE_USE_MOCK=true일 때 응답
│
├── types/
│   └── api.ts             API 명세 (TypeScript 타입)
│
├── styles/               CSS (Tailwind 등)
└── main.tsx              엔트리
```

### 어디에 뭐가 있나

| 보고 싶은 거 | 여기 |
|---|---|
| **public 라우트** (일반 사용자) | `src/app/routes.public.tsx` |
| **admin 라우트** (관리자) | `src/app/routes.admin.tsx` (DEV 빌드만) |
| 새 페이지 | `src/app/components/MyPage.tsx` → routes.public.tsx에 등록 |
| GNB 메뉴 (헤더) | `src/app/components/Layout.tsx` |
| 어드민 GNB | `src/app/components/Layout.tsx` (isAdmin 조건부) |
| 시니어 모드 토글/메뉴 | `src/app/components/Layout.tsx` + `SeniorContext` |
| API 호출 함수 | `src/lib/api.ts` |
| API 타입/스키마 | `src/types/api.ts` |
| 환경변수 | `src/lib/env.ts` + `.env` |
| 공통 UI (버튼/카드 등) | `src/app/components/ui/` |
| 결과 카드 | `src/app/components/result/` |
| 에러 UI | `src/lib/ErrorState.tsx` |

---

##  백엔드 연동 흐름

```
[페이지 컴포넌트]
    └─ await api.analyze({...})         ← src/lib/api.ts
         └─ fetch('/api/analyze', ...)  ← VITE_API_BASE_URL 사용
              └─ 백엔드 응답
                   └─ src/types/api.ts 의 AnalysisResult 로 파싱
```

**현재 상태**: 백엔드 연동 진행 중.
현재는 Mock 응답을 기본 사용하며,
일부 페이지는 API 마이그레이션이 진행 중이다.

**연동 시**: `.env` 에서 `VITE_USE_MOCK=false`, `VITE_API_BASE_URL=...` 설정.
각 페이지의 API 마이그레이션 완료 시
실 백엔드 호출이 동작한다.

---

## ️ 코딩 컨벤션

### 파일/함수
- 컴포넌트: PascalCase (`Analyzer.tsx`, `RiskLevelCard.tsx`)
- 유틸/훅: camelCase (`useAnalysis.ts`, `formatDate.ts`)
- 타입/인터페이스: PascalCase (`AnalysisRequest`)
- 함수: camelCase (`analyzeText`, `lookupSender`)

### 스타일
- Tailwind 유틸리티 클래스 우선 (`className="flex items-center gap-2"`)
- 인라인 스타일은 dynamic 값만 (`style={{ width: `${pct}%` }}`)
- 다크모드: `dark:` prefix (`bg-white dark:bg-[#0d1526]`)
- Lucide 아이콘 사용 (`import { Shield } from 'lucide-react'`)

### 상태 관리
- 로컬: `useState`
- 파생값: `useMemo` (꼭 필요할 때만)
- 전역: `Context`
  - `AdminContext` — 어드민 인증 (`nb_admin_auth` localStorage)
  - `SeniorContext` — 시니어 모드 (`nb:senior` localStorage, html class 동기화)
- 새 라이브러리 추가 없이 시작 (Redux/Zustand 등 사용 X)

### API 호출
- 직접 `fetch`  → `api.xxx()`  (인터셉터/에러 일관성)
- 새 endpoint 추가: `src/types/api.ts` 에 타입 먼저 → `src/lib/api.ts` 에 함수

### TypeScript
- `any` 금지 (불가피하면 `unknown` + narrow)
- 컴포넌트 props는 명시적 interface
- union type 적극 사용 (`type RiskLevel = 'high' | 'medium' | 'low'`)

---

##  자주 하는 작업

### 1) 새 페이지 추가

```bash
# 1) 파일 생성
touch src/app/components/MyPage.tsx
```

```tsx
// MyPage.tsx
export function MyPage() {
  return <div className="max-w-3xl mx-auto p-6">MyPage</div>;
}
```

```tsx
// src/app/routes.tsx 에 추가
import { MyPage } from "./components/MyPage";

{ path: "my-page", Component: MyPage },
```

### 2) 새 API endpoint 호출

```ts
// 1) src/types/api.ts 에 타입 추가
export interface MyRequest { foo: string; }
export interface MyResponse { bar: number; }

// 2) src/lib/api.ts 에 함수 추가
myEndpoint: (req: MyRequest) =>
  request<MyResponse>('/api/my-endpoint', { method: 'POST', body: req }),

// 3) 컴포넌트에서 사용
const result = await api.myEndpoint({ foo: 'hello' });
```

### 3) 새 shadcn UI 컴포넌트 추가

`src/app/components/ui/` 에 shadcn 형식 파일 추가 (Radix UI 기반).
기존 컴포넌트 참고: `button.tsx`, `card.tsx`, `dialog.tsx` 등.

---

##  디버깅 팁

| 증상 | 확인 |
|---|---|
| API 호출 안 됨 | `.env` 의 `VITE_USE_MOCK` / `VITE_API_BASE_URL` 확인. `VITE_DEBUG=true` 켜면 로그 출력 |
| 타입 에러 | `npm run typecheck` |
| 린트 에러 | `npm run lint` (수정: `npm run lint:fix`) |
| 빌드 실패 | `node_modules` 삭제 후 `npm install` 재시도 |
| Mock 안 나옴 | `src/lib/mock/responses.ts` 의 라우트 등록 확인 |
| 다크모드 깨짐 | `dark:` prefix 누락, `tailwind.config` 의 darkMode 확인 |
| 시니어 모드 안 켜짐 | `localStorage["nb:senior"]` 확인 (true/false 문자열) |
| 어드민 GNB 안 보임 | `localStorage["nb_admin_auth"]` 확인 (로그인: "true") |
| 분석 실패 화면 | `src/lib/ErrorState.tsx` 4종 (network/timeout/server/unknown) |
| 느린 로딩 시뮬레이션 | `/analyze/progress?text=테스트&slow=8000` |
| 실패 시뮬레이션 | `/analyze/progress?text=테스트&fail=network|timeout|server` |

---

##  컨벤션 체크리스트 (PR 전)

- [ ] TypeScript 에러 0건 (`npm run typecheck`)
- [ ] ESLint 에러 0건 (`npm run lint`)
- [ ] 빌드 성공 (`npm run build`)
- [ ] 테스트 통과 (`npm run test`)
- [ ] `.env` 파일 커밋 안 됨
- [ ] console.log 디버그 코드 제거
- [ ] 다크모드 / 시니어 큰글씨 모드 깨지지 않음
- [ ] 모바일 (375px / 360px 폭) 깨지지 않음
- [ ] 4해상도 시각 검증 (Playwright) — 1920x1080 / 1366x768 / 390x844 / 360x800
- [ ] ErrorState 4종 (network/timeout/server/unknown) 정상
- [ ] localStorage 손상 시 fallback 작동

---

## 어드민 모드 (발표용 데모)

`/admin` 경로에서 어드민 인증 후 운영 도구 사용 가능:

```bash
# .env의 VITE_ADMIN_PASSWORD 확인
# 기본값: newbiz2026 (학원 데모용)
```

인증 후 `localStorage["nb_admin_auth"] = "true"` 저장. 로그아웃 또는 `isAdmin` 컨텍스트의 `logout()` 함수로 해제.

운영 도구 (24개 라우트 중 GNB 노출 6개):
- **모델 성능** (`/admin`) — AdminPanel
- **대시보드** (`/dashboard`) — Recharts 차트, 신고/피드백 카드
- **패턴 DB** (`/patterns`) — 피싱 패턴 라이브러리
- **보안 감사** (`/audit`) — AuditLog + 신고 검토
- **피드백 분석** (`/feedback`) — AdminFeedback
- **설정** (`/settings`) — 환경 설정

나머지 18개 (simulator, live-feed, export, attention, bulk, compare, benchmark, dataset, model, zero-day, api, error-analysis, redteam, ab-test, feature-importance, ioc, health 등) 라우트는 등록되어 있으나 GNB에 노출 안 됨. **운영 시 `import.meta.env.DEV` 가드** (`routes.admin.tsx` 참고).

## 시니어 모드

`nb:senior` localStorage 키로 토글. 시니어 모드 ON일 때:
- html에 `.senior-mode` 클래스 자동 부여
- GNB 4→6개 메뉴 (홈/문자/링크/사진/전화번호/신고/도움)
- SeniorHome 진입 페이지 노출 (5개 메인 버튼 + 112/1332/118 긴급연락처)
- 어드민 라우트 자동 제외 (시니어 UX 우선)
- 다크 테마 강제 (SeniorHome/SeniorAnalyzer 다크 전용 디자인)
