# 피싱/스미싱 문자 판별 프로젝트

## 1. 프로젝트 개요

본 프로젝트는 사용자가 입력한 문자 메시지를 분석하여 스미싱 위험 여부를 판단하고, 의심 근거와 대응 안내를 제공하는 서비스입니다.

사용자는 문자 내용을 입력하고, 선택적으로 발신 전화번호를 함께 입력할 수 있습니다. 서비스는 백엔드의 정적 패턴 검사와 Hugging Face에 배포된 AI 모델 추론 결과를 바탕으로 문자 메시지의 위험도를 판단합니다.

AI 추론은 다음 두 모델 흐름을 기준으로 합니다.

- Encoder: KcELECTRA 기반 스미싱/정상 분류 모델
- Decoder: Qwen 계열 설명 생성 모델

현재 모델 추론은 `deploy/` 폴더의 FastAPI wrapper를 통해 Hugging Face Dedicated Inference Endpoint와 연동하는 구조입니다.

---

## 2. 프로젝트 목표

본 프로젝트의 목표는 사용자가 수신한 문자 메시지를 보다 안전하게 확인할 수 있도록 돕는 스미싱 탐지 서비스를 구현하는 것입니다.

구체적인 목표는 다음과 같습니다.

- 문자 메시지 내용을 기반으로 스미싱 위험 여부를 자동 분석합니다.
- URL, 전화번호, 금액 표현, 긴급 표현 등 스미싱 의심 특징을 탐지합니다.
- Encoder 모델을 통해 정상/스미싱 여부를 분류합니다.
- Decoder 모델을 통해 사용자가 이해하기 쉬운 판단 이유를 제공합니다.
- 사용자가 위험 문자를 확인한 뒤 신고 안내 페이지로 이동할 수 있도록 합니다.
- 백엔드에서 정적 패턴 검사와 AI 모델 추론 결과를 함께 활용할 수 있는 구조를 설계합니다.
- 모델 학습, 백엔드, 프론트엔드, 배포 영역을 분리하여 팀 단위 개발이 가능한 모노레포 구조를 구성합니다.
- Hugging Face Endpoint 기반 모델 서빙 구조를 통해 모델 교체와 운영을 쉽게 만듭니다.

---

## 3. 서비스 흐름

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

## 4. 주요 기능

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

## 5. 기술 스택

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

## 6. 프로젝트 구조

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

현재 backend에는 `static_patterns`, `smishing_logs`, `model_info` 등의 SQLAlchemy 모델과 MySQL 개발용 compose가 포함되어 있습니다.

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

## 7. AI 모델 연동 구조

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

## 8. 데이터 및 전처리

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

## 9. 실행 방법

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

## 10. 환경 변수 관리

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

## 11. 테스트

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

## 12. 현재 상태

현재 레포는 다음 구조를 기준으로 개발 중입니다.

- Frontend: React/Vite 기반 웹 MVP 구현
- Backend: FastAPI 기반 `/predict` API와 DB 모델 구조 구현
- Deploy: Hugging Face Encoder/Decoder Endpoint 연동 wrapper 구현
- AI Service: 모델 학습/평가/실험 영역 유지

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

## 13. 팀원 역할

| 이름 | 역할 |
| --- | --- |
| 이기필 | 팀장, 백엔드 API, 클라우드 배포 관리 |
| 이동건 | 데이터 전처리, 모델 입력 정제 |
| 심현서, 현준수, 남주원 | 모델링, 하이퍼파라미터 튜닝, 모델 성능 평가 |
| 성화섭 | 프론트엔드 UI/UX 및 웹 구현 |
| 공통 | 데이터 수집, 발표 자료, 최종 산출물 정리 |

---

## 14. 한계점

본 프로젝트는 교육 목적의 팀 프로젝트이며, 실제 운영 서비스로 사용하기 위해서는 추가적인 검증과 보완이 필요합니다.

현재 또는 예상되는 한계점은 다음과 같습니다.

- 공개된 한국어 스미싱/피싱 문자 데이터셋이 제한적입니다.
- 학습 데이터의 품질과 라벨 정확도에 따라 모델 성능이 크게 달라질 수 있습니다.
- 새로운 유형의 스미싱 문자는 기존 학습 데이터만으로 탐지하기 어려울 수 있습니다.
- URL, 전화번호, 금액 표현 등 규칙 기반 특징은 지속적인 업데이트가 필요합니다.
- 모델이 `normal`로 판단하더라도 실제로 완전히 안전하다고 단정할 수 없습니다.
- 모델이 `phishing`으로 판단하더라도 오탐 가능성이 존재합니다.
- Decoder가 생성하는 설명은 참고용이며, 법적/보안적 최종 판단으로 사용할 수 없습니다.
- Hugging Face Endpoint 상태, cold start, 비용, timeout 등에 따라 응답 속도가 달라질 수 있습니다.
- 실제 서비스 적용 시 개인정보 보호, 보안, 법적 검토가 필요합니다.
- 신고 데이터와 전화번호 저장 시 개인정보 및 민감정보 처리 기준을 명확히 해야 합니다.

---

## 15. 향후 개선 방향

향후 개선 방향은 다음과 같습니다.

### 모델 성능 개선

- 신규 스미싱 사례를 지속적으로 수집하고 라벨링합니다.
- 오탐/미탐 사례를 분석하여 학습 데이터에 반영합니다.
- KcELECTRA Encoder 모델을 주기적으로 재학습합니다.
- class imbalance 완화를 위해 oversampling, focal loss 등 다양한 학습 전략을 비교합니다.
- 모델별 precision, recall, F1-score를 지속적으로 추적합니다.

### 정적 패턴 고도화

- 자주 등장하는 악성 URL, 전화번호, 키워드를 static pattern으로 관리합니다.
- backend pre-filtering 로직을 통해 알려진 위험 패턴은 빠르게 탐지합니다.
- 신규 사기 유형에 맞춰 정규식과 keyword rule을 업데이트합니다.

### 서비스 연동 개선

- Backend `/predict`와 deploy wrapper `/analyze` 연동을 안정화합니다.
- 분석 결과를 DB에 저장하고, 신고 횟수 및 사용자 feedback을 누적합니다.
- Frontend 결과 화면에서 사용자가 이해하기 쉬운 위험도와 근거를 제공합니다.
- 신고 안내 페이지와 실제 신고 기관 정보를 정리합니다.

### MLOps 및 운영 개선

- Hugging Face Hub를 모델 registry로 활용합니다.
- Encoder/Decoder model version을 명확히 관리합니다.
- Endpoint URL과 token은 secret manager로 관리합니다.
- 모델 업데이트 시 rollback 가능한 구조를 유지합니다.
- Endpoint 비용, scale-to-zero, timeout, retry 정책을 정리합니다.
- 운영 로그를 바탕으로 모델 성능과 장애 상황을 모니터링합니다.

### 보안 및 개인정보 보호

- 실제 token, DB password, endpoint URL을 Git에 커밋하지 않습니다.
- 문자 내용과 전화번호 저장 시 개인정보 처리 기준을 명확히 합니다.
- 신고 데이터 보관 기간과 접근 권한을 정의합니다.
- 악성 URL 처리 시 사용자가 직접 클릭하지 않도록 UI/UX를 설계합니다.

---

## 16. 기여 규칙

- 본인 담당 영역을 확인한 뒤 작업합니다.
- 실제 secret 값은 커밋하지 않습니다.
- `.env` 대신 `.env.example`만 문서화합니다.
- 다른 담당 영역을 수정해야 할 경우 담당자와 먼저 합의합니다.
- PR 작성 시 변경 내용과 테스트 여부를 명확히 작성합니다.

PR 작성 양식은 `.github/pull_request_template.md`를 따릅니다.

---

## 17. 라이선스

본 프로젝트는 KDT 교육 과정의 팀 프로젝트로 제작되었습니다.

현재 코드는 교육 및 학습 목적을 기준으로 작성되었으며, 실제 상용 서비스 또는 공공 서비스에 적용하기 전에는 다음 사항을 추가로 검토해야 합니다.

- 사용한 데이터셋의 라이선스
- Hugging Face 모델 및 외부 모델의 라이선스
- 개인정보 처리 기준
- 보안 및 법적 책임 범위
- 배포 환경의 이용 약관

별도의 라이선스 파일이 추가되기 전까지는 프로젝트 외부 재사용, 배포, 상업적 이용 여부를 팀과 먼저 확인해야 합니다.

---

## 18. 참고 문서

- [`frontend/README.md`](frontend/README.md)
- [`frontend/web_mvp/README.md`](frontend/web_mvp/README.md)
- [`backend/README.md`](backend/README.md)
- [`deploy/README.md`](deploy/README.md)
- [`deploy/api_contract.md`](deploy/api_contract.md)
- [`deploy/hf_endpoint_checklist.md`](deploy/hf_endpoint_checklist.md)
- [`docs/MONOREPO.md`](docs/MONOREPO.md)
