# 문자안심 체크 웹 MVP

의심 문자를 입력하면 스미싱 위험도, 사칭 유형, 의심 근거, AI 상세 설명을 보여주는 React 기반 웹 MVP입니다. 이 폴더는 팀 저장소의 `frontend/` 아래에 있지만, 실제 구현은 Python이 아니라 `React + Vite + Tailwind CSS` 프론트엔드입니다.

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

현재 `npm run build`는 통과하지만 Vite 번들 크기 경고가 뜰 수 있습니다. 빌드 실패는 아니며, 추후 코드 스플리팅을 적용하면 줄일 수 있습니다.

## 기술 스택

- React 19
- Vite
- Tailwind CSS
- Node.js 20 이상 권장
- 백엔드 API 연동 준비: `/predict`

## 주요 사용자 흐름

1. 사용자가 첫 화면에서 의심 문자를 입력합니다.
2. `검사` 버튼을 누르면 `/predict` API로 요청합니다.
3. 백엔드가 없거나 실패하면 `src/utils/analyzeSmishing.js`의 더미 분석 로직으로 결과를 보여줍니다.
4. 결과 화면에서 위험 점수, 위험 단계, 사칭 유형, 의심 근거, AI 상세 설명을 확인합니다.
5. 결과 화면에서 신고하기, 공유하기, 다시 검사를 실행할 수 있습니다.

## 주요 기능

- 일반 사용자용 검사 화면
- 쉬운모드 검사 화면
- 스미싱 위험 결과 리포트
- 피해사례 페이지
- 신고 안내 페이지
- 예방법 페이지
- 학습 데이터 활용 동의 체크박스
- 백엔드 미연결 시 fallback 분석 로직

## 폴더 구조

```text
src/
  App.jsx                         # 해시 라우팅, 화면 상태, API 호출 흐름
  main.jsx                        # React 앱 진입점
  styles.css                      # Tailwind 및 전역 스타일
  tokens.css                      # 색상/토큰 변수
  components/
    layout/Header.jsx             # 상단 메뉴와 첫 화면 랜딩 영역
    mvp/ui.jsx                    # 공통 카드, 빈 상태, 위험도 UI helper
  pages/
    CheckPage.jsx                 # 문자 입력 화면. 일반/쉬운모드 UI 분기
    ResultPage.jsx                # 결과 리포트 화면
    CasesPage.jsx                 # 피해사례 화면
    ReportPage.jsx                # 신고 안내 화면
    GuidePage.jsx                 # 예방법 화면
  services/
    smishingService.js            # 백엔드 /predict 호출 및 fallback 처리
  utils/
    analyzeSmishing.js            # 모델 미연결 시 더미 분석 로직
    analyzeSmishing.test.js       # 더미 분석 로직 테스트
  data/
    mvpTabs.js                    # 해시 라우트 목록
    staticContent.js              # 피해사례/예방법/붙여넣기 상태 문구
```

## 자주 수정할 파일

- 문구나 첫 화면 UI 수정: `src/components/layout/Header.jsx`, `src/pages/CheckPage.jsx`
- 결과 화면 레이아웃 수정: `src/pages/ResultPage.jsx`
- 피해사례 내용 수정: `src/data/staticContent.js`, `src/pages/CasesPage.jsx`
- 예방법 내용 수정: `src/data/staticContent.js`, `src/pages/GuidePage.jsx`
- 신고 화면 수정: `src/pages/ReportPage.jsx`
- 백엔드 API 주소/응답 처리 수정: `src/services/smishingService.js`
- 더미 분석 규칙 수정: `src/utils/analyzeSmishing.js`

## 백엔드 API 연결

기본 요청 주소는 `/predict`입니다. Vite 개발 서버에서 별도 백엔드를 직접 지정하려면 `frontend/web_mvp/.env.local`을 만들고 아래처럼 설정합니다.

```bash
VITE_SMISHING_API_URL=http://localhost:8000/predict
```

프론트 요청 형식:

```json
{
  "message": "사용자가 입력한 문자",
  "allowTrainingUse": true
}
```

프론트가 기대하는 응답 형식:

```json
{
  "riskScore": 86,
  "riskLevel": "위험",
  "impersonationType": "가족 사칭형",
  "suspiciousEvidence": ["긴급 송금 요구", "확인되지 않은 링크 포함"],
  "recommendedActions": [
    "링크를 누르지 마세요",
    "기존 연락처로 가족에게 확인하세요"
  ],
  "familyCheckMessage": "이 문자 진짜인지 확인해줄래?",
  "explanation": "이 문자는 가족을 사칭해 긴급한 상황을 만들고 송금을 유도하는 전형적인 스미싱 패턴과 유사합니다."
}
```

응답 필드가 빠진 경우 `src/services/smishingService.js`에서 더미 분석 결과를 fallback으로 채워 화면 깨짐을 줄입니다.

### 백엔드 장애와 fallback 표시

`/predict`가 500 오류를 반환하거나, 네트워크 오류가 발생하거나, 유효하지 않은 JSON을 반환하면 프론트는 임시 규칙 기반 분석 결과를 표시합니다. 이때 결과 화면에는 `백엔드 분석 응답을 받지 못해 임시 규칙 기반 분석 결과를 표시합니다` 안내가 함께 노출됩니다. 백엔드 장애를 정상 모델 결과처럼 숨기지 않기 위한 처리입니다.

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
- 공식 앱, 공식 홈페이지, 대표 고객센터처럼 사용자가 직접 확인 가능한 경로를 안내합니다.
- AI 상세 설명은 참고 설명이며 최종 판정처럼 단정하지 않습니다.

## 흔한 문제

### `vite: command not found`

의존성이 설치되지 않은 상태입니다.

```bash
npm install
```

### 포트가 이미 사용 중일 때

Vite가 자동으로 다른 포트를 안내합니다. 터미널에 표시된 주소를 열면 됩니다.

### `/predict` 요청이 실패할 때

백엔드가 아직 연결되지 않은 상태일 수 있습니다. 이 경우 프론트는 더미 분석 로직으로 결과를 보여줍니다. 실제 백엔드 연결 시 `.env.local`의 `VITE_SMISHING_API_URL` 값을 확인하세요.
