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
| **UI 키트** | Material UI 7 + Radix UI (shadcn-style) |
| **라우팅** | React Router 7 |
| **HTTP** | Native `fetch` (axios 없음) |
| **상태** | useState/useEffect (전역은 Context, 추가 라이브러리 X) |

---

##  실행

```bash
npm install
cp .env.example .env       # 처음 한 번만
npm run dev               # → http://localhost:5173
```

기타 스크립트:
- `npm run build` — 프로덕션 번들 (`dist/`)
- `npm run typecheck` — `tsc -b --noEmit` (CI에서 사용)
- `npm run preview` — 빌드 결과 미리보기

---

##  폴더 구조 (프론트 핵심만)

```
 src/
├── app/                  ← 라우트 + 페이지 (Figma export)
│   ├── App.tsx
│   ├── routes.tsx         주요 라우트 정의
│   ├── components/        페이지 컴포넌트
│   │   ├── ui/            공통 UI 컴포넌트 (shadcn-style 프리미티브)
│   │   ├── result/        결과 카드
│   │   └── figma/         Figma 헬퍼
│   └── context/
│       └── AdminContext.tsx
│
├── lib/                  ← 백엔드 연동 레이어 (직접 추가)
│   ├── api.ts            API 클라이언트
│   ├── env.ts            환경변수
│   ├── smsAnalysis.ts    클라이언트 사이드 분석 (일부 페이지에서 사용 중, API 마이그레이션 예정)
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
| 라우트 추가/수정 | `src/app/routes.tsx` |
| 새 페이지 | `src/app/components/MyPage.tsx` → routes.tsx에 등록 |
| GNB 메뉴 | `src/app/components/Layout.tsx` |
| API 호출 함수 | `src/lib/api.ts` |
| API 타입/스키마 | `src/types/api.ts` |
| 환경변수 | `src/lib/env.ts` + `.env` |
| UI 컴포넌트 (버튼/카드 등) | `src/app/components/ui/` |
| 결과 카드 | `src/app/components/result/` |

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
- 전역: `Context` (현재는 `AdminContext`만)
- 새 라이브러리 추가 없이 시작

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
| 빌드 실패 | `node_modules` 삭제 후 `npm install` 재시도 |
| Mock 안 나옴 | `src/lib/mock/responses.ts` 의 라우트 등록 확인 |
| 다크모드 깨짐 | `dark:` prefix 누락, `tailwind.config` 의 darkMode 확인 |

---

##  컨벤션 체크리스트 (PR 전)

- [ ] TypeScript 에러 0건 (`npm run typecheck`)
- [ ] 빌드 성공 (`npm run build`)
- [ ] `.env` 파일 커밋 안 됨
- [ ] console.log 디버그 코드 제거
- [ ] 다크모드/큰글씨 모드 깨지지 않음
- [ ] 모바일 (375px 폭) 깨지지 않음

---

## 웹 MVP (참고)

`web_mvp/` 폴더에 React/Vite/Tailwind 기반 스미싱 문자 판별 웹 MVP가 있습니다 (초기 프로토타입). 정식 프론트엔드는 `src/` (Figma export 기반) 사용을 권장합니다.

```bash
cd frontend/web_mvp
npm install
npm run dev
```
