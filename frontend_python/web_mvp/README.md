# 문자안심 체크

의심 문자를 붙여넣으면 AI가 스미싱 위험도, 사칭 유형, 의심 근거, 권장 행동을 알려주는 웹사이트입니다. 첫 화면에서 바로 문자를 검사하고, 결과 화면에서 핵심 판단을 한눈에 확인할 수 있습니다.

## 기술 스택

- HTML/CSS/JavaScript 기반 웹 프론트엔드
- React + Vite
- Tailwind CSS 반응형 UI
- npm 또는 pnpm 실행 지원
- 백엔드 `/predict` API 연동 준비

## 주요 기능

- 문자 전체 입력 후 스미싱 위험 검사
- 붙여넣기 버튼과 직접 입력 지원
- 개인정보 제거 후 학습 데이터 활용 동의 체크박스
- 위험 점수, 위험 단계, 사칭 유형, 의심 근거 표시
- AI 상세 설명과 결과 안내 표시
- 가족/보호자에게 보낼 확인 문구 복사
- 최근 피해 사례, 신고, 예방법 페이지

## 실행

npm 사용:

```bash
npm install
npm run dev
```

pnpm 사용:

```bash
pnpm install
pnpm dev
```

검증:

```bash
npm test
npm run build
```

또는:

```bash
pnpm test
pnpm build
```

## 화면 구조

- `src/components/layout/Header.jsx`: 첫 랜딩 화면과 상단 네비게이션
- `src/pages/CheckPage.jsx`: 문자 검사 입력 화면
- `src/pages/ResultPage.jsx`: 분석 결과 화면
- `src/pages/CasesPage.jsx`: 최근 피해 사례 화면
- `src/pages/ReportPage.jsx`: 의심 문자 신고 화면
- `src/pages/GuidePage.jsx`: 스미싱 예방법 화면
- `src/services/smishingService.js`: 백엔드 API 연동 지점
- `src/utils/analyzeSmishing.js`: 백엔드 미연결 시 사용하는 더미 분석

직접 접근 가능한 해시 경로:

- `#check` 검사하기
- `#result` 결과 보기
- `#cases` 피해 사례
- `#report` 신고하기
- `#guide` 예방법

## 백엔드 API 계약

프론트는 기본적으로 `/predict`로 요청합니다. 다른 주소를 쓰려면 `.env.local`에 `VITE_SMISHING_API_URL`을 지정하면 됩니다.

요청:

```json
{
  "message": "사용자가 입력한 문자",
  "allowTrainingUse": true
}
```

응답:

```json
{
  "riskScore": 86,
  "riskLevel": "위험",
  "impersonationType": "가족 사칭형",
  "suspiciousEvidence": ["긴급 송금 요구", "확인되지 않은 링크 포함"],
  "recommendedActions": ["링크를 누르지 마세요", "기존 연락처로 가족에게 확인하세요"],
  "familyCheckMessage": "이 문자 진짜인지 확인해줄래?",
  "explanation": "이 문자는 가족을 사칭해 긴급한 상황을 만들고 송금을 유도하는 전형적인 스미싱 패턴과 유사합니다."
}
```

## 안전 문구 기준

- 낮은 위험도에서도 `완전히 안전합니다`라고 표현하지 않습니다.
- 문자 안의 링크나 문자에 적힌 번호 사용을 권하지 않습니다.
- 공식 앱, 공식 홈페이지, 대표 고객센터 번호처럼 사용자가 별도로 확인 가능한 경로를 안내합니다.
- AI 상세 설명은 참고 설명이며 최종 판정처럼 단정하지 않습니다.
