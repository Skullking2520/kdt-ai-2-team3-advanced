# AI Service Deploy (Modal)

Modal을 사용한 `ai_service` 서버리스 배포 가이드

## Modal 소개

[Modal](https://modal.com)은 **serverless compute platform**으로, Python 코드를 간단한 데코레이터만으로 클라우드에 배포할 수 있습니다.

### Modal의 주요 특징

- **간편한 배포**: `@app.function` 데코레이터로 함수를 바로 배포
- **자동 스케일링**: 트래픽에 따라 자동으로 인스턴스 증감
- **리소스 관리**: CPU, 메모리, GPU를 선언적으로 지정
- **환경변수 관리**: Secrets 안전하게 관리
- **비용 효율성**: 사용한 시간만 청구 (콜드 스타트 포함)
- **로컬 테스트**: 로컬에서 먼저 검증 후 배포

---

## AI Service 배포 원리

### 1. 배포 아키텍처

```
┌─────────────────────────────────────────────────┐
│         Client (Backend/외부 호출자)              │
└──────────────────┬──────────────────────────────┘
                   │ HTTP Request
                   ▼
┌─────────────────────────────────────────────────┐
│      Modal Serverless Container (FastAPI)       │
├─────────────────────────────────────────────────┤
│  • LangGraph 워크플로우                          │
│  • Router Node (제로데이 판별)                   │
│  • RAG Node (벡터DB 검색 + LLM 추론)            │
│  • Simple Reason Node (빠른 사유 추출)          │
├─────────────────────────────────────────────────┤
│        Integrated Dependencies:                  │
│  • Pinecone VectorDB (조직 index URL)       │
│  • vLLM on Modal GPU (LLM 모델 연동)         │
│  • ko-sroberta-multitask (임베딩 모델)         │
└─────────────────────────────────────────────────┘
```

### 2. Modal 배포 플로우

**Step 1: Docker 이미지 정의**

- `ai_service` 폴더의 모든 의존성을 Modal Image에 포함
- `pyproject.toml` 기반으로 패키지 설치
- 환경변수 및 모델 사전 로드 (Cold Start 최소화)

**Step 2: FastAPI 앱 래핑**

```python
@app.function(
    image=image,
    cpu=3,
    memory=4096,  # 4GB
    timeout=600,  # 10분
)
@modal.asgi_app()
def fastapi_app():
    return app  # ai_service.main:app
```

**Step 3: 엔드포인트 배포**

- `/api/v1/health`: 헬스 체크
- `/api/v1/graph/invoke`: LangGraph 추론
- `/api/v1/vectordb/retrieve`: RAG 문서 검색

### 3. 콜드 스타트 최적화

- **이미지 계층화**: 무거운 의존성(torch, transformers)을 Image에 캐싱
- **모델 프리로딩**: vLLM 엔진을 Modal GPU에 미리 로드하여 지연 시간 최소화
- **임베딩 모델 캐싱**: `jhgan/ko-sroberta-multitask` 오프라인 로드

---

## 추천 서버리스 사양

| 구성 요소    | 권장사양       | 비고                                                          |
| ------------ | -------------- | ------------------------------------------------------------- |
| **CPU**      | 2-4 cores      | 3-core 권장 (Modal GPU + vLLM 배포)                           |
| **메모리**   | 3-4GB          | vLLM 기반 모델과 Pinecone 클라이언트 병행 시 충분한 여유 필요 |
| **타임아웃** | 300-600초      | 첫 추론은 느릴 수 있음 (RAG 검색 포함)                        |
| **동시성**   | 2-5 concurrent | 자동 스케일 활성화                                            |
| **GPU**      | 권장           | Modal GPU(T4 또는 그 이상(L4))로 vLLM 모델 가속화             |

### 비용 추정 (월기준, 미국 기준)

- **CPU 3-core, 메모리 4GB**: ~$0.025/시간
- **일일 1000 요청 (각 2초)**: ~$0.5/일 = ~$15/월
- **GPU T4 추가**: +$0.30/시간

---

## 배포 및 테스트 가이드

### 전제 조건

```bash
# Modal CLI 설치
pip install modal

# Modal 인증 (처음 1회만)
modal auth login
# 난 python3 -m modal setup으로 api key 세팅함
# Token written to /Users/<맥북 사용자명>/.modal.toml in profile <로그인 사용자명>.
```

### 로컬 테스트

```bash
# ai_service 로컬 테스트
cd ai_service
uv run uvicorn ai_service.main:app --reload --port 8080

# 테스트 요청
curl -X POST http://127.0.0.1:8080/api/v1/graph/invoke \
  -H "Content-Type: application/json" \
  -d '{
    "text": "[CJ대한통운] 배송 주소 오류로 반송 예정입니다. http://delivery-check.example",
    "route_override": "zero_day"
  }'
```

### Modal 배포

```bash
# 환경변수 설정 (Modal Secrets)
modal secret create ai-service-env \
  AWS_ACCESS_KEY_ID=<your-aws-access-key-id> \
  AWS_SECRET_ACCESS_KEY=<your-aws-secret-access-key> \
  AWS_REGION=<your-aws-region> \
  PINECONE_API_KEY=<your-pinecone-api-key> \
  PINECONE_INDEX_URL=https://<your-org>.pinecone.io/<your-index-name> \
  VLLM_MODEL_NAME=<your-vllm-model>

# Modal 배포
modal deploy ai_service_deploy/src/ai_service_deploy/modal_app.py

# 배포된 앱 확인
modal app list

# 로그 확인
modal tail -a <app_name>
```

### Modal에서 실시간 테스트

```bash
# Modal 함수 직접 호출
modal run ai_service_deploy.modal_app::invoke_graph \
  --text "테스트 문장" \
  --route_override "zero_day"
```

---

## 주요 고려사항

### 1. **VectorDB 지속성**

- **Pinecone 연결**: Modal 앱은 Pinecone 조직의 `index URL`로 직접 연결
- **메모리 저장**: 콜드 스타트마다 초기화 (개발용)
- **지속성 저장**: 운영 시 Pinecone 인덱스를 사용하거나 AWS S3를 보조 저장소로 활용

```python
# Pinecone 예시 설정
PINECONE_INDEX_URL = os.environ["PINECONE_INDEX_URL"]
PINECONE_API_KEY = os.environ["PINECONE_API_KEY"]
```

### 2. **환경변수 관리**

```python
import os
from modal import Secret

@app.function(secrets=[Secret.from_name("ai-service-env")])
def fastapi_with_secrets():
    ollama_model = os.environ.get("OLLAMA_MODEL_NAME")
    # ...
```

### 3. **LLM 모델 연동**

- **로컬 개발**: `localhost:11434` 또는 vLLM 엔진 직접 연동
- **Modal 배포**: Modal GPU에 vLLM을 배포하여 모델 추론을 가속화
- **Ollama**: 여전히 사용 가능하지만, Modal GPU + vLLM 환경을 기본으로 권장

### 4. **모니터링 및 디버깅**

```bash
# 실시간 로그
modal tail -a <app_name>

# 특정 함수 로그
modal logs <app_name> --function fastapi_app
```

---

## 다음 단계

1. **`modal_app.py` 작성**: FastAPI + LangGraph 래핑
2. **환경 테스트**: 로컬에서 모든 엔드포인트 검증
3. **Secrets 설정**: Modal 콘솔에서 환경변수 등록
4. **스테이징 배포**: 실제 트래픽 전에 검증
5. **프로덕션 배포**: 백엔드와 통합

## 기타 특이사항

Modal은 각각의 컨테이너 이미지를 완전히 독립된 공간(마이크로VM)으로 분리하여 실행합니다.

vLLM 컨테이너: Python 3.11 환경에서 GPU를 쓰며 대형 모델 추론만 전담.

RAG 컨테이너: Python 3.12 환경에서 CPU/메모리만 쓰며 텍스트 파싱 및 벡터 검색 전담.
