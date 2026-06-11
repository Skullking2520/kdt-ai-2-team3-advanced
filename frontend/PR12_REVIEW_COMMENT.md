## 리뷰 코멘트 (PR #12 - backend-core)

### 1. 엔드포인트 경로 불일치 (BLOCKING)

`backend/src/backend/api/predict.py`의 prefix가 `/api/predict`인데, 우리 프론트 API Contract(`src/lib/api.ts` / `types/api.ts`)에서는 `/api/analyze`로 합의되어 있습니다. 머지하면 분석 호출이 404로 떨어집니다.

- **옵션 A**: 백엔드에서 `/api/analyze`로 변경
- **옵션 B**: 프론트에서 `/api/predict`로 변경 (단, Mock도 같이 수정 필요)

협의 부탁드립니다 — 우리쪽 일관성은 `/api/analyze`가 더 자연스러워 보입니다.

### 2. 응답 스키마 필드 누락 (BLOCKING)

`PredictResponse`가 단일 모델로 통합되어 있는데, 우리 프론트는 SMS/URL/IMAGE 3종 Union으로 분기합니다 (`types/api.ts` line 90~110). 현재 백엔드 응답에 다음 필드들이 없습니다:

- `senderNumber` (SMS 결과에서 발신번호 누락)
- `urlDetails` (URL 결과의 도메인/SSL/국가/유사도메인 등)
- `ocrText`, `imageId` (IMAGE 결과의 OCR 텍스트/이미지 식별자)
- `damageScenario` (high/medium 위험도일 때 피해 시나리오)

이 필드들 없이 머지하면 Analyzer, URLAnalyzer, ImageAnalyzer, AnalysisResult, result/* 카드 6종이 깨집니다.

### 3. OCR 분리 여부 확인

`PredictRequest`에 `imageId` 필드가 없고, OCR도 `/api/predict` 안에 통합되어 있는 것 같습니다. 우리 Contract는 `/api/ocr`를 별도 엔드포인트로 합의했고, 결과 페이지에서 `imageId`로 분석 흐름이 이어지도록 설계되어 있습니다. 두 가지로 갈릴 수 있는데 확인 부탁드립니다.

### 4. 누락된 엔드포인트 (HIGH)

우리 Contract는 아래 6개를 합의했는데 이 PR에는 보이지 않습니다. 별도 PR 예정인지, 아니면 이 PR에 포함 예정인지 알려주세요:

- `GET /api/history` / `GET /api/history/{id}` (검사 이력)
- `GET /api/cases` / `GET /api/cases/{id}` (사례 조회)
- `POST /api/feedback` (피드백)
- `POST /api/share` (공유)
- `GET /api/jobs/{jobId}` (비동기 작업 폴링)

### 5. 환경변수 / CORS

- `VITE_API_BASE_URL`이 `http://localhost:8000`로 프론트에 설정되어 있어, 백엔드 기본 포트와 일치합니다. OK.
- CORS에 `http://localhost:5173`, `https://smishing-detect-kdt2.cloud` 포함되어 있어 OK.
- `ADMIN_API_KEY`는 백엔드 전용이고 프론트의 `VITE_ADMIN_PASSWORD`와 별개로 보이는데, 이 의도가 맞는지 확인 부탁드립니다.

### 6. PR 크기 관련 (참고)

이 PR이 192개 파일 / +30K 라인이라 한 번에 리뷰하기 어렵습니다. 다음 백엔드 PR은 엔드포인트 단위(예: 분석, 이력, OCR, 사례) 또는 스키마 단위로 쪼개주시면 리뷰 품질이 훨씬 좋아질 것 같습니다. 이건 BLOCKING은 아니고 다음 PR부터 부탁드립니다.

### 7. PR에 스크린샷

연동 시연 흐름이 있는 PR이면 가능하면 라이트/다크 모드, 시니어 모드, 모바일 뷰 스크린샷 한두 장 첨부해주시면 백엔드만 봐도 동작 흐름이 보입니다. (openLeeWorld 코멘트 참고)

---

**머지 전 합의 필요 항목**: 1, 2, 3, 4번. 이 4개 해결되면 프론트에서도 Contract 검증 + 어댑터 코드 작성 들어가겠습니다.
