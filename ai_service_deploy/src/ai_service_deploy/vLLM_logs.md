# modal에서 나온 vllm 로그를 분석하면서 내부 원리를 파헤친다.

## activation-aware quantization

## nvidia gpu L4 gpu

## marlin kernel

https://arxiv.org/pdf/2408.11743 참조

## ## 양자화 옵션 "--quantization", "awq_marlin"의 최종 선택

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

## modal에서 나온 vllm의 핵심 로그
