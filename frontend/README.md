# NewBiz Shield — Frontend (Smishing Detector)

> AI 기반 스미싱/피싱 탐지 웹앱 — 프론트엔드 (심화 프로젝트)

스미싱 의심 문자·URL·이미지를 입력하면 위험도, 공격 유형, 탐지 근거, 피해 시나리오, 대응 가이드를 알려주는 서비스. **일반 사용자(B2C) 대상.**

---

## 🧱 기술 스택

| 분류 | 사용 |
|---|---|
| **언어/빌드** | TypeScript + Vite 6 |
| **UI** | React 18 + Tailwind CSS 4 + Material UI + Radix UI |
| **라우팅** | React Router 7 |
| **상태/애니메이션** | Framer Motion 12, React Hook Form, Sonner |
| **차트** | Recharts 2 |
| **아이콘** | Lucide React |
| **HTTP** | Native `fetch` (axios 미사용) |

> 전체 의존성은 `package.json` 참고. **새 패키지 추가 0개** — Figma Make export 스택 그대로.

---

## 📁 프로젝트 구조 (이게 뭐하는 폴더인지)

```
frontend/
├── src/
│   ├── app/                          ← Figma export 페이지/레이아웃
│   │   ├── App.tsx                   앱 엔트리 (Router + AdminProvider)
│   │   ├── routes.tsx                모든 라우트 정의 (38개)
│   │   ├── components/               페이지 컴포넌트 (44개)
│   │   │   ├── Analyzer.tsx          SMS 분석 입력 페이지
│   │   │   ├── URLAnalyzer.tsx       URL 분석 입력 페이지
│   │   │   ├── ImageAnalyzer.tsx     이미지 업로드 + OCR
│   │   │   ├── AnalysisProgress.tsx  분석 중 프로그레스
│   │   │   ├── AnalysisResult.tsx    분석 결과 7-카드 화면
│   │   │   ├── SenderLookup.tsx      발신번호 조회
│   │   │   ├── History.tsx           검사 이력
│   │   │   ├── CaseStudies.tsx       피해 사례
│   │   │   ├── ReportPage.tsx        신고 폼
│   │   │   ├── Landing.tsx           홈
│   │   │   ├── Layout.tsx            GNB + Footer + 다크모드
│   │   │   ├── ui/                   shadcn UI 프리미티브 (50+)
│   │   │   ├── result/               결과 카드 (위험도/근거/사례 등)
│   │   │   ├── figma/                Figma 헬퍼
│   │   │   └── (어드민 페이지 21개)  /admin/* (대시보드/오탐분석/A/B 등)
│   │   └── context/
│   │       └── AdminContext.tsx       어드민 인증 상태 (localStorage)
│   │
│   ├── lib/                          ← 백엔드 연동 레이어 (신규)
│   │   ├── api.ts                    API 클라이언트 (13개 endpoint 함수)
│   │   ├── env.ts                    환경변수 (VITE_USE_MOCK 등)
│   │   ├── smsAnalysis.ts            클라이언트 분석 (백엔드 미연동 폴백)
│   │   └── mock/
│   │       └── responses.ts          Mock 응답 (백엔드 응답과 동일 모양)
│   │
│   ├── types/
│   │   └── api.ts                    ⭐ API 명세 (TypeScript 타입 20개 섹션)
│   │
│   ├── styles/                       CSS 파일들 (Tailwind 등)
│   ├── main.tsx                      React 엔트리
│   │
│   └── (기타)                        index.html, vite.config.ts, tsconfig.* 등
│
├── docs/                             ← 프로젝트 문서 (신규)
│   ├── api-integration-guide.md      백엔드팀 통합 가이드 (상세)
│   ├── backend-request.md            깃허브 이슈용 요청서
│   └── backend-onboarding.md         백엔드 온보딩 (REST+JSON만 알면 됨)
│
├── package.json                      의존성 + npm 스크립트
├── package-lock.json                 의존성 잠금 파일
├── vite.config.ts                    Vite 설정
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
├── .env.example                      환경변수 예시 (실 .env는 커밋 금지)
├── .gitignore                        Git 제외 파일
└── README.md                         ← 이 파일
```

---

## 🚀 빠른 시작 (로컬 실행)

```bash
# 1) 의존성 설치
npm install

# 2) 환경변수 설정 (.env 파일이 없으면)
cp .env.example .env
# → VITE_USE_MOCK=true 가 기본 (백엔드 없이도 동작)

# 3) 개발 서버 시작
npm run dev
# → http://localhost:5173 접속

# 4) 빌드
npm run build

# 5) 타입 체크
npm run typecheck
```

---

## 🔌 백엔드 연동

**현재 상태**: Mock 응답으로 동작. 백엔드/AI 모델 미연동.

**연동 방법**:
1. 백엔드팀이 `src/types/api.ts` 의 API 명세대로 endpoint 구현
2. `.env` 파일에서 `VITE_USE_MOCK=false` + `VITE_API_BASE_URL=http://백엔드주소` 설정
3. 코드 변경 0줄로 진짜 API 호출

**자세한 내용**:
- 📄 API 명세 본체: [`src/types/api.ts`](./src/types/api.ts) **(필독)**
- 📘 통합 가이드: [`docs/api-integration-guide.md`](./docs/api-integration-guide.md)
- 🎓 백엔드 온보딩 (React 몰라도 됨): [`docs/backend-onboarding.md`](./docs/backend-onboarding.md)

---

## 🎯 주요 사용자 플로우

```
[홈 /] → [문자 검사 /analyze] → [분석 중] → [결과 7-카드 /analyze/result/:id]
                                ↓
                          [신고] [공유] [재검사]
```

**4가지 검사 유형**: SMS / URL / Image / 발신번호 조회

---

## 🚦 라우트 (38개)

| 사용자용 (14) | 어드민/내부 (24) |
|---|---|
| `/` (홈) | `/admin`, `/dashboard`, `/patterns`, `/model` |
| `/analyze` (SMS) | `/attention`, `/ab-test`, `/redteam` |
| `/url` | `/error-analysis`, `/audit`, `/benchmark` |
| `/image` | `/dataset`, `/feature-importance`, `/health` |
| `/sender` | `/live-feed`, `/zero-day`, `/simulator` |
| `/analyze/progress`, `/analyze/result/:id` | `/bulk`, `/compare`, `/export` |
| `/cases`, `/history`, `/trend` | `/gallery`, `/ioc`, `/api` |
| `/guide`, `/quiz`, `/report` | `/settings`, `/changelog` |
| `/senior-analyze` | |

> 어드민 페이지 24개는 발표 데모와 무관. v1 정식 오픈 전 정리 권장.

---

## 🧪 작업 가이드 (팀원용)

### 새 endpoint 추가하려면

1. `src/types/api.ts` 에 Request/Response 타입 추가
2. `src/lib/api.ts` 에 endpoint 함수 추가
3. (백엔드 미준비 시) `src/lib/mock/responses.ts` 에 mock 응답 추가
4. 백엔드 합의 후 `VITE_USE_MOCK=false` 전환

### 새 페이지 추가하려면

1. `src/app/components/` 에 `MyPage.tsx` 작성
2. `src/app/routes.tsx` 에 route 추가
3. (필요 시) `src/app/components/Layout.tsx` GNB 메뉴에 추가

### 결과 화면 분석 로직 교체

`Analyzer.tsx` 의 `analyzeText()` → `await api.analyze({ type: 'sms', content })` 로 교체.
동일한 작업이 `AnalysisResult.tsx`, `SeniorAnalyzer.tsx` 에도 있음 (P0 #4).

---

## 📦 빌드/배포

```bash
npm run build    # → dist/
npm run preview  # 로컬에서 dist 미리보기
```

`dist/` 폴더가 정적 파일. Nginx/Vercel/Netlify 어디든 OK.

---

## 🤝 팀

- **프론트엔드**: NewBiz Shield (이 레포의 `frontend/`)
- **백엔드**: 같은 레포의 `backend/`
- **AI 모델**: 같은 레포의 `ai_service/`, `ai_monitoring/`
- **조직**: KDT AI 2기 3반 (심화 프로젝트)

---

## 📝 변경 이력

- 2026-06-05: Figma Make export 베이스라인 (38 routes, 44 components)
- 2026-06-08: API Contract v1.0 + API 클라이언트 + Mock + 백엔드 온보딩 문서 추가
