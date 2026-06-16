# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [v1.0.1] — 2026-06-15

### Changed

#### Frontend — 발표 전 마감 + UX 안정화
- **검사하기 버튼 색상 분리**: `Analyzer` / `SeniorAnalyzer` 모두 disabled(회색) vs active(blue-500 + 글로우) 명확히 구분. 시니어 모드 disabled 오인 문제 해결
- **GNB 헤더 z-index 40 → 50 + shadow-sm**: 드롭다운이 Hero 섹션 위에 명확히 떠 보이도록
- **SeniorBottomBar 라우팅**: "처음으로" 버튼이 `/` 가 아닌 `/senior-home` 으로 이동
- **로고 클릭 라우팅**: 시니어 모드일 때 `/senior-home` 으로 이동
- **Senior 메뉴 확장**: 4개 → 6개 (문자 검사 / 링크 검사 / 사진 검사 / 전화번호 조회 / 신고 / 도움)
- **시니어 홈 5개 메인 버튼**: 단순 4개 → 5개 (문자/이미지/링크/전화번호/신고)
- **시니어 이미지 검사 라우트 추가**: `/senior-image` (SeniorImageAnalyzer 신규)
- **어드민 GNB 6개**: Dashboard / Patterns DB / Audit Log / Feedback / Settings + 종료 버튼
- **Dashboard 차트**: Recharts 마이그레이션 + 신고/피드백 카드 추가
- **사례 페이지**: 4건 → 11건 확장, 가짜 통계 헤더 ("10건 수록 사례") 제거
- **TrendReport**: 가짜 통계 6개 제거
- **SystemHealth**: GPU 상태 배지 신규
- **AdminFeedback**: 정확도 피드백 분석 신규
- **AuditLog**: 신고 검토 + Mock 5건 + 액션 버튼

#### Frontend — 안정성
- **AnalysisProgress ErrorState 통합**: API 실패 3종 (network/timeout/server) + 재시도/홈 버튼
  - `?fail=network|timeout|server` 쿼리로 시뮬레이션 가능
- **느린 네트워크 시뮬레이션**: `?slow=ms` 쿼리로 5초+ 로딩 검증
- **URLAnalyzer ErrorType 자동 매핑**: `NETWORK` → network, `MODEL_TIMEOUT` → timeout, `INTERNAL` → server
- **localStorage 4종 try/catch fallback**: `nb:senior`, `nb_admin_auth`, `nb-theme`, `newbiz-settings` 모두 손상 시 안전한 기본값
- **viewport meta 보강**: `viewport-fit=cover`, `interactive-widget=resizes-content` (모바일 키보드 가림 해결)

#### Frontend — 리팩터
- **SeniorAnalyzer 중복 className 9개 제거**: TS17001 빌드 에러 해결
- **Layout.tsx Hooks 위반 픽스**: `onClick` 내 `useAdmin().logout()` 호출 → `useAdmin()` 분리
- **NavDropdown onClick + onFocus/onBlur**: 모바일/키보드 네비게이션 지원
- **tsconfig.app.json**: strict 강화 (noUnusedLocals/Parameters)
- **ESLint 9 flat config**: `eslint.config.js` + `lint` / `lint:fix` 스크립트

### Removed
- **EasyCheck.tsx 삭제**: `/easy` 라우트 고아 (GNB 0건)
- **PhishingGallery.tsx 삭제**: `/gallery` 라우트 고아 (GNB 0건)
- **EasyCheck / PhishingGallery**: `routes.public.tsx` 에서 라우트 제거
- **frontend.zip** (110M), **frontend 2.zip** (78M), **qa-screenshots*/** 폴더 (14M): 빌드 산출물 + 1회성 QA

### Added
- **SeniorImageAnalyzer.tsx**: 시니어 이미지 검사 (큰 글씨 + 다크 + OCR)
- **AdminFeedback.tsx**: 어드민 정확도 피드백 분석
- **루트 README.md / CHANGELOG.md** 신규 (PR-D 작업 결과)

### Infra
- **cicd.yml 정리**: `web_mvp` 경로 5곳 → `frontend`
- **vite.config.ts / vitest.config.ts**: 실수로 휴지통 보낸 후 복원 (PM 발견)
- **Lint 스크립트**: `npm run lint` / `npm run lint:fix`

### Verified
- 4해상도 (1920x1080, 1366x768, 390x844, 360x800) × 19 public 라우트 시각 캡처 (108장, 콘솔 0 errors)
- 시니어 모드 7페이지 다크 + 4해상도 검증
- API 실패 3종 (network/timeout/server) 시뮬레이션 + 재시도 작동
- 느린 네트워크 8초 시뮬레이션 + 결과 페이지 정상 이동
- 모바일 키보드 390x844 / 360x800 검사하기 버튼 viewport 내 표시
- localStorage 4종 키 손상 시뮬레이션 (앱 크래시 0, DOM 260 노드 정상 렌더)
- 모달 자동 트리거 0건 (16페이지 Playwright dialog 검증)
- typecheck + build 통과 (1.80s)

### Migration Notes
- 발표 후 P3 백로그 (회원/계정, 법적 페이지, PWA, Sentry, 백엔드/AI 실배포)

---

## [v1.0.0] — 2026-06-12

### Added

#### Frontend
- 38 routes / 44 components (Figma Make export 기반)
- 핵심 서비스 흐름: SMS·URL·이미지 분석 → 결과 → 신고 → 사례조회
- 시니어 모드 (SeniorHome / SeniorAnalyzer) — 큰글씨·단순UI
- 분석 진행률 페이지 (AnalysisProgress) 및 결과 페이지 (AnalysisResult)
- 관리자 대시보드 페이지 29개 (실서버스 배포 시 제거/분리 필요)
- Mock API 레이어 (`src/lib/api.ts` + `VITE_USE_MOCK`) — 백엔드 연동 시 교체 가능

#### Backend
- FastAPI 기반 REST API
- MySQL 데이터베이스 연동
- URL 후보 검증 테이블 (`url_candidates`)
- API 엔드포인트: `/api/analyze`, `/api/report`, `/api/history`, `/api/sender-lookup`, `/api/case-studies`

#### AI Service
- KcELECTRA 기반 스미싱 탐지 모델
- LangGraph 기반 분석 파이프라인
- RAG (Retrieval-Augmented Generation) 지원
- 어텐션 시각화

#### OCR
- PaddleOCR + CLOVA OCR fallback 파이프라인
- 이미지 기반 스미싱 분석

#### Infrastructure
- Docker Compose 개발 환경 (`docker-compose.dev.yml`)
- Prometheus 모니터링 설정
- GitHub Actions CI/CD (`deploy`, `test_deploy` 브랜치)
- NCP (Naver Cloud Platform) 배포 자동화

### Verified

- 시연 동선 검증 완료 (중간 발표 기준)
- 시니어 모드 포커스 그룹 테스트

### Docs

- `IMPLEMENTATION_PLAN.md` — 구현 계획
- `PROJECT_REVIEW.md` — 프로젝트 리뷰 (844줄)
- `SERVICE_DESIGN.md` — 서비스 설계 (1155줄)
- `ENHANCEMENT_ROADMAP.md` — 개선 로드맵
- `PROJECT_QA_REPORT.md` — 발표 Q&A 리포트

### Migration Notes

- `web_mvp/` 폴더 삭제 — 정식 프론트엔드는 `frontend/` 사용
- CI/CD 경로 `frontend/web_mvp/` → `frontend/` 로迁移