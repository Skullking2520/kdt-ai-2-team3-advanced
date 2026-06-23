# modal에서 나온 vllm 로그를 분석하면서 내부 원리를 파헤친다.

## modal에서 나온 vllm의 핵심 로그

```txt
1. Automatically detected platform cuda
   INFO
   Automatically detected platform cuda
   내부 원리

vLLM 시작

↓

PyTorch 초기화

↓

CUDA Driver 확인

↓

GPU Backend 선택

CPU
ROCm
CUDA
TPU
XPU

중

CUDA

선택

2. Resolved architecture
   Resolved architecture:
   Qwen2ForCausalLM
   내부 원리

HuggingFace config.json 분석

{
    "architectures": [
        "Qwen2ForCausalLM"
    ]
}

읽음

↓

vLLM 내부 Executor 결정

즉

Qwen2
Llama
Gemma
Mistral
Mixtral

마다

attention 구조

rotary embedding

tokenizer

KV cache

가 조금씩 다름

3. Loading safetensors
   Loading safetensors checkpoint shards
   내부 원리

HF Hub

↓

safetensors 다운로드

↓

메모리 매핑

mmap()

사용

왜 safetensors인가?

기존

torch.load()

는

pickle 실행

가능

↓

보안 위험

safetensors는

순수 바이너리

대략

Header
Tensor metadata
Raw binary

구조

4. torch.compile
   torch.compile takes 11.61 s
   핵심

PyTorch 2.x

torch.compile()

사용

원래

Python
↓
PyTorch eager
↓
CUDA kernel

실행

compile 후

Python Graph
↓
FX Graph
↓
TorchDynamo
↓
Inductor
↓
Triton
↓
CUDA kernel


Q. Triton이 뭔가?

많이 헷갈리는 부분

NVIDIA Triton Inference Server 아님

PyTorch Triton

import triton

GPU Kernel DSL

쉽게 말하면

CUDA C++

보다

Triton (openai에서 만든 dsl)

이 AI 연산 최적화용

Triton 커널 컴파일 데이터는 AI 모델을 NVIDIA GPU에서 초고속으로 실행할 수 있도록, Python 코드를 최적화된 GPU 기계어(바이너리 코드)로 자동 변환하여 저장해 둔 파일입니다.

vLLM은

Attention
LayerNorm
Matmul

최적화 커널 생성 시

Triton 적극 사용

5. Chunked Prefill
   Chunked prefill is enabled
   원리

예전

8000 token

들어오면

전부 처리

↓

OOM 위험

vLLM

2048
2048
2048
2048

나눠 처리

그래서

Chunked Prefill

긴 프롬프트에서 중요

6. KV Cache
   Available KV cache memory:
   13.20 GiB

가장 중요

LLM 속도 핵심

Transformer

Key
Value

매 토큰 생성

원래

1
12
123
1234
12345

매번 재계산

KV Cache

1
12
123
1234

저장

↓

재사용

그래서

100배 이상 속도 차이

가능

7. GPU KV cache size
   247,232 tokens

의미

현재 설정으로

24만 토큰

분량 KV Cache 확보

로그

Maximum concurrency:
30.18x

의 의미

8192 context 요청 기준

30명 정도

동시 처리 가능

대략

247232 / 8192
≈ 30 8.


Graph capturing finished
Graph capturing finished in 15 secs

엄청 중요

CUDA Graph

생성 중

원래

매 토큰

CPU
↓
CUDA Launch
↓
GPU

반복

커널 론치 오버헤드(Kernel Launch Overhead)는 GPU 프로그래밍(예: CUDA)에서 CPU가 GPU에게 연산 작업(Kernel)을 지시하고 실행하기까지 발생하는 추가적인 대기 시간과 자원 소모를 의미

발생 원인: CPU 스레드에서 커널 호출 → GPU 드라이버 및 런타임의 명령 처리 → 작업 큐(Work Queue) 등록 → GPU 하드웨어로의 전송 등 실제 연산이 시작되기 전 거쳐야 하는 부가적인 작업들 때문입니다

해결 방법:커널 호출 횟수를 줄이기 위해 여러 연산을 하나의 큰 커널로 병합(Fusion)합니다.CUDA 런타임 API 대신 CUDA Graphs를 사용하여 반복적인 커널 호출 시퀀스를 미리 기록하고 최적화하여 실행합니다.

https://developer.nvidia.com/ko-kr/blog/enabling-dynamic-control-flow-in-cuda-graphs-with-device-graph-launch/ 참조

CUDA Graph

실행 흐름 녹화

후

재생

그래서

Launch Overhead 감소

특히

7B
14B
32B

모델에서 효과 큼

9. Free memory
   Actual usage is

5.2 GiB for weight

1.41 GiB activation

0.76 GiB cudagraph

이건 매우 좋은 데이터입니다.

현재 Qwen2.5-7B-AWQ 실제 사용량

Weights 5.2 GB
Activation 1.4 GB
Graph 0.76 GB
KV Cache 13.2 GB

즉

24GB L4

에서

상당히 이상적인 배치입니다.

10. V1 Engine
    Initializing a V1 LLM engine

vLLM 0.10의 핵심

예전

V0 Engine

↓

현재

V1 Engine

차이

Scheduler 개선
Memory 관리 개선
Prefix Cache 개선
Multi Request 개선

vllm serve 옵션은 여기 참조
https://docs.vllm.ai/en/latest/cli/serve/
```

여기까지가 실제 운영하면서 가장 중요한 로그들입니다.

## 
