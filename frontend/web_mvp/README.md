# 문자안심 체크 웹 MVP

의심 문자를 입력하면 백엔드 모델의 분석 결과를 받아 위험도, 점수, 탐지 분류, 의심 근거, 권장 조치를 보여주는 React 기반 웹 MVP입니다. 이 폴더는 팀 저장소의 `frontend/web_mvp` 프론트엔드 구현입니다.

## 빠른 실행

```bash
cd frontend/web_mvp
npm install
npm run dev
```

브라우저에서 Vite가 안내하는 주소를 열면 됩니다. 보통 `http://localhost:5173` 또는 이미 포트가 사용 중이면 다른 517x 포트가 표시됩니다.

## 검증 명령어

```bash
npm test
npm run build
```

## 기술 스택

- React 19
- Vite
- Tailwind CSS v3
- Node.js 20 이상 권장
- 백엔드 API: `POST /predict`

## 주요 사용자 흐름

1. 사용자가 첫 화면에서 의심 문자를 입력하거나 예시 메시지를 선택합니다.
2. `분석하기` 버튼을 누르면 `/predict` API로 요청합니다.
3. 백엔드 응답을 `smishingService.js`에서 화면용 필드로 정규화합니다.
4. 결과 화면에서 위험도, 스미싱 확률 점수, 탐지 분류, 의심 근거, 권장 조치를 확인합니다.
5. 결과가 맞는지 피드백하거나, 신고하기/공유하기/다시 검사를 실행할 수 있습니다.

## 중요한 구현 원칙

- 프론트는 스미싱 판정, 점수 계산, 유형 판단을 하지 않습니다.
- API 실패 시 프론트 규칙 기반 분석으로 대체하지 않고 에러 문구를 표시합니다.
- API 경로는 현재 `/predict` 기준입니다. `/api/v1/smishing/analyze`로 바꾸지 않습니다.
- 화면 문구와 예시 메시지는 `src/constants.js`에서 관리합니다.

## 폴더 구조

```text
src/
  App.jsx                         # 해시 라우팅, 화면 상태, API 호출 흐름
  constants.js                    # 화면 문구, 예시 메시지, 위험도 라벨 상수
  main.jsx                        # React 앱 진입점
  styles.css                      # Tailwind 및 전역 스타일
  tokens.css                      # 색상/토큰 변수
  components/
    layout/Header.jsx             # 상단 메뉴와 첫 화면 랜딩 영역
    mvp/ui.jsx                    # 공통 카드, 빈 상태, 위험도 UI helper
  pages/
    CheckPage.jsx                 # 문자 입력 화면
    ResultPage.jsx                # 결과 리포트 화면과 피드백 UI
    CasesPage.jsx                 # 피해사례 화면
    ReportPage.jsx                # 신고 안내 화면
    GuidePage.jsx                 # 예방법 화면
  services/
    smishingService.js            # 백엔드 /predict 호출 및 응답 정규화
  utils/
    API_URL.js                    # 백엔드 기본 주소와 /predict URL
    analyzeSmishing.js            # 예전 fallback 방지를 위해 호출 시 에러를 던지는 보호 함수
    analyzeSmishing.test.js       # fallback 비활성화 및 예시 메시지 테스트
  data/
    mvpTabs.js                    # 해시 라우트 목록
    staticContent.js              # 피해사례/예방법/붙여넣기 상태 문구
```

## 자주 수정할 파일

- 입력 화면 문구/예시 메시지: `src/constants.js`, `src/pages/CheckPage.jsx`
- 결과 화면 레이아웃: `src/pages/ResultPage.jsx`
- 위험도 색상/문구: `src/components/mvp/ui.jsx`, `src/constants.js`
- 신고 유형: `src/constants.js`, `src/pages/ReportPage.jsx`
- 백엔드 응답 필드 매핑: `src/services/smishingService.js`

## 백엔드 API 연결

기본 요청 주소는 `/predict`입니다. 개발 환경에서 별도 백엔드를 직접 지정하려면 `frontend/web_mvp/.env.local`을 만들고 아래처럼 설정합니다.

```bash
VITE_SMISHING_HOME_URL=http://localhost:8000
```

프론트 요청 형식:

```json
{
  "message": "사용자가 입력한 문자",
  "allowTrainingUse": true
}
```

프론트가 우선 기대하는 응답 형식:

```json
{
  "analysisId": "analysis-001",
  "riskLevel": "주의",
  "riskScore": 72,
  "summary": "택배 안내처럼 보이지만 주소 확인 링크가 포함되어 주의가 필요합니다.",
  "categories": ["택배 사칭형"],
  "reasons": ["배송지 오류를 이유로 링크 접속을 유도합니다."],
  "recommendations": [
    "문자 안의 링크를 열지 말고 공식 앱에서 배송 상태를 확인하세요."
  ]
}
```

기존 백엔드 응답과의 호환을 위해 `smishingService.js`는 일부 예전 필드도 화면용 필드로 변환합니다.

- `risk_score` 또는 `score` -> `riskScore`
- `risk_level` -> `riskLevel`
- `explanation` -> `summary`
- `impersonationType` -> `categories`
- `suspiciousEvidence` -> `reasons`
- `recommendedActions` -> `recommendations`

## 백엔드 장애 처리

`/predict`가 실패하거나 유효하지 않은 JSON을 반환하면 프론트는 결과 화면으로 이동하지 않습니다. 입력 화면에 아래 문구를 보여줍니다.

```text
분석 서버에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.
```

## 화면 경로

이 MVP는 React Router 대신 URL hash를 사용합니다.

- `#check`: 검사하기
- `#result`: 결과 보기. 검사 결과가 없으면 검사 화면으로 안내합니다.
- `#cases`: 피해사례
- `#report`: 신고하기
- `#guide`: 예방법

## 안전 문구 기준

- 낮은 위험도에서도 `완전히 안전합니다`라고 표현하지 않습니다.
- 문자 안의 링크나 문자에 적힌 번호 사용을 권하지 않습니다.
- 공식 앱, 공식 홈페이지, 대표 고객센터처럼 사용자가 직접 확인 가능한 채널을 안내합니다.
- AI 판단 결과는 완벽하지 않을 수 있다는 안내를 결과 하단에 표시합니다.

## 흔한 문제

### `vite: command not found`

의존성이 설치되지 않은 상태입니다.

```bash
npm install
```

### 포트가 이미 사용 중일 때

Vite가 자동으로 다른 포트를 안내합니다. 터미널에 표시된 주소를 열면 됩니다.

### `/predict` 요청이 실패할 때

백엔드가 실행 중인지, `.env.local`의 `VITE_SMISHING_HOME_URL`이 백엔드 기본 주소를 가리키는지 확인하세요.
