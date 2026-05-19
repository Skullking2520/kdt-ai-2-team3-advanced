# 피싱/스미싱 문자 판별 프로젝트

## 1. 프로젝트 개요

본 프로젝트는 사용자가 입력한 문자 메시지를 분석하여 스미싱 위험 여부를 판단하고, 의심 근거와 대응 안내를 제공하는 서비스입니다.

사용자는 문자 내용을 입력하고, 선택적으로 발신 전화번호를 함께 입력할 수 있습니다. 서비스는 백엔드의 정적 패턴 검사와 Hugging Face에 배포된 AI 모델 추론 결과를 바탕으로 문자 메시지의 위험도를 판단합니다.

AI 추론은 다음 두 모델 흐름을 기준으로 합니다.

- Encoder: KcELECTRA 기반 스미싱/정상 분류 모델
- Decoder: Qwen 계열 설명 생성 모델

현재 모델 추론은 `deploy/` 폴더의 FastAPI wrapper를 통해 Hugging Face Dedicated Inference Endpoint와 연동하는 구조입니다.

---

## 2. 서비스 흐름

전체 목표 흐름은 다음과 같습니다.

```text
Frontend
→ Backend API
→ Static pattern pre-filtering
→ Deploy FastAPI Wrapper
→ Hugging Face Encoder Endpoint
→ Hugging Face Decoder Endpoint
→ Backend response normalization
→ DB logging
→ Frontend result page
```

역할을 나누면 다음과 같습니다.

- Frontend: 문자 입력, 결과 화면, 신고 안내 화면
- Backend: `/predict` API, 정적 패턴 검사, DB 저장, frontend 응답 형식 변환
- Deploy Wrapper: Hugging Face 모델 endpoint 호출, 모델 응답 정규화
- AI/Modeling: 모델 학습, 평가, Hugging Face 업로드
- DB: 정적 패턴, 분석 로그, 신고 기록 저장

---

## 3. 주요 기능

- 문자 메시지 기반 스미싱 위험도 분석
- URL, 전화번호, 금액 표현 등 의심 특징 추출
- Encoder 모델 기반 `normal` / `phishing` 분류
- Decoder 모델 기반 판단 이유 생성
- 위험도, 의심 근거, 추천 행동 표시
- 신고 안내 페이지 제공
- 정적 패턴 기반 사전 필터링 구조
- 스미싱 의심 문자 및 전화번호 신고 기록 저장 구조
- Hugging Face Endpoint 기반 모델 서빙

---

## 4. 기술 스택

### Frontend

- React
- Vite
- Tailwind CSS
- JavaScript

### Backend

- Python
- FastAPI
- SQLAlchemy
- MySQL
- Pydantic
- uv

### AI / Modeling

- PyTorch
- Transformers
- KcELECTRA
- Qwen
- Optuna
- pandas
- scikit-learn
- Weights & Biases

### Deployment Wrapper

- FastAPI
- httpx
- Docker
- Hugging Face Dedicated Inference Endpoint

---

## 5. 프로젝트 구조

```text
.
├── frontend/              # React/Vite/Tailwind 기반 웹 MVP
├── backend/               # FastAPI backend, DB model, /predict API
├── ai_service/            # 모델 학습, 평가, inference 실험 영역
├── deploy/                # Hugging Face endpoint 연동용 FastAPI wrapper
├── docs/                  # 프로젝트 문서
├── infra/                 # 인프라 관련 파일
├── e2e_tests/             # E2E 테스트 리소스
├── load_tests/            # 부하 테스트 리소스
├── nginx/                 # Nginx 설정
├── .github/               # GitHub issue/PR template, workflow
├── docker-compose.yml     # 서비스 배포용 compose
└── README.md
```

### `frontend/`

사용자 화면을 담당합니다.

주요 역할:

- 문자 입력 UI
- 분석 결과 표시
- 위험도, 의심 근거, AI 설명 표시
- 신고 안내 페이지
- 백엔드 장애 시 fallback 표시

자세한 내용은 [`frontend/README.md`](frontend/README.md)를 참고합니다.

### `backend/`

서비스 API와 DB 연동을 담당합니다.

주요 역할:

- Frontend의 `/predict` 요청 처리
- 정적 패턴 pre-filtering
- Deploy wrapper `/analyze` 호출
- AI 분석 결과를 frontend 응답 형식으로 변환
- MySQL 기반 로그/패턴/신고 데이터 저장 구조 관리

현재 backend에는 `static_patterns`, `smishing_logs`, `model_info`, `inference_logs` 등의 SQLAlchemy 모델과 MySQL 개발용 compose가 포함되어 있습니다.

자세한 내용은 [`backend/README.md`](backend/README.md)를 참고합니다.

### `ai_service/`

모델링 담당 영역입니다.

주요 역할:

- Encoder 모델 학습 및 평가
- Decoder 설명 생성 실험
- 전처리 실험
- 모델 inference prototype 관리

실제 서비스용 endpoint wrapper는 `ai_service/`가 아니라 `deploy/`에서 관리합니다.

### `deploy/`

Hugging Face 모델 배포 연동을 담당합니다.

주요 역할:

- FastAPI 기반 deploy wrapper 제공
- Backend가 호출할 `POST /analyze` API 제공
- Encoder Endpoint 호출
- Decoder Endpoint 호출
- 모델 응답 정규화
- Docker 실행 환경 제공
- 개발/검증용 mock mode 제공

자세한 내용은 [`deploy/README.md`](deploy/README.md)를 참고합니다.

---

## 6. AI 모델 연동 구조

현재 실제 모델 연동 방향은 다음과 같습니다.

```text
Backend
→ POST /analyze
→ Deploy FastAPI Wrapper
→ Encoder Dedicated Inference Endpoint
→ Decoder Dedicated Inference Endpoint
→ Normalized response
→ Backend
```

### Encoder

- 모델: KcELECTRA 기반 스미싱 분류 모델
- 역할: 문자 메시지를 `normal` 또는 `phishing`으로 분류
- 출력: label, confidence

### Decoder

- 모델: Qwen 계열 설명 생성 모델
- 역할: phishing으로 판단된 문자에 대해 사용자에게 보여줄 설명 생성
- 출력: reason

### Deploy Wrapper Response 예시

```json
{
  "success": true,
  "label": "phishing",
  "confidence": 0.92,
  "reason": "외부 링크를 통해 사용자를 피싱 사이트로 유도할 가능성이 있습니다.",
  "features": ["외부 링크 포함"],
  "risk_level": "위험 높음",
  "score": 92,
  "encoder_model_id": "kdt-2-team4-newbiz/kcelectra-smishing-classifier",
  "encoder_model_version": "v1.0.0",
  "decoder_model_id": "Qwen/Qwen3-1.7B",
  "decoder_model_version": "v1.0.0",
  "serving_mode": "hf_endpoint"
}
```

자세한 API contract는 [`deploy/api_contract.md`](deploy/api_contract.md)를 참고합니다.

---

## 7. 데이터 및 전처리

모델 학습에는 문자 본문과 라벨이 포함된 데이터셋을 사용합니다.

예시:

| text                                                      | label |
| --------------------------------------------------------- | ----- |
| 배송 주소 확인이 필요합니다. 아래 링크를 눌러 확인하세요. | 1     |
| 오늘 저녁에 밥 먹을래?                                   | 0     |

Encoder 모델은 학습 시 전처리된 텍스트를 기준으로 학습되었습니다. 따라서 deploy wrapper는 Encoder Endpoint 호출 전에 모델 입력 정규화를 수행합니다.

예시:

- `[Web발신]` 제거
- URL → `<URL>`
- 8자리 이상 전화번호 → `<PHONE>`
- 금액 표현 → `<MONEY>`
- 공백 및 일부 특수문자 정리

Backend의 URL/static pattern pre-filtering과 deploy wrapper의 전처리는 역할이 다릅니다.

- Backend pre-filtering: 서비스 정책, 정적 패턴 검사, DB 저장 판단
- Deploy preprocessing: 모델 학습 입력 형식에 맞추기 위한 모델 입력 정규화

---

## 8. 실행 방법

### Frontend 실행

```bash
cd frontend/web_mvp
npm install
npm run dev
```

기본 백엔드 API는 `/predict`입니다.

다른 백엔드 주소를 사용할 경우 `frontend/web_mvp/.env.local`에 다음 값을 설정합니다.

```bash
VITE_SMISHING_API_URL=http://localhost:8000/predict
```

### Backend 실행

루트에서 실행:

```bash
uv run --package backend fastapi dev backend/src/backend/main.py
```

또는 backend 폴더에서 실행:

```bash
cd backend
uv run fastapi dev src/backend/main.py
```

### Backend 개발용 MySQL 실행

루트 `.env`에 MySQL 관련 값을 설정한 뒤 실행합니다.

```bash
docker compose --env-file .env -f ./backend/docker-compose.dev.yml up -d
```

중지:

```bash
docker compose -f ./backend/docker-compose.dev.yml down
```

### Deploy Wrapper 실행

```bash
cd deploy
python -m pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

Health check:

```bash
curl http://localhost:8001/health
```

Analyze test:

```bash
curl -X POST http://localhost:8001/analyze \
  -H "Content-Type: application/json" \
  -d '{"text":"배송 주소 오류로 반송 예정입니다. http://fake.kr/track"}'
```

Docker 실행:

```bash
cd deploy
docker compose -f docker-compose.example.yml config
docker compose -f docker-compose.example.yml up --build
```

---

## 9. 환경 변수 관리

실제 secret 값은 Git에 커밋하지 않습니다.

레포에는 `.env.example`만 포함하고, 실제 `.env`는 각자 로컬 또는 배포 환경에서 관리합니다.

민감정보 예시:

```text
HF_TOKEN=
ENCODER_ENDPOINT_URL=
DECODER_ENDPOINT_URL=
MYSQL_ROOT_PASSWORD=
MYSQL_DATABASE=
MYSQL_USER=
MYSQL_PASSWORD=
DATABASE_URL=
```

주의:

- 실제 Hugging Face token을 Git에 올리지 않습니다.
- 실제 endpoint URL은 문서나 `.env.example`에 직접 쓰지 않습니다.
- DB password는 secret manager 또는 로컬 `.env`로만 관리합니다.

---

## 10. 테스트

### Deploy Wrapper

```bash
python -m py_compile deploy/app/main.py deploy/app/__init__.py
python -m unittest deploy.tests.test_normalization
python -m ruff check deploy
git diff --check
docker compose -f deploy/docker-compose.example.yml config
```

### Frontend

```bash
cd frontend/web_mvp
npm test
npm run build
```

각 영역별 자세한 검증 방법은 해당 폴더의 README를 참고합니다.

---

## 11. 현재 상태

현재 레포는 다음 구조를 기준으로 개발 중입니다.

- Frontend: React/Vite 기반 웹 MVP
- Backend: FastAPI 기반 `/predict` API와 DB 모델 구조
- Deploy: Hugging Face Encoder/Decoder Endpoint 연동 wrapper
- AI Service: 모델 학습/평가/실험 영역

실제 서비스 통합 기준으로는 다음 연결을 목표로 합니다.

```text
Frontend /predict
→ Backend
→ Deploy /analyze
→ Hugging Face Encoder/Decoder Endpoint
→ Backend DB/logging
→ Frontend 결과 화면
```

---

## 12. 팀원 역할

| 이름 | 역할 |
| --- | --- |
| 이기필 | 팀장, 백엔드 API, 클라우드 배포 관리 |
| 이동건 | 데이터 전처리, 모델 입력 정제 |
| 심현서, 현준수, 남주원 | 모델링, 하이퍼파라미터 튜닝, 모델 성능 평가 |
| 성화섭 | 프론트엔드 UI/UX 및 웹 구현 |
| 공통 | 데이터 수집, 발표 자료, 최종 산출물 정리 |

---

## 13. 기여 규칙

- 본인 담당 영역을 확인한 뒤 작업합니다.
- 실제 secret 값은 커밋하지 않습니다.
- `.env` 대신 `.env.example`만 문서화합니다.
- 다른 담당 영역을 수정해야 할 경우 담당자와 먼저 합의합니다.
- PR 작성 시 변경 내용과 테스트 여부를 명확히 작성합니다.

PR 작성 양식은 `.github/pull_request_template.md`를 따릅니다.

---

## 14. 참고 문서

- [`frontend/README.md`](frontend/README.md)
- [`frontend/web_mvp/README.md`](frontend/web_mvp/README.md)
- [`backend/README.md`](backend/README.md)
- [`deploy/README.md`](deploy/README.md)
- [`deploy/api_contract.md`](deploy/api_contract.md)
- [`deploy/hf_endpoint_checklist.md`](deploy/hf_endpoint_checklist.md)
- [`docs/MONOREPO.md`](docs/MONOREPO.md)
