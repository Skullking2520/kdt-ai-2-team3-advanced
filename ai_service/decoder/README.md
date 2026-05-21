# Decoder Model

이 폴더는 스미싱 설명 생성 Decoder 모델의 학습 코드, 실험 비교 결과, 선택 모델 정보를
정리한다. 대용량 모델 파일과 원본/전처리 데이터셋은 Git에 포함하지 않는다.

## Selected Model

최종 서비스에는 LoRA 파인튜닝 없이 **Few-shot 프롬프팅** 방식을 사용한다.

| Item | Value |
| --- | --- |
| Model | `Qwen/Qwen3-1.7B` |
| Inference | Hugging Face Inference API |
| Method | Few-shot prompting (6-shot) |
| Output | 70자 이내 한 문장 스미싱 의심 이유 설명 |
| avg_time_sec | 0.59s |

## Why Few-shot

Few-shot과 LoRA r=16 파인튜닝을 비교 실험한 결과, 서비스 요건 기준으로 Few-shot을 선택했다.

| 항목 | Few-shot | LoRA r=16 |
| --- | :---: | :---: |
| BERTScore ↑ | 0.6979 | **0.6909** |
| Feature-Alignment ↑ | 0.4216 | **0.4809** |
| avg_length | **95.4자** | 178.0자 |
| avg_time_sec ↓ | **0.59s** | 0.93s |

LoRA r=16이 Feature-Alignment에서 우위지만, 이 서비스의 출력 요건은 핵심 판단 근거를 70자 이내
한 문장으로 빠르게 전달하는 것이다. Few-shot은 절반 분량으로도 BERTScore를 일정 수준
유지하며 추론 속도도 빠르므로 Few-shot 방식을 선택했다.

> 추론 시간은 동일 조건(Ollama + q4\_K\_M 양자화) 기준으로 측정했다.

## Experiment Summary

비교한 실험은 다음과 같다.

**Group A — Few-shot 3종 비교**

| 모델 | BERTScore | Feature-Alignment | avg_length | avg_time_sec |
| --- | :---: | :---: | :---: | :---: |
| **qwen3:1.7b** | **0.6979** | 0.4216 | **95.4** | **0.59s** |
| exaone3.5:2.4b | 0.6941 | 0.4179 | 157.0 | 0.90s |
| gemma2:2b | 0.6778 | **0.4263** | 136.2 | 0.99s |

**Group B — Qwen3 LoRA 파인튜닝 효과**

| | Few-shot | LoRA r=8 | LoRA r=16 |
| --- | :---: | :---: | :---: |
| BERTScore | 0.6979 | 0.6901 | **0.6909** |
| Feature-Alignment | 0.4216 | 0.4647 | **0.4809** |
| avg_length | **95.4** | 157.0 | 178.0 |
| avg_time_sec | **0.59s** | 0.83s | 0.93s |

평가 지표: BERTScore F1 (`klue/roberta-base`), Feature-Alignment (생성 텍스트 vs 감지된 특징 BERTScore)

## Training Code

LoRA 학습 코드는 [training/train.py](training/train.py)에 있다.
서비스에는 사용하지 않으나 재현 가능하도록 포함한다.

하이퍼파라미터는 [training/config.yml](training/config.yml)을 참고한다.

```bash
pip install trl>=0.9.0 peft transformers accelerate

python ai_service/decoder/training/train.py --rank 16
python ai_service/decoder/training/train.py --rank 8
```

## LoRA → Ollama 배포 파이프라인

학습 후 Ollama에서 서빙하기까지의 전체 흐름이다.

```
1. LoRA 어댑터 병합
   python training/merge_qwen3_lora.py --rank 16
   → output/qwen3_lora_r16_merged/

2. GGUF 변환 (llama.cpp)
   python convert_hf_to_gguf.py output/qwen3_lora_r16_merged --outtype f16

3. q4_K_M 양자화
   llama-quantize qwen3_lora_r16_f16.gguf qwen3_lora_r16_q4km.gguf Q4_K_M

4. Ollama 등록
   ollama create qwen3-lora-q4km -f Modelfile

5. 추론
   ollama run qwen3-lora-q4km
```

## Evaluation Code

평가 코드는 [evaluation/](evaluation/) 폴더에 있다.

| 파일 | 설명 |
| --- | --- |
| `few_shot_explan.py` | Few-shot 방식 설명 생성 및 평가 |
| `gen_lora_ollama.py` | LoRA 방식 설명 생성 (Ollama q4km) |
| `eval_metrics.py` | BERTScore, Feature-Alignment 계산 |

## What Is Not Committed

대용량이거나 민감할 수 있는 산출물은 Git에 올리지 않는다.

- LoRA 어댑터 가중치 (`.safetensors`)
- 원본/전처리 데이터셋 (`.jsonl`)
- W&B 로컬 실험 로그
- 학습 체크포인트

학습 및 평가에 필요한 데이터 파일(`decoder_train_data.jsonl`, `eval_test_cases.jsonl`)은
Google Drive **남주원** 폴더에서 받을 수 있다.

모델은 Hugging Face Inference API를 통해 직접 호출한다.
