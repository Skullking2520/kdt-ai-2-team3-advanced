# llm_app.py 먼저 배포하고 배포할것. modal에 환경변수를 secret으로 등록할 것.
# 루트 경로에서 실행방법: 
# modal deploy ai_service_deploy/src/ai_service_deploy/rag_app.py
import os
import sys
import modal

# 1. 컨테이너 이미지 정의 (RAG 필수 최소 C 빌드 가속 툴만 포함, 그래픽 라이브러리 제거)
rag_image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("build-essential", "pkg-config", "libgomp1")
    .pip_install("uv")
    
    # 1. uv 모노리포 루트의 뼈대 파일 복사
    .add_local_file("pyproject.toml", "/root/pyproject.toml", copy=True)
    .add_local_file("uv.lock", "/root/uv.lock", copy=True)

    # 2. 하위 ai_service 프로젝트의 설정 파일 구조 그대로 복사
    .add_local_file("ai_service/pyproject.toml", "/root/ai_service/pyproject.toml", copy=True)

    # 3. uv sync로 ai_service 패키지의 프로덕션 의존성만 시스템에 동기화
    # --no-editable 옵션을 주어 소스코드 없이 의존성만 먼저 완벽하게 캐싱
    .run_commands("cd /root && uv sync --frozen --no-editable --no-install-workspace --package ai_service")
)
# 외부 라이브러리 레이어와 내 소스 코드 레이어를 완벽히 분리한다

app = modal.App("ai-service-rag", image=rag_image)

# 2. 한국어 임베딩 모델 가중치 분리형 영구 볼륨 정의
model_volume = modal.Volume.from_name("embedding-models", create_if_missing=True)
CACHE_DIR = "/models_cache"

# 3. 로컬 소스코드 이미지를 통해 포함 (Mount 사용 대신 Image API 권장)
#    add_local_python_source로 `ai_service` 패키지를 컨테이너의 /root에 마운트합니다.
#    (copy=False이면 컨테이너 시작 시 마운트되어 빠른 반복 개발에 유리)
rag_image = rag_image.add_local_python_source("ai_service", copy=False)

@app.function(
    volumes={CACHE_DIR: model_volume},
    # 로컬 소스는 Image에 포함했으므로 mounts 파라미터 불필요
    secrets=[
        modal.Secret.from_name("langfuse-secrets"), # 랭퓨즈 추적용 토큰 세트
        modal.Secret.from_name("pinecone-secrets"), # pinecone api key
        modal.Secret.from_name("openai-secrets"), # openai api key
        modal.Secret.from_name("ai-service-secrets"), # 그 외 ai_service 환경변수 등
    ],
    cpu=2.0,       # 임베딩 연산 및 데이터 핸들링을 위한 CPU 자원, 2 코어
    memory=4096,   # 임베딩 모델 적재 안정성을 위한 메모리 구성, 4GB(4096MB) 메모리
    # min_containers=1,   # 무조건 컨테이너 1대는 상시 대기 (요금 나가므로 배포 직전 주석 해젠)
    max_containers=5,   # 최대 5대까지만 늘어나도록 제한
    scaledown_window=120 # 추가로 늘어난 컨테이너들은 요청이 끊기고 2분(120초) 뒤 종료   
)
@modal.asgi_app()
def fastapi_app():
    # @modal.asgi_app() 데코레이터가 붙은 이 함수는 컨테이너가 처음 구동될 때 
    # 단 한 번만 실행되는 '인스턴스 팩토리(생성기)' 역할

    # 임베딩 허깅페이스 캐시 경로 강제 주입
    # 원래 허깅페이스(Hugging Face) 라이브러리는 모델을 다운로드할 때 
    # 시스템 기본 경로(예: /root/.cache)를 사용
    os.environ["HF_HOME"] = CACHE_DIR
    
    # 마운트된 소스코드를 파이썬 패스에 주입
    # 파이썬 인터프리터가 import 명령어를 만났을 때, 어느 폴더를 뒤져서 패키지를 찾아야 할지 
    # 알려주는 주소록(sys.path)에 /root 디렉터리를 추가
    sys.path.append("/root")
    
    # 런타임 진입 시 최초 1회 볼륨 내부 가중치 체크 및 다운로드
    from langchain_huggingface import HuggingFaceEmbeddings
    _ = HuggingFaceEmbeddings(
        model_name="jhgan/ko-sroberta-multitask",
        cache_folder=CACHE_DIR
    )

    # 작성하신 FastAPI 엔드포인트 객체 로드 후 ASGI 반환
    from ai_service.main import app as main_app
    return main_app
    # 로드가 완료된 FastAPI 인스턴스를 Modal 웹 서버 엔진에 통째로 반환(Return)