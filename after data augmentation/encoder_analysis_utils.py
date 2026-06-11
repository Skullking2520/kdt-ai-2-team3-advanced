from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
import torch
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    precision_recall_fscore_support,
)
from sklearn.model_selection import train_test_split
from transformers import AutoModelForSequenceClassification, AutoTokenizer

TEXT_COL = "text"
LABEL_COL = "label"
SEED = 42
DEFAULT_KEYWORDS = (
    "배송",
    "계좌",
    "인증",
    "카드",
    "정지",
    "환급",
    "대출",
    "쿠폰",
    "링크",
    "본인확인",
    "결제",
    "보안",
    "차단",
    "오류",
    "반송",
    "개인정보",
    "수수료",
    "이벤트",
)


def normalize_label(raw_label: Any) -> int | None:
    if raw_label in [0, 0.0, "0", "0.0", "normal", "정상"]:
        return 0
    if raw_label in [1, 1.0, "1", "1.0", "phishing", "스미싱"]:
        return 1
    return None


def load_labeled_dataset(path: Path) -> pd.DataFrame:
    match path.suffix.lower():
        case ".jsonl":
            return load_jsonl(path)
        case ".csv":
            return load_csv(path)
    raise ValueError(f"Unsupported dataset format: {path.suffix}")


def load_jsonl(path: Path) -> pd.DataFrame:
    rows: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as file:
        for line_num, line in enumerate(file, start=1):
            line = line.strip()
            if not line:
                continue
            try:
                row = json.loads(line)
            except json.JSONDecodeError:
                print(f"Bad JSON skipped: line {line_num}")
                continue
            normalized = normalize_row(row)
            if normalized is not None:
                rows.append(normalized)
    return build_dataframe(rows, path)


def load_csv(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path)
    rows = [
        normalized
        for row in df.to_dict(orient="records")
        if (normalized := normalize_row(row)) is not None
    ]
    return build_dataframe(rows, path)


def normalize_row(row: dict[str, Any]) -> dict[str, Any] | None:
    text = row.get(TEXT_COL)
    label = normalize_label(row.get(LABEL_COL))
    if text is None or str(text).strip() == "" or label is None:
        return None
    normalized = dict(row)
    normalized[TEXT_COL] = str(text)
    normalized[LABEL_COL] = label
    return normalized


def build_dataframe(rows: list[dict[str, Any]], path: Path) -> pd.DataFrame:
    if not rows:
        raise ValueError(f"No usable rows found in {path}")
    return pd.DataFrame(rows)


def split_dataset(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    train_df, temp_df = train_test_split(
        df,
        test_size=0.2,
        random_state=SEED,
        stratify=df[LABEL_COL],
    )
    valid_df, test_df = train_test_split(
        temp_df,
        test_size=0.5,
        random_state=SEED,
        stratify=temp_df[LABEL_COL],
    )
    return train_df, valid_df, test_df


def detect_keywords(
    text: str,
    keywords: tuple[str, ...] = DEFAULT_KEYWORDS,
) -> list[str]:
    lowered = text.lower()
    return [keyword for keyword in keywords if keyword.lower() in lowered]


def predict_texts(
    model_path: Path | str,
    texts: list[str],
    batch_size: int,
    max_length: int,
) -> tuple[np.ndarray, np.ndarray]:
    device = get_device()
    tokenizer = AutoTokenizer.from_pretrained(model_path)
    model = AutoModelForSequenceClassification.from_pretrained(model_path)
    model.to(device)
    model.eval()

    all_probabilities: list[np.ndarray] = []
    for start in range(0, len(texts), batch_size):
        batch_texts = texts[start : start + batch_size]
        encoded = tokenizer(
            batch_texts,
            padding=True,
            truncation=True,
            max_length=max_length,
            return_tensors="pt",
        )
        encoded = {key: value.to(device) for key, value in encoded.items()}
        with torch.no_grad():
            logits = model(**encoded).logits
            probabilities = torch.softmax(logits, dim=-1).detach().cpu().numpy()
        all_probabilities.append(probabilities)

    probability_matrix = np.concatenate(all_probabilities, axis=0)
    phishing_probabilities = probability_matrix[:, 1]
    return phishing_probabilities, (phishing_probabilities >= 0.5).astype(int)


def get_device() -> str:
    if torch.backends.mps.is_available():
        return "mps"
    if torch.cuda.is_available():
        return "cuda"
    return "cpu"


def compute_threshold_metrics(
    labels: np.ndarray,
    probabilities: np.ndarray,
    threshold: float,
) -> dict[str, float | int]:
    predictions = (probabilities >= threshold).astype(int)
    precision, recall, f1, _ = precision_recall_fscore_support(
        labels,
        predictions,
        average="binary",
        pos_label=1,
        zero_division=0,
    )
    tn, fp, fn, tp = confusion_matrix(labels, predictions, labels=[0, 1]).ravel()
    normal_count = int(tn + fp)
    phishing_count = int(tp + fn)
    return {
        "threshold": threshold,
        "accuracy": float(accuracy_score(labels, predictions)),
        "precision": float(precision),
        "recall": float(recall),
        "f1": float(f1),
        "false_positive_count": int(fp),
        "false_negative_count": int(fn),
        "false_positive_rate": float(fp / normal_count) if normal_count else 0.0,
        "false_negative_rate": float(fn / phishing_count) if phishing_count else 0.0,
    }


def compute_group_metrics(group_df: pd.DataFrame) -> dict[str, float | int]:
    labels = group_df["label"].to_numpy(dtype=int)
    predictions = group_df["pred_label"].to_numpy(dtype=int)
    precision, recall, f1, _ = precision_recall_fscore_support(
        labels,
        predictions,
        average="binary",
        pos_label=1,
        zero_division=0,
    )
    tn, fp, fn, tp = confusion_matrix(labels, predictions, labels=[0, 1]).ravel()
    normal_count = int(tn + fp)
    phishing_count = int(tp + fn)
    return {
        "accuracy": float(accuracy_score(labels, predictions)),
        "precision": float(precision),
        "recall": float(recall),
        "f1": float(f1),
        "false_positive_rate": float(fp / normal_count) if normal_count else 0.0,
        "false_negative_rate": float(fn / phishing_count) if phishing_count else 0.0,
        "sample_count": int(len(group_df)),
    }
