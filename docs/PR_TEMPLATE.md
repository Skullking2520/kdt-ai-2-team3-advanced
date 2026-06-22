# PR 설명 템플릿

> 우리 팀 PR 작성 표준. `docs/PR_TEMPLATE.md` 에서 가져다 쓰면 됨.
> Collaborator(openLeeWorld) 피드백 기반 - 협업 톤, 정직, 약속은 발표 후로 미룸.

## 형식 (8섹션, 순서 고정)

### 1. 요약 (연관 이슈 번호 포함)
- 한 줄 요약 + 연관 이슈 번호
- 예: `Closes #123` / `Refs #45`

### 2. 작업 내용 + 스크린샷
- 변경 사항을 bullet list
- 가능하면 Before/After 스크린샷 첨부 (스크린샷 많을수록 리뷰어 이해 ^)
- 코드 변경 위주면 `git diff` 핵심 부분 캡처

### 3. 실제 걸린 시간
- 솔직한 추정치 (예: "약 2-3시간", "30분")
- 협업 약속 = 정직, 부풀리지 않음

### 4. 리뷰 요청 사항
- 리뷰어가 봐야 할 것 bullet list
- **발표 직전이면**: "지금 경량화/디버깅 중이므로 백엔드에서 꼭 이걸 배포하실 필요는 없어보여요" 같은 양보 표현 OK
- 예시:
  - `ai_service 컨테이너 빌드 및 실행 확인`
  - `docker-compose.dev.yml에서 새 서비스가 정상적으로 올라오는지 확인`
  - `Pinecone 환경 진입 시 page_content가 제대로 채워지는지 확인`

### 5. 작업하며 고민했던 점 (선택)
- 의사결정 근거 - 왜 이 방법 골랐는지
- 예: `Pinecone과 Chroma 간 결과 반환 형식 차이를 맞추기 위해 metadata fallback 로직 보강`
- 협업 톤 - "다른 방법도 있으니 의견 부탁드립니다" 식 권장

### 6. 테스트 실행 여부
이모지 옵션 3개 (하나만 선택):
- `👍 네, 테스트했어요.`
- `🙅 아니요, 필요하지 않아요.`
- `🤯 아니요, 하지만 테스트가 필요해요.`

> PM 메모: 위 이모지 옵션은 openLeeWorld가 제시한 형식 그대로. 우리 규칙 (No emoji) 은 **유저-facing 일반 텍스트**에 적용, **이 PR 템플릿 섹션 자체**는 원본 형식 보존.

### 7. 리뷰 참고사항 (선택)
- 추가 컨텍스트, 환경 변수 의존성, 설정 변경 알림
- 예: `APP_ENV=production 시 Pinecone이 선택되므로 관련 .env 값이 반드시 필요합니다.`

### 8. 시각 자료 (선택)
- 이미지/영상 링크 또는 "없음"
- 스크린샷이 가장 효과적

## 작성 톤 가이드 (협업 우선)

- **이모지 0개** (본문 코멘트/답변/PR 제목/문서 본문 모두)
- 단, **이 템플릿의 "테스트 실행 여부" 섹션**은 원본 형식 보존
- **"우리 추천", "강력 권장", "의견 있으시면 코멘트 부탁드립니다"** 식 collaborative 톤
- **"절대 XXX", "불가", "양보 불가"** 식 dictatorial 톤 금지
- **정직 우선** - 부풀린 숫자/통계 발표자료에서 사용 X
- **약속은 발표 후로 미룸** - "발표 끝나면 정리해서 PR 올릴게요" 식

## 사용 예시 (실제 너 PR #20에 적용하면)

```markdown
## 요약 (연관 이슈 번호 포함)
- Refs #12 (백엔드 PR 머지 이후 frontend 통합)
- 발표 전 마감: UX 안정화 + 실서비스 안정화 (round 4)

## 작업 내용 + 스크린샷
- AnalysisResult 페이지에 AI 모델 정보 카드 추가 (F1 95.51%, 데이터 29,522건, processingTime)
- Mock/Real API 토글 (`VITE_USE_REAL_AI`) - 발표 중 라이브 호출 시연
- VirusTotal 외부 검증 카드 (URL 분석 시 88개 엔진 중 malicious/suspicious 표시)
- 잔재 typecheck 5건 픽스 (SenderLookup, EmptyState, ErrorState, ThreatMap, smsAnalysis)
- (스크린샷 5장 첨부)

## 실제 걸린 시간
- 약 2시간 (작업 1.5h + 검증 0.5h)

## 리뷰 요청 사항
- AnalysisResult.tsx 새 모델 정보 카드의 디자인 검토
- Mock/Real 토글 UI 위치 (모델 정보 카드 하단) 적절성
- VT verdict 카드 표시 우선순위 (위험도 카드 바로 아래가 맞는지)

## 작업하며 고민했던 점
- useMemo/useCallback 적용은 round 5로 분리 - 발표 직전 안정성 우선
- Prettier 도입은 PR #20에서 빼고 별도 PR로 분리 (CI 통합은 별도 라운드)
- Prettier + prettier-plugin-tailwindcss는 한 PR에 묶는 게 좋다고 openLeeWorld 의견 받음

## 테스트 실행 여부
👍 네, 테스트했어요. (npm run typecheck 0 / lint 0 / build OK)

## 리뷰 참고사항
- VITE_USE_MOCK=true가 기본값, VITE_USE_REAL_AI 토글 활성화 시 1회만 진짜 호출
- 발표 데모 안정망: forceReal 실패 시 자동 Mock 폴백
- DB 없이도 Mock으로 모든 결과 표시 가능 (로컬 발표 가능)

## 시각 자료
- AnalysisResult 모델 정보 카드 캡처
- URLAnalyzer VirusTotal 카드 캡처
- SenderLookup 픽스 후 정상 동작 캡처
```

## 주의사항

- 이 템플릿은 **너 프로젝트 한정** (kdt-ai-2-team3-advanced)
- 발표 직전 PR은 "리뷰 요청 사항"에 "지금 경량화 중이라 백엔드 배포는 필수가 아님" 명시 OK
- Collaborator가 템플릿 형식 외 코멘트 단 경우 (예: 코드 inline 지적) - 그건 별도 답변 (PM이 직전 답변 초안 4개 작성해둔 거 참고)
