# Deploy Documentation

이 폴더는 실제 서비스 코드가 아니라 AI 모델 배포, 모델 서빙, `ai_service` 연동 구조를 정리하기 위한 설계 문서와 예시 파일을 담는다.

현재 `frontend_python`, `backend`, `ai_service`, 모델 학습이 모두 진행 중이므로 이 단계에서는 실제 백엔드나 실제 모델에 직접 연결하지 않는다. 대신 mock-first 방식으로 API 형태와 배포 구조를 먼저 고정한다.

최종 목표는 `ai_service`가 Hugging Face Inference Endpoint를 직접 감싸는 FastAPI wrapper 역할을 하는 구조다. 백엔드는 `ai_service`의 `/analyze` API만 호출하고, `ai_service`는 Encoder Endpoint와 Decoder Endpoint 호출 결과를 서비스 응답 형식으로 정규화한다.

## Scope

- `deploy/` 내부 문서 및 예시 파일 작성
- mock mode 기준 API contract 정리
- Hugging Face Endpoint 전환을 위한 환경변수와 체크리스트 정리
- Docker/docker-compose 적용 방향 초안 정리

## Out of Scope

- 기존 `frontend_python/`, `backend/`, `ai_service/` 코드 수정
- 실제 모델 학습 코드 작성
- 실제 Hugging Face Endpoint 생성
- 실제 DB 연결
- 실제 토큰, 비밀번호, secret 작성

## Security Rule

이 폴더에는 실제 민감정보를 절대 작성하지 않는다.

- 실제 `HF_TOKEN` 금지
- 실제 DB 비밀번호 금지
- 실제 운영 endpoint secret 금지
- `.env` 파일 대신 `.env.example`만 사용

