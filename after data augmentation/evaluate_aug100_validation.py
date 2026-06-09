import pandas as pd
import torch

from sklearn.model_selection import train_test_split
from sklearn.metrics import confusion_matrix, precision_recall_fscore_support, accuracy_score
from transformers import AutoTokenizer, AutoModelForSequenceClassification


# =========================
# 1. 경로 설정
# =========================

MODEL_PATH = "./final_model_aug_100"
DATA_PATH = "cleaned_dataset_aug_100_mixed_balanced.jsonl"

RANDOM_STATE = 42
MAX_LENGTH = 128
BATCH_SIZE = 64


# =========================
# 2. 데이터 로드
# =========================

df = pd.read_json(DATA_PATH, lines=True)
df = df[["text", "label"]].dropna()
df["label"] = df["label"].astype(int)

print("전체 데이터 수:", len(df))
print("전체 라벨 분포:")
print(df["label"].value_counts())


# =========================
# 3. 학습 때와 같은 validation split 재현
# =========================

train_df, valid_df = train_test_split(
    df,
    test_size=0.1,
    random_state=RANDOM_STATE,
    stratify=df["label"]
)

print("\nValidation 데이터 수:", len(valid_df))
print("Validation 라벨 분포:")
print(valid_df["label"].value_counts())


# =========================
# 4. 모델 로드
# =========================

device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")
print("\n사용 device:", device)

tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_PATH)

model.to(device)
model.eval()


# =========================
# 5. 예측
# =========================

texts = valid_df["text"].tolist()
labels = valid_df["label"].tolist()

all_preds = []

for i in range(0, len(texts), BATCH_SIZE):
    batch_texts = texts[i:i + BATCH_SIZE]

    inputs = tokenizer(
        batch_texts,
        truncation=True,
        padding=True,
        max_length=MAX_LENGTH,
        return_tensors="pt"
    )

    inputs = {k: v.to(device) for k, v in inputs.items()}

    with torch.no_grad():
        outputs = model(**inputs)
        probs = torch.softmax(outputs.logits, dim=-1)
        preds = torch.argmax(probs, dim=-1)

    all_preds.extend(preds.cpu().numpy())


# =========================
# 6. 전체 검증 성능 계산
# =========================

y_true = labels
y_pred = all_preds

tn, fp, fn, tp = confusion_matrix(y_true, y_pred).ravel()

accuracy = accuracy_score(y_true, y_pred)

precision, recall, f1, _ = precision_recall_fscore_support(
    y_true,
    y_pred,
    average="binary",
    pos_label=1,
    zero_division=0
)

print("\n===== aug-50 전체 validation 평가 결과 =====")
print("TN:", tn)
print("FP:", fp)
print("FN:", fn)
print("TP:", tp)
print("Accuracy:", round(accuracy, 4))
print("Precision:", round(precision, 4))
print("Recall:", round(recall, 4))
print("F1:", round(f1, 4))