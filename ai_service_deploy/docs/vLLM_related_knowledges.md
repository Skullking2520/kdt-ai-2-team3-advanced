## activation-aware quantization

Activation-aware quantization은 신경망 모델의 가중치와 활성화값을 낮은 비트 정밀도로 변환할 때, 단순히 전체 범위를 같게 나누는 대신 활성화 분포를 고려해 양자화 손실을 최소화하는 기법입니다. 기본적으로 딥러닝 모델은 가중치뿐 아니라 각 레이어의 출력인 활성화값이 매우 다양한 분포를 갖기 때문에, 활성화값에 맞춘 스케일링을 적용하면 정밀도 저하를 크게 줄일 수 있습니다.

이 방식은 다음 원리에 기반합니다.

1. 각 레이어의 활성화 통계를 수집합니다. 대표적으로 평균, 분산, 최댓값과 같은 분포 정보를 활용합니다.
2. 활성화 분포를 고려한 스케일 팩터를 계산합니다. 빈도가 높은 값 영역을 보다 세밀하게 표현하고, 희귀 값은 더 거칠게 표현하는 방식입니다.
3. 이 스케일 팩터를 가중치 양자화에도 반영하거나, 활성화와 가중치가 동시에 양자화된 경우 상호 보정을 수행합니다.

결과적으로 activation-aware quantization은 모델의 정확도 손실을 줄이면서도 메모리 사용량과 연산 비용을 낮출 수 있습니다. 특히 INT4, INT8 같은 저비트 양자화에서, 단순한 균등 양자화보다 더 높은 품질을 유지할 수 있어 대규모 언어 모델 추론에 자주 쓰입니다.

활성화 인식 양자화의 중요한 장점은 다음과 같습니다.

- 활성화값 중심의 스케일링으로 특정 레이어에서의 정밀도 손실을 제한
- 데이터 분포의 비대칭성을 반영해 오버플로우나 언더플로우 위험 감소
- 양자화된 모델이 실제 추론에서 더 안정적인 예측 성능을 유지

이 기술은 AWQ, GPTQ 같은 최신 양자화 포맷과 결합되어, NVIDIA GPU 같은 하드웨어에서 높은 속도와 합리적인 정확도를 동시에 달성하는 데 기여합니다.

## nvidia gpu L4 gpu

NVIDIA L4 GPU는 AI 추론과 그래픽 워크로드를 위해 설계된 엣지/서버용 GPU 제품군 중 하나로, 특히 저전력 환경에서 대규모 언어 모델 추론을 효율적으로 수행하도록 최적화되어 있습니다. L4는 GPU 아키텍처와 텐서 코어를 활용해 INT8, INT4 같은 낮은 비트 연산을 가속화하며, 한정된 전력 내에서 높은 처리량을 제공합니다.

L4 GPU의 주요 특징은 다음과 같습니다.

1. 텐서 코어 기반의 고속 행렬 연산: Matrix Multiply Accumulate (MMA) 유닛이 INT8/INT4 연산을 빠르게 처리합니다.
2. 대역폭과 캐시 구조 최적화: 메모리 접근 병목을 줄이기 위해 L2 캐시와 메모리 서브시스템이 모델 추론 패턴에 맞춰 설계됩니다.
3. 전력 효율성: 서버급 GPU보다 낮은 TDP(Thermal Design Power: 컴퓨터 부품이 최대 부하 상태에서 발생시키는 최대 열량을 와트(W, Watt) 단위로 나타낸 수치)를 유지하면서도 합리적인 FP16/INT8 성능을 제공하여 엣지 컴퓨팅이나 비용 민감형 서비스에 적합합니다.

L4는 일반적으로 다음 용도에서 강점을 발휘합니다.

- 대규모 언어 모델의 추론: Transformer 기반 모델에서 방대한 GEMM 연산(GEneral Matrix Multiplication, 범용 행렬 곱셈: C = α A × B + β C)을 효율적으로 처리
- 멀티테넌트 추론 서비스: 여러 모델을 동시에 운용해야 하는 환경에서 적절한 전력 대비 성능
- 압축 양자화 모델 실행: INT4 및 INT8 모델을 지원하는 커널을 통해 낮은 메모리 사용과 낮은 지연 시간을 달성

정리하면, NVIDIA L4 GPU는 “저전력 추론”과 “양자화 커널 가속”을 동시에 필요로 하는 워크로드에 적합한 하드웨어로, AWQ나 Marlin과 결합할 때 가장 큰 효율성을 발휘합니다.

## marlin kernel

Marlin kernel은 NVIDIA GPU에서 INT4/INT8 기반의 GEMM(General Matrix Multiply) 연산을 고속으로 수행하도록 최적화된 커널 구현체입니다. Marlin은 일반적인 CUDA GEMM 커널과 달리 양자화된 데이터 형식과 GPU 아키텍처 특유의 메모리 패턴을 모두 고려하여 설계되었습니다.

Marlin의 핵심 설계 요소는 다음과 같습니다.

1. INT4/INT8 입력을 위해 데이터 로딩과 언패킹을 최적화합니다. 여러 양자화 값을 하나의 메모리 워드에 압축 저장하고, 이를 효율적으로 읽어 처리합니다.
2. 텐서 코어와 매트릭스 연산 유닛을 활용해 낮은 비트 정밀도의 행렬 곱셈을 병렬로 실행합니다. 이는 고정 소수점 연산 대신 변환된 정수 연산을 사용하며, 연산 단위를 크게 줄여 속도를 높입니다.
3. 스케일과 바이어스 보정 과정을 통합하여, 양자화된 입력이 출력으로 변환될 때 정확도를 유지합니다. 활성화 인식 양자화 및 비대칭 양자화를 지원하는 경우가 많습니다.

Marlin 커널은 실제로 다음과 같은 이점을 제공합니다.

- 양자화된 모델 추론 시 GPU 자원 활용률 최대화
- 낮은 비트 연산에서 발생하는 메모리 대역폭 비용 감소
- INT4/INT8 모델의 지연 시간과 처리량 개선

따라서, AWQ 포맷으로 저장된 모델을 NVIDIA L4 같은 GPU에서 실행할 때 Marlin kernel은 효율적인 실행 경로를 제공합니다. AWQ가 저장된 양자화 결과라면, Marlin은 이를 읽고 곱셈-축적 연산을 빠르게 수행하는 실행 엔진 역할을 합니다.

https://arxiv.org/pdf/2408.11743 참조

## 양자화 옵션 "--quantization", "awq_marlin"의 최종 선택

AWQ 자체는 양자화 포맷입니다.

Marlin은 NVIDIA GPU 전용 INT4 GEMM 커널입니다.

개념적으로

```
AWQ
└─ 저장 포맷

Marlin
└─ 실행 커널
```

입니다.

즉

AWQ 모델 + Marlin 커널

이 가장 빠릅니다.

L4에서는 거의 필수입니다.

## modal에 배포 후 테스트

vllm은 openai api 규격을 따르므로 다음과 같이 테스트해본다.

```txt
POST https://<사용자명>--qwen-vllm-service-vllmserver-api.modal.run/v1/chat/completions

{
    "model": "Qwen/Qwen2.5-7B-Instruct-AWQ",
    "messages": [
        {"role": "user", "content": "안녕하세요, 테스트 요청입니다. 한국어로 답변해 주세요."}
    ],
    "temperature": 0.0,
    "max_tokens": 512
}

응답:
{
    "id": "chatcmpl-d6dff21384044935991ed525c45650de",
    "object": "chat.completion",
    "created": 1781744735,
    "model": "Qwen/Qwen2.5-7B-Instruct-AWQ",
    "choices": [
        {
            "index": 0,
            "message": {
                "role": "assistant",
                "content": "안녕하세요! 테스트 요청에 대한 답변을 드리게 되어 기쁩니다. 무엇을 도와드릴까요?",
                "refusal": null,
                "annotations": null,
                "audio": null,
                "function_call": null,
                "tool_calls": [],
                "reasoning_content": null
            },
            "logprobs": null,
            "finish_reason": "stop",
            "stop_reason": null,
            "token_ids": null
        }
    ],
    "service_tier": null,
    "system_fingerprint": null,
    "usage": {
        "prompt_tokens": 47,
        "total_tokens": 78,
        "completion_tokens": 31,
        "prompt_tokens_details": null
    },
    "prompt_logprobs": null,
    "prompt_token_ids": null,
    "kv_transfer_params": null
}
```
