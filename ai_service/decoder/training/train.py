"""
Qwen3-1.7B LoRA 파인튜닝 — 스미싱 설명 생성

실행:
    cd modeling
    conda activate test
    python train_qwen3_lora.py --rank 16
    python train_qwen3_lora.py --rank 8

설치 (추가 필요 시):
    pip install trl>=0.9.0 peft transformers accelerate
"""

import argparse
import json

import torch
from datasets import Dataset
from peft import LoraConfig, TaskType, get_peft_model
from transformers import AutoModelForCausalLM, AutoTokenizer
from trl import SFTConfig, SFTTrainer

# ── 인자 파싱 ─────────────────────────────────────────────────────
parser = argparse.ArgumentParser()
parser.add_argument("--rank", type=int, default=16, choices=[8, 16])
args = parser.parse_args()

MODEL_ID = "Qwen/Qwen3-1.7B"
DATA_FILE = "../output/decoder_train_data.jsonl"
OUTPUT_DIR = f"../output/qwen3_lora_r{args.rank}_e1"
MAX_LENGTH = 512
EPOCHS = 1
BATCH_SIZE = 2
GRAD_ACCUM = 8  # 유효 배치 = 16

SYSTEM_PROMPT = (
    "당신은 스미싱(SMS 피싱) 탐지 전문가입니다. "
    "주어진 문자 내용과 감지된 특징을 근거로, "
    "해당 문자가 스미싱으로 의심되는 이유를 두 문장 이내로 설명하세요."
)


# ── 데이터 포맷 (Qwen3 chat format) ──────────────────────────────
def _format(example: dict) -> dict:
    return {
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    f"문자 내용: {example['text']}\n"
                    f"감지된 특징:\n{example['features']}\n"
                    f"이유:"
                ),
            },
            {"role": "assistant", "content": example["output"]},
        ]
    }


# ── 데이터 로드 ───────────────────────────────────────────────────
records = []
with open(DATA_FILE, encoding="utf-8") as f:
    for line in f:
        records.append(json.loads(line))

dataset = Dataset.from_list(records).map(
    _format, remove_columns=["text", "features", "output"]
)
split = dataset.train_test_split(test_size=0.1, seed=42)
train_ds, eval_ds = split["train"], split["test"]
print(f"Train: {len(train_ds)}개  |  Eval: {len(eval_ds)}개")

# ── 토크나이저 ────────────────────────────────────────────────────
tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
tokenizer.pad_token = tokenizer.eos_token
tokenizer.padding_side = "right"

# ── 모델 ─────────────────────────────────────────────────────────
device = "mps" if torch.backends.mps.is_available() else "cpu"
model = AutoModelForCausalLM.from_pretrained(
    MODEL_ID,
    dtype=torch.float16,
).to(device)
model.config.use_cache = False

# ── LoRA ──────────────────────────────────────────────────────────
lora_cfg = LoraConfig(
    task_type=TaskType.CAUSAL_LM,
    r=args.rank,
    lora_alpha=args.rank * 2,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
    lora_dropout=0.05,
    bias="none",
)
model = get_peft_model(model, lora_cfg)
model.print_trainable_parameters()

# ── 학습 ─────────────────────────────────────────────────────────
training_args = SFTConfig(
    output_dir=OUTPUT_DIR,
    num_train_epochs=EPOCHS,
    per_device_train_batch_size=BATCH_SIZE,
    per_device_eval_batch_size=BATCH_SIZE,
    gradient_accumulation_steps=GRAD_ACCUM,
    learning_rate=2e-4,
    warmup_ratio=0.05,
    fp16=False,
    bf16=False,
    eval_strategy="steps",
    eval_steps=10,
    save_strategy="steps",
    save_steps=10,
    load_best_model_at_end=True,
    logging_steps=10,
    max_length=MAX_LENGTH,
    dataset_text_field="messages",
    report_to="wandb",
    run_name=f"qwen3-lora-r{args.rank}-e1",
)

trainer = SFTTrainer(
    model=model,
    args=training_args,
    train_dataset=train_ds,
    eval_dataset=eval_ds,
    processing_class=tokenizer,
)

print(f"\n학습 시작... (r={args.rank})\n")
trainer.train()

# ── 저장 ─────────────────────────────────────────────────────────
trainer.save_model(OUTPUT_DIR)
tokenizer.save_pretrained(OUTPUT_DIR)
print(f"\n저장 완료: {OUTPUT_DIR}")
