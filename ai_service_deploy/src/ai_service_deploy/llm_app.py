# llm을 nvidia gpu에 맞게 배포

# 루트 경로에서 실행방법:
# modal deploy ai_service_deploy/src/ai_service_deploy/llm_app.py

import subprocess
import time
import modal

# 1. 상수 및 볼륨 설정
MODEL_NAME = "Qwen/Qwen2.5-7B-Instruct-AWQ" # 4비트(INT4) 정밀도
# vLLM 엔진은 내부적으로 AWQ 가속(Marlin 커널 등)을 아주 강력하게 지원
MINUTES = 60

# 모델 가중치를 영구 캐싱하여 스케일 업/다운 시 다운로드 시간을 제거
hf_cache_vol = modal.Volume.from_name("hf-hub-cache", create_if_missing=True)
vllm_cache_vol = modal.Volume.from_name("vllm-cache", create_if_missing=True)

# 2. 컨테이너 이미지 정의 (최신 호환 이미지로 전면 수정)
# Modal의 GPU 환경(CUDA 12+ 및 PyTorch 최신 버전)과 완벽히 동기화되는 최신 공식 이미지 지정
vllm_image = (
    modal.Image.from_registry("vllm/vllm-openai:v0.22.0") # 최신 하드웨어 가속 커널이 탑재된 Stable 버전
    .pip_install("requests") # 헬스체크용 라이브러리만 최소 설치
)

app = modal.App("qwen-vllm-service")

# 3. vLLM 인프라 클래스 정의
@app.cls(
    image=vllm_image,
    gpu="L4:1",  # 가성비가 우수한 L4 24GB GPU 선택
    timeout=10 * MINUTES, 
    # timeout: Maximum execution time for inputs 
    # and startup time in seconds.
    scaledown_window=2 * MINUTES,  
    # scaledown_window: Max time (in seconds) a container can 
    # remain idle while scaling down
    volumes={
        "/root/.cache/huggingface": hf_cache_vol,
        "/root/.cache/vllm": vllm_cache_vol,
    },
)
class VLLMServer:
    @modal.enter() # executed when a new container is started.
    def start_server(self):
        """컨테이너 구동 시 백그라운드로 vLLM OpenAI API 서버 가동"""
        print("🚀 vLLM 서버 기동 중...")
        
        # 최신 vLLM CLI 표준(vllm serve [MODEL]) 구조 준수
        cmd = [
            "vllm", "serve", MODEL_NAME, 
            "--port", "8000",
            "--host", "0.0.0.0",
            "--dtype", "half",               # L4(Ada Lovelace) 가속에 최적화된 FP16 연산
            "--max-model-len", "8192",       # KV 캐시 메모리 최적화를 위한 컨텍스트 제한
            "--gpu-memory-utilization", "0.85", # 비디오 메모리 마진 확보
            "--disable-log-requests"      # 프로덕션 로그 오버헤드 간소화
        ]
        
        # 프로세스 추적 및 파이프라인 수집을 위해 shell=False 구동
        self.process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
        
        # 헬스체크 대기 루프
        import requests
        while True:
            # poll: Check if child process has terminated. 
            if self.process.poll() is not None:
                stdout, _ = self.process.communicate()
                raise RuntimeError(f"vLLM 시작 실패 로그:\n{stdout}")
                
            try:
                # vLLM은 프로세스가 켜진 후에도 LLM 가중치(Weights)를 GPU 메모리에 올리고 
                # KV 캐시를 할당하는 데 수십 초에서 수 분이 걸립니다.
                # openai api 구조로 요청 보내보기
                res = requests.get("http://localhost:8000/v1/models", timeout=2)
                if res.status_code == 200:
                    print("✅ vLLM 서버 준비 완료!")
                    break
            except (requests.exceptions.ConnectionError, requests.exceptions.Timeout):
                time.sleep(2)

    @modal.exit() # executed when a container is about to exit.
    def terminate_server(self):
        """컨테이너 가상환경 종료 시 프로세스 자원 해제"""
        self.process.terminate()
        self.process.wait()

    @modal.web_server(port=8000) # registers an HTTP web server inside the container
    def api(self):
        """외부 랭체인 애플리케이션이 찌를 수 있는 공용 URL 라우터 개방"""
        pass