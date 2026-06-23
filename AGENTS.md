# AGENTS.md

> AI 에이전트(Mavis / opencode / codex / claude code 등)가 이 레포 작업할 때 따라야 할 규칙.
> 이 파일은 **프로젝트 한정**. 다른 레포에는 적용하지 말 것.

## 기본 정보

- **프로젝트**: NewBiz Shield — AI 기반 스미싱/피싱 탐지 웹앱 (kdt-ai-2-team3-advanced)
- **메인 브랜치**: `main`
- **PR 워크플로우**: GitHub Pull Request (front-end → openLeeWorld 리뷰)

## 코드 변경 규칙

### 1. PR 설명은 8섹션 템플릿 사용

- 자세한 형식: [.github/pull_request_template.md](.github/pull_request_template.md) 참조
- **순서 고정**: 요약 → 작업 내용 → 걸린 시간 → 리뷰 요청 → 고민한 점 → 테스트 실행 → 참고사항 → 시각 자료
- **발표 직전 PR**: 4섹션 (리뷰 요청) 에 "지금 경량화 중이라 백엔드 배포는 필수가 아님" 같은 양보 표현 OK
- **이모지**: 본문/코멘트/PR 제목 = 0개. 단 6섹션 (테스트 실행 여부) 의 👍/🙅/🤯 이모지는 원본 형식 보존.

### 2. 커밋 메시지 / PR 제목 톤

- "우리 추천", "강력 권장", "의견 있으시면 코멘트 부탁드립니다" 식 collaborative
- "절대 XXX", "불가", "양보 불가" 식 dictatorial 금지
- 예시: `feat: VT verdict 카드 UI 추가` (O) / `절대 추가해야 함` (X)

### 3. PR 자동 커밋/PR 금지

- AI 에이전트가 사용자 대신 git commit / push / PR 생성 X
- 사용자가 명시적으로 "자동으로 해" 라고 하기 전까지 절대 금지
- 작업 후 보고만: 변경 파일 / 검증 결과 / 다음 단계

## 코딩 규칙

### 4. 중국어 / 일본어 한자 사용 금지

- 이 프로젝트는 한국어 + 영문 + 숫자만 사용
- `rg '[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]'` (또는 python regex) 로 검색해서 0건 확인
- 발견 시 한국어로 교체 (예: `候选` → `후보`, `链接` → `링크`, `フィッシング` → `피싱`)

### 5. 잔재 typecheck / lint 에러는 함께 픽스

- 발표/마감 직전이면 build 깨진 상태로 두면 안 됨
- 1줄짜리 픽스 (예: `api.sender` → `api.lookupSender`) 는 같이 처리
- 거대한 리팩토링은 손대지 말 것 (안정 > 깔끔)

### 6. 검증 3종 모두 통과해야 보고

- `npm run typecheck` — 0 errors
- `npm run lint` — 0 warnings (max-warnings 0일 때)
- `npm run build` — `✓ built in Xs` 확인
- Python 백엔드 동시 변경 시 `python -c "import ast; ast.parse(...)"` 로 syntax 검증

## 작업 패턴

### 7. 작은 단위로 끊기

- 한 번에 5~6개 파일 이내로 변경
- 작업 끝나면 검증 한 번에 통과시키고 보고
- "작업 → 검증 → 보고" 사이클을 짧게 반복

### 8. 외부 API 데이터는 프론트 직접 호출 X

- VirusTotal 같은 외부 API는 백엔드가 join 해서 프론트에 전달
- 프론트에서 직접 fetch 하면 API key 노출 + rate limit + CORS 문제
- 워커 패턴 (주기적 외부 API 호출 + DB 저장) 권장

### 9. PR 작성 전 확인

- [ ] PR 설명 8섹션 채웠는가?
- [ ] 시각 자료 (스크린샷) 첨부했는가?
- [ ] 검증 3종 통과했는가?
- [ ] 중국어/한자 0건인가?
- [ ] `main` 브랜치와 충돌 0인가? (`git log --all --oneline -- <file>` 로 특정 파일 누가 건드렸는지 확인)

## 모노레포 구조

```txt

├── frontend/            # React + Vite + TypeScript 웹 화면
├── backend/             # FastAPI + SQLAlchemy + MySQL API
├── ai_service/          # LangGraph, RAG, 모델 실험과 로컬 검증
├── ai_service_deploy/   # Modal 기반 LLM/RAG 배포 코드
├── encoder_retraining/  # 재학습, 모델 비교, 승격 자동화
├── datatest/            # 데이터 수집과 Cleanlab 품질 점검
├── prometheus/          # 모니터링 설정
├── load_tests/          # Locust 부하 테스트
└── e2e_tests/           # E2E 테스트
```

## 참고 문서

- [README.md](README.md) — 프로젝트 개요와 실행 순서
- [backend/README.md](backend/README.md) — 백엔드 API와 배포 안내
- [frontend/README.md](frontend/README.md) — 프론트엔드 개발 안내
- [encoder_retraining/README.md](encoder_retraining/README.md) — 재학습 및 승격 파이프라인
