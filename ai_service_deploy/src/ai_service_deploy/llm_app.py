# llm을 nvidia gpu에 맞게 배포

# 루트 경로에서 실행방법:
# modal deploy ai_service_deploy/src/ai_service_deploy/llm_app.py

import subprocess
import time
import modal
import time
import threading

# 1. 상수 및 볼륨 설정
MODEL_NAME = "Qwen/Qwen2.5-7B-Instruct-AWQ" # 4비트(INT4) 정밀도
# vLLM 엔진은 내부적으로 AWQ 가속(Marlin 커널 등)을 아주 강력하게 지원
MINUTES = 60

# 모델 가중치를 영구 캐싱하여 스케일 업/다운 시 다운로드 시간을 제거
hf_cache_vol = modal.Volume.from_name("hf-hub-cache", create_if_missing=True)
vllm_cache_vol = modal.Volume.from_name("vllm-cache", create_if_missing=True)

# 2. 컨테이너 이미지 정의 (Modal Native 방식 최적화)
# Qwen 2.5 가속 및 최신 transformers 규격을 완벽히 지원하는 최신 안정 버전으로 전면 쇄신
vllm_image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("build-essential") # 내부 가속 커널 컴파일 안정성 확보
    .pip_install(
        "vllm==0.10.2",
        "fastapi==0.115.12",
        "starlette==0.46.2",
        "prometheus-fastapi-instrumentator==7.1.0",
        "transformers==4.57.1",
        "requests"
    ) # 강하게 버전 고정해야 호환성 버그가 안남 (vllm이 최신 fastapi 의존성 설치해서 호환성 버그났음)
)

app = modal.App("qwen-vllm-service")

# 3. vLLM 인프라 클래스 정의
@app.cls(
    image=vllm_image,
    gpu="L4:1",  # 가성비가 우수한 L4 24GB GPU 선택
    timeout=60 * MINUTES,  # 1시간 시작 대기
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

        import transformers

        tokenizer_cls = (
            transformers.tokenization_utils_base.PreTrainedTokenizerBase
        )

        try:
            getattr(
                tokenizer_cls,
                "all_special_tokens_extended"
            )
        except AttributeError:
            print("✅ all_special_tokens_extended 몽키패칭을 진행합니다..")
            tokenizer_cls.all_special_tokens_extended = property( # type: ignore
                lambda self: self.all_special_tokens
            )
        
        # 최신 vLLM 버전 도입으로 인해 과거의 불안정한 토크나이저 몽키 패치 코드는 완전히 제거되었습니다.
        print("🚀 vLLM 서버 기동 중...")
        
        # 최신 vLLM CLI 표준(vllm serve [MODEL]) 구조 준수
        cmd = [
            "vllm", "serve", MODEL_NAME, 
            "--port", "8000",
            "--host", "0.0.0.0",
            # "--quantization", "awq_marlin",
            "--dtype", "auto",  # AWQ does not support bfloat16 in vLLM            
            "--max-model-len", "8192",       # KV 캐시 메모리 최적화를 위한 컨텍스트 제한
            "--gpu-memory-utilization", "0.90", # 비디오 메모리 마진 확보
            "--disable-log-requests"      # 프로덕션 로그 오버헤드 간소화
            # "--enforce-eager" # disable CUDA graph and always execute the model in eager mode
        ]
        
        # 프로세스 추적 및 파이프라인 수집을 위해 shell=False 구동
        self.process = subprocess.Popen(
            cmd, 
            stdout=subprocess.PIPE, 
            stderr=subprocess.STDOUT, 
            text=True,
            bufsize=1 # 텍스트 데이터를 한 줄 단위로 즉시 출력(Line Buffering)하라는 의미
        )

        # 디버깅용 스레드 
        threading.Thread(
            target=self.log_stream,
            daemon=True,
        ).start()
        
        # 헬스체크 대기 루프
        import requests
        start_time = time.time()  # 대기 시작 시간 기록

        while True:
            # poll: Check if child process has terminated. 
            if self.process.poll() is not None:
                stdout, _ = self.process.communicate()
                raise RuntimeError(f"vLLM 시작 실패 로그:\n{stdout}")
            
            elapsed_time = time.time() - start_time  # 경과 시간 계산
                
            try:
                # vLLM은 프로세스가 켜진 후에도 LLM 가중치(Weights)를 GPU 메모리에 올리고 
                # KV 캐시를 할당하는 데 수십 초에서 수 분이 걸립니다.
                # openai api 구조로 요청 보내보기
                print(f"🚀 vLLM 서버가 깨어났는지 요청을 보내봅니다... (경과 시간: {elapsed_time:.1f}초)")
                res = requests.get("http://localhost:8000/docs", timeout=2)
                if res.status_code in (200, 404):
                    print(f"✅ vLLM 서버 준비 완료! (총 대기 시간: {elapsed_time:.1f}초)")
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

    # 클래스의 독립된 메서드로 분리합니다.
    def log_stream(self):
        assert self.process.stdout is not None
        for line in self.process.stdout:
            print(f"[vLLM] {line.rstrip()}")

"""
vllm-cache는 내부 Triton 커널 컴파일 데이터나 특정 모델의 메타데이터만 임시 저장하는 곳이므로, 
첫 추론 요청이 완전히 성공하기 전까지는 용량이 0바이트이거나 비어있는 것이 지극히 정상
"""