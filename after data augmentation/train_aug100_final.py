import os
import json
from pathlib import Path

import numpy as np
import pandas as pd
import torch

from datasets import Dataset
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_recall_fscore_support

from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification,
    TrainingArguments,
    Trainer,
    DataCollatorWithPadding
)


# =========================
# 1. 경로 설정
# =========================

# 현재 train_aug100_final.py 파일 위치
SCRIPT_DIR = Path(__file__).resolve().parent

# 만약 이 파일이 "after data augmentation" 폴더 안에 있으면,
# 상위 폴더를 프로젝트 루트로 사용
PROJECT_DIR = SCRIPT_DIR.parent

DATA_PATH = PROJECT_DIR / "cleaned_dataset_aug_100_mixed_balanced.jsonl"

# 기존 final model
BASE_MODEL_PATH = PROJECT_DIR / "final_model"

# aug-100 결과 저장 폴더
OUTPUT_DIR = PROJECT_DIR / "final_model_aug_100"

RANDOM_STATE = 42
MAX_LENGTH = 128


print("===== 경로 확인 =====")
print("SCRIPT_DIR:", SCRIPT_DIR)
print("PROJECT_DIR:", PROJECT_DIR)
print("DATA_PATH:", DATA_PATH)
print("DATA_PATH exists:", DATA_PATH.exists())
print("BASE_MODEL_PATH:", BASE_MODEL_PATH)
print("BASE_MODEL_PATH exists:", BASE_MODEL_PATH.exists())
print("OUTPUT_DIR:", OUTPUT_DIR)

if not DATA_PATH.exists():
    raise FileNotFoundError(f"데이터 파일을 찾을 수 없습니다: {DATA_PATH}")

if not BASE_MODEL_PATH.exists():
    raise FileNotFoundError(f"final_model 폴더를 찾을 수 없습니다: {BASE_MODEL_PATH}")


# =========================
# 2. 데이터 로드
# =========================

df = pd.read_json(DATA_PATH, lines=True)

print("\n===== 데이터 확인 =====")
print("데이터 개수:", len(df))
print("컬럼:", df.columns.tolist())
print("라벨 분포:")
print(df["label"].value_counts())

df = df[["text", "label"]].dropna()
df["label"] = df["label"].astype(int)


# =========================
# 3. train / validation 분리
# =========================

train_df, valid_df = train_test_split(
    df,
    test_size=0.1,
    random_state=RANDOM_STATE,
    stratify=df["label"]
)

print("\n===== Split 확인 =====")
print("Train:", len(train_df))
print("Valid:", len(valid_df))


train_dataset = Dataset.from_pandas(train_df.reset_index(drop=True))
valid_dataset = Dataset.from_pandas(valid_df.reset_index(drop=True))


# =========================
# 4. tokenizer / model 로드
# =========================

tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL_PATH)

model = AutoModelForSequenceClassification.from_pretrained(
    BASE_MODEL_PATH,
    num_labels=2
)

device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")
print("\n사용 device:", device)

model.to(device)


# =========================
# 5. 토크나이징
# =========================

def tokenize_function(batch):
    return tokenizer(
        batch["text"],
        truncation=True,
        max_length=MAX_LENGTH
    )


train_dataset = train_dataset.map(tokenize_function, batched=True)
valid_dataset = valid_dataset.map(tokenize_function, batched=True)

train_dataset = train_dataset.remove_columns(["text"])
valid_dataset = valid_dataset.remove_columns(["text"])

train_dataset.set_format("torch")
valid_dataset.set_format("torch")

data_collator = DataCollatorWithPadding(tokenizer=tokenizer)


# =========================
# 6. 평가 지표
# =========================

def compute_metrics(eval_pred):
    logits, labels = eval_pred
    preds = np.argmax(logits, axis=-1)

    precision, recall, f1, _ = precision_recall_fscore_support(
        labels,
        preds,
        average="binary",
        pos_label=1,
        zero_division=0
    )

    acc = accuracy_score(labels, preds)

    return {
        "accuracy": acc,
        "precision": precision,
        "recall": recall,
        "f1": f1
    }


# =========================
# 7. 학습 설정
# =========================

training_args = TrainingArguments(
    output_dir=str(OUTPUT_DIR),

    num_train_epochs=3,
    learning_rate=2e-5,
    per_device_train_batch_size=16,
    per_device_eval_batch_size=16,

    eval_strategy="epoch",
    save_strategy="epoch",
    logging_strategy="steps",
    logging_steps=500,

    load_best_model_at_end=True,
    metric_for_best_model="f1",
    greater_is_better=True,

    save_total_limit=2,
    seed=RANDOM_STATE,

    report_to="none"
)


# =========================
# 8. Trainer 생성
# =========================

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=valid_dataset,
    data_collator=data_collator,
    compute_metrics=compute_metrics
)

    
# =========================
# 9. 학습 시작
# =========================

trainer.train()


# =========================
# 10. 최종 평가
# =========================

eval_result = trainer.evaluate()

print("\n===== 최종 평가 결과 =====")
print(eval_result)


# =========================
# 11. 모델 저장
# =========================

trainer.save_model(str(OUTPUT_DIR))
tokenizer.save_pretrained(str(OUTPUT_DIR))

with open(OUTPUT_DIR / "eval_result.json", "w", encoding="utf-8") as f:
    json.dump(eval_result, f, ensure_ascii=False, indent=2)

print("\n저장 완료:", OUTPUT_DIR)