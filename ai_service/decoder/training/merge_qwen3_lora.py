"""
Qwen3 LoRA 어댑터를 베이스 모델에 통합 (merge_and_unload)

HF Inference Endpoint 배포용 완전한 모델 생성
실행 (학습 환경과 동일한 conda 환경에서):
    cd modeling
    python merge_qwen3_lora.py --rank 16
    python merge_qwen3_lora.py --rank 8
"""

import argparse
from pathlib import Path

import torch
from peft import PeftModel
from transformers import AutoModelForCausalLM, AutoTokenizer

parser = argparse.ArgumentParser()
parser.add_argument("--rank", type=int, choices=[8, 16], required=True)
args = parser.parse_args()

ADAPTER_PATH = f"../output/qwen3_lora_r{args.rank}_e1"
OUTPUT_PATH = f"../output/qwen3_lora_r{args.rank}_merged"
BASE_MODEL = "Qwen/Qwen3-1.7B"

print(f"어댑터 경로: {ADAPTER_PATH}")
print(f"저장 경로:   {OUTPUT_PATH}\n")

device = "mps" if torch.backends.mps.is_available() else "cpu"

print("1. 베이스 모델 로드...")
base = AutoModelForCausalLM.from_pretrained(
    BASE_MODEL,
    torch_dtype=torch.float16,
).to(device)

print("2. LoRA 어댑터 로드...")
model = PeftModel.from_pretrained(base, ADAPTER_PATH)

print("3. 어댑터 통합 (merge_and_unload)...")
merged = model.merge_and_unload()

print(f"4. 저장 중: {OUTPUT_PATH}")
Path(OUTPUT_PATH).mkdir(parents=True, exist_ok=True)
merged.save_pretrained(OUTPUT_PATH, safe_serialization=True)

tokenizer = AutoTokenizer.from_pretrained(ADAPTER_PATH)
tokenizer.save_pretrained(OUTPUT_PATH)

print(f"\n완료: {OUTPUT_PATH}")
print("이 디렉토리를 HF Hub에 업로드하거나 Inference Endpoint에 연결하세요.")
