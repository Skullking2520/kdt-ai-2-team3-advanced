import os
import json
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

DATA_PATH = "cleaned_dataset_aug_50_mixed_balanced.jsonl"

# 기존 final model 경로
BASE_MODEL_PATH = "./final_model"

# aug-50 재학습 모델 저장 경로
OUTPUT_DIR = "./final_model_aug_50"

RANDOM_STATE = 42
MAX_LENGTH = 128


# =========================
# 2. 데이터 로드
# =========================

df = pd.read_json(DATA_PATH, lines=True)

print("데이터 개수:", len(df))
print("컬럼:", df.columns.tolist())
print("라벨 분포:")
print(df["label"].value_counts())

# text, label만 사용
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

print("\nTrain:", len(train_df))
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
        pos_label=1
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
    output_dir=OUTPUT_DIR,

    num_train_epochs=3,
    learning_rate=2e-5,
    per_device_train_batch_size=16,
    per_device_eval_batch_size=16,

    eval_strategy="epoch",
    save_strategy="epoch",
    logging_strategy="steps",
    logging_steps=100,

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

print("\n최종 평가 결과")
print(eval_result)


# =========================
# 11. 모델 저장
# =========================

trainer.save_model(OUTPUT_DIR)
tokenizer.save_pretrained(OUTPUT_DIR)

with open(os.path.join(OUTPUT_DIR, "eval_result.json"), "w", encoding="utf-8") as f:
    json.dump(eval_result, f, ensure_ascii=False, indent=2)

print("\n저장 완료:", OUTPUT_DIR)