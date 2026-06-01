# smishing-frontend-v2

스미싱 문자 판별 웹 프론트엔드를 React + Vite + JavaScript로 다시 구성하는 하네스 프로젝트입니다.

이 프로젝트는 `/Users/aku/Documents/프론트엔드` 아래에서 독립적으로 관리하며, 기존 `smishing-frontend-harness`, 기존 `web_mvp`, backend, ai_service, deploy는 수정하지 않습니다.

## 실행 방법

```bash
npm install
npm run dev
npm run build
```

테스트 스크립트가 추가되면 각 Phase 검증 시 `npm test`도 함께 실행합니다.

## 폴더 구조

```text
smishing-frontend-v2
├─ public
├─ src
│  ├─ assets
│  ├─ api
│  ├─ mocks
│  ├─ components
│  │  ├─ layout
│  │  ├─ common
│  │  ├─ analysis
│  │  ├─ url
│  │  ├─ image
│  │  ├─ report
│  │  ├─ feedback
│  │  └─ dashboard
│  ├─ pages
│  ├─ routes
│  ├─ constants
│  ├─ utils
│  ├─ App.jsx
│  └─ main.jsx
├─ .env.example
├─ package.json
└─ README.md
```

## 환경변수 예시

```env
VITE_USE_MOCK=true
VITE_API_BASE_URL=http://localhost:8000
```

실제 환경변수 값, API Key, Secret은 저장소에 기록하지 않습니다.

## Phase 진행 방식

- 한 번에 전체 구현하지 않고 Phase 단위로만 진행합니다.
- 각 Phase는 사용자 승인 후 시작합니다.
- 작업 전에는 계획을 보고합니다.
- 작업 후에는 변경 파일, 검증 결과, 남은 문제를 보고합니다.
- `.make` 파일은 재해석하지 않고 원본 프레임 기준으로 사용합니다.
- 원본 이미지가 추출되지 않으면 임의 대체하지 않습니다.
- 모든 Phase 검증에는 `npm run build`를 포함합니다.

## 현재 완료 상태

- Phase 0 새 프로젝트 세팅 완료
- React + Vite + JavaScript 세팅 완료
- Tailwind CSS 설정 완료
- React Router 설치 완료
- 기본 폴더 구조 생성 완료
- `.env.example` 생성 완료
- 하네스 문서 생성 완료
- `npm run build` 성공

## 다음 단계

1. Figma Make 원본 화면 분석 및 MVP 범위 확정

기준 파일 경로:

```text
/Users/aku/Documents/프론트엔드/references/original-files/심화프로젝트_프론트엔드.make
```

기준 `.make` 파일이 없으면 Phase 1 분석을 시작하지 않습니다.
