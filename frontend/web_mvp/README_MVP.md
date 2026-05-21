# 문자안심 체크 구현 메모

문자안심 체크 웹 MVP에서 프론트 담당자가 확인해야 하는 구현 메모입니다. 공통 실행 방법과 API 계약은 `README.md`를 기준으로 보고, 이 문서는 작업 시 주의할 점만 짧게 정리합니다.

## 현재 구현 방향

- 프론트는 스미싱 판정 로직을 실행하지 않습니다.
- 분석 결과는 백엔드 `POST /predict` 응답을 받아 렌더링합니다.
- 백엔드 실패 시 임시 규칙 분석으로 대체하지 않고 입력 화면에 에러를 표시합니다.
- 예시 메시지는 정상 예시 1개, 스미싱 의심 예시 1개입니다.
- 학습 데이터 활용 동의는 기본 체크 상태이며 사용자가 해제할 수 있습니다.

## 주요 파일

- `src/App.jsx`: 화면 전환, 입력 상태, API 호출, 복사/신고 흐름
- `src/constants.js`: 화면 문구, 예시 메시지, 신고 유형, 위험도 문구
- `src/pages/CheckPage.jsx`: 메시지 입력, 붙여넣기, 예시 메시지, 동의 체크박스
- `src/pages/ResultPage.jsx`: API 응답 결과 렌더링, 피드백 UI, 공유/신고 버튼
- `src/services/smishingService.js`: `/predict` 요청과 응답 정규화
- `src/utils/analyzeSmishing.js`: fallback 재사용 방지를 위해 호출 시 에러를 던짐

## 수정 시 주의

- `/predict` 경로를 임의로 바꾸지 않습니다.
- `smishingService.js`에서 백엔드 실패를 숨기지 않습니다.
- `ResultPage.jsx`에 `message.includes` 같은 판정 로직을 넣지 않습니다.
- 문구를 바꿀 때는 가능하면 `src/constants.js`를 먼저 확인합니다.
- zip 파일이나 임시 전달 문서는 커밋하지 않습니다.

## 검증

```bash
cd frontend/web_mvp
npm test
npm run build
```
