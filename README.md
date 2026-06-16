# NewBiz Shield — AI 스미싱/피싱 탐지 서비스

> AI 기반 스미싱·피싱 탐지 웹 애플리케이션
> 입력: SMS / URL / 이미지(OCR) → 위험도·공격유형·탐지근거·피해시나리오·대응가이드 제공

---

## 프로젝트 개요

| | |
|---|---|
| **서비스명** | NewBiz Shield |
| **목적** | 일반 사용자 대상 AI 스미싱/피싱 탐지 및 대응 가이드 |
| **시술** | React 18 + Vite 6 + TypeScript / FastAPI + MySQL / KcELECTRA + LangGraph + RAG |
| **배포** | NCP (Naver Cloud Platform) / GitHub Actions CI/CD |

---

## 모듈 구조

| 디렉토리 | 설명 |
|---|---|
| `frontend/` | React SPA (**19 public routes, 45 components**) — 2026-06-15 기준 |
| `backend/` | FastAPI REST API + MySQL |
| `ai_service/` | KcELECTRA 탐지 모델 + LangGraph 분석 파이프라인 + RAG |
| `deploy_wrapper/` | 배포 스크립트 및 설정 |
| `prometheus/` | 모니터링 설정 |

---

## 로컬 개발

### 전제 조건
- Docker & Docker Compose
- Node.js 20+
- Python 3.11+

### 개발 환경 실행

```bash
# 전체 서비스 (프론트엔드 + 백엔드 + AI)
docker compose -f docker-compose.dev.yml up --build

# 프론트엔드만
cd frontend && npm install && npm run dev

# 백엔드만
cd backend && pip install -r requirements.txt && uvicorn main:app --reload
```

### 환경변수

```bash
cp .env.example .env
# 편집 후 사용
```

---

## 시연 방법

### 시연 동선

1. **SMS 분석**: 분석 페이지에서 스미싱 의심 문자를 입력 → 위험도·공격유형 확인
2. **URL 분석**: URL 입력 → 악성 여부 판정 + 탐지근거
3. **이미지 분석**: 스미싱 스크린샷 이미지 업로드 → OCR + AI 분석
4. **발신번호 조회**: 수상 번호 정보 조회
5. **신고 접수**: 분석 결과를 바탕으로 신고
6. **사례조회**: 유사 사기 수법 사례 검색 (현재 11건)
7. **시니어 모드**: 큰글씨·단순UI로 고령자도 사용 가능
   - SeniorHome 5개 메인 버튼 (문자/이미지/링크/전화번호/신고)
   - SeniorAnalyzer / SeniorImageAnalyzer 큰 글씨 + 다크 테마
8. **관리자 대시보드** (관리자 비밀번호 필요): 모델 성능, 대시보드, 패턴 DB, 보안 감사, 피드백 분석, 설정

자세한 시연 시나리오는 `PROJECT_QA_REPORT.md` 참고.

---

## 빌드 & 배포

### 프론트엔드 빌드

```bash
cd frontend
npm install
npm run build        # dist/ 생성 (1.80s)
npm run typecheck    # 타입 검사
npm run lint         # ESLint 검사
npm run test         # vitest (2개 테스트)
```

### 프론트엔드 라우트 (19 public + 24 admin/dev)

**Public 라우트** (일반 사용자 접근 가능):
- `/` 랜딩, `/analyze` 문자 검사, `/analyze/progress`, `/analyze/result/:id`
- `/senior-home`, `/senior-analyze` (시니어 모드)
- `/url` URL 검사, `/image` 이미지 검사, `/senior-image` (시니어 이미지 검사)
- `/sender` 발신번호 조회, `/history` 검사 이력
- `/cases` 피해 사례, `/trend` 최신 피싱 트렌드
- `/quiz` 스미싱 퀴즈, `/guide` 예방 가이드
- `/report` 신고하기, `/changelog` 변경 이력, `/emergency` 응급 안내

**Admin/Dev 라우트** (관리자 인증 필요, DEV 빌드에서만):
- `/admin` 모델 성능, `/dashboard` 대시보드, `/patterns` 패턴 DB
- `/audit` 보안 감사, `/feedback` 피드백 분석, `/settings` 설정
- 기타 18개 (simulator, live-feed, export, attention, bulk, compare, benchmark 등)

### CI/CD

`deploy` 또는 `test_deploy` 브랜치에 푸시 시 자동 배포:
- 프론트엔드 빌드 → NCP 서버에 배포
- 백엔드 Docker 이미지 빌드 → NCP Container Registry 푸시
- Docker Compose 서비스 재시작

---

## 기여

1. 브랜치 생성: `git checkout -b feature/my-feature`
2. 변경 사항 커밋: `git commit -m "feat: description"`
3. 브랜치 푸시: `git push origin feature/my-feature`
4. Pull Request 생성

### 커밋 컨벤션

```
feat:    새 기능
fix:     버그 수정
docs:    문서 변경
refactor: 코드 리팩토링
chore:   빌드/설정 변경
```

---

## 라이선스

MIT License