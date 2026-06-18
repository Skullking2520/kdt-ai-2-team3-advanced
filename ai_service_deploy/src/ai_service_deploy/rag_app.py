# llm_app.py 먼저 배포하고 배포할것. modal에 환경변수를 secret으로 등록할 것.
# 루트 경로에서 실행방법: 
# modal deploy ai_service_deploy/src/ai_service_deploy/rag_app.py
import os
import sys
import modal

from pathlib import Path

# rag_app.py 파일 위치 기준으로 절대경로 계산
_HERE = Path(__file__).parent  # ai_service_deploy/src/ai_service_deploy/
_REPO_ROOT = _HERE.parent.parent.parent  # 모노리포 루트
_AI_SERVICE_PACKAGE_ROOT = (
    _REPO_ROOT / "ai_service" / "src" / "ai_service"
)

# 1. 컨테이너 이미지 정의 (RAG 필수 최소 C 빌드 가속 툴만 포함, 그래픽 라이브러리 제거)
# 이미지 빌드 정의 (로컬에서만 실행됨)
rag_image = (
    # vLLM처럼 C++과 CUDA로 짜여진 무거운 라이브러리들은 PyPI(pip 서비)에 올릴 때, 
    # 미리 컴파일된 휠(Wheel) 파일을 Python 버전별로 다르게 제공합니다.
    # 따라서 이와 같은 버전으로 고정합니다.
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("build-essential", "pkg-config", "libgomp1")
    .pip_install("uv")
    
    # 1. uv 모노리포 루트의 뼈대 파일 복사
    .add_local_file("pyproject.toml", "/root/pyproject.toml", copy=True)
    .add_local_file("uv.lock", "/root/uv.lock", copy=True)

    # 2. 하위 ai_service 프로젝트의 설정 파일 구조 그대로 복사
    .add_local_file("ai_service/pyproject.toml", "/root/ai_service/pyproject.toml", copy=True)

    # 3. uv sync로 ai_service 패키지의 프로덕션 의존성만 시스템에 동기화
    # --no-editable 옵션을 주어 소스코드 없이 의존성만 먼저 완벽하게 캐싱
    .run_commands(
        "cd /root && uv export --frozen --package ai_service --no-emit-workspace --no-dev --no-hashes > /tmp/requirements.txt",
        "cat /tmp/requirements.txt | head -20",  # 확인용
        "cd /root && uv pip install --system --no-cache -r /tmp/requirements.txt",
        "python -c 'import langchain_huggingface; print(\"OK:\", langchain_huggingface.__file__)'"
    )
    # 4. 소스 코드 추가
    .add_local_dir(
        str(_AI_SERVICE_PACKAGE_ROOT),
        remote_path="/root/ai_service",
        copy=True
    )
)
# 외부 라이브러리 레이어와 내 소스 코드 레이어를 완벽히 분리한다

app = modal.App("ai-service-rag", image=rag_image)

# 2. 한국어 임베딩 모델 가중치 분리형 영구 볼륨 정의
model_volume = modal.Volume.from_name("embedding-models", create_if_missing=True)
CACHE_DIR = "/models_cache"

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
    # min_containers=1,   # 무조건 컨테이너 1대는 상시 대기 (요금 나가므로 배포 직전 주석 해제)
    max_containers=5,   # 최대 5대까지만 늘어나도록 제한
    scaledown_window=120 # 추가로 늘어난 컨테이너들은 요청이 끊기고 2분(120초) 뒤 종료   
)
@modal.asgi_app()
def fastapi_app():
    VENV_SITE = "/usr/local/lib/python3.11/site-packages"  # 시스템 설치 경로로 수정
    
    # /root (ai_service 소스코드 위치) 와 시스템 site-packages 우선 등록
    for p in ["/root", VENV_SITE]:
        if p not in sys.path:
            sys.path.insert(0, p)

    sys.modules.pop("typing_extensions", None)

    import typing_extensions
    print(typing_extensions.__file__)
    print(hasattr(typing_extensions, "Sentinel"))

    os.environ["HF_HOME"] = CACHE_DIR

    print("🔍 [RAG Initialization] Starting HuggingFaceEmbeddings cache warm-up...")
    try:
        from langchain_huggingface import HuggingFaceEmbeddings
        _ = HuggingFaceEmbeddings(
            model_name="jhgan/ko-sroberta-multitask",
            cache_folder=CACHE_DIR
        )
        print("✅ [RAG Initialization] Embedding model successfully cached.")
    except Exception as e:
        print(f"❌ [RAG Initialization Error] Failed to load embedding model: {str(e)}")
        raise e

    from ai_service.main import app as main_app
    return main_app
    