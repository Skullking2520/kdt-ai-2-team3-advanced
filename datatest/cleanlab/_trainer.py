from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
import torch
from datasets import Dataset
from sklearn.model_selection import StratifiedKFold
from transformers import (
    AutoModelForSequenceClassification,
    AutoTokenizer,
    DataCollatorWithPadding,
    Trainer,
    TrainingArguments,
)

from ._device import DEVICE, clear_memory

BASE_MODEL = "beomi/KcELECTRA-base"
FINETUNED_MODEL = "kdt-2-team4-newbiz/kcelectra-smishing-classifier"
NUM_LABELS = 2
SEED = 42


def _tokenize_df(tokenizer: AutoTokenizer, df: pd.DataFrame, max_length: int) -> Dataset:
    ds = Dataset.from_pandas(df.reset_index(drop=True))
    ds = ds.map(
        lambda batch: tokenizer(batch["text"], truncation=True, max_length=max_length),
        batched=True,
        remove_columns=["text"],
    )
    return ds.rename_column("label", "labels")


def generate_pred_probs_direct(
    df: pd.DataFrame,
    tokenizer: AutoTokenizer,
    max_length: int,
    batch_size: int,
    tmp_dir: Path,
) -> np.ndarray:
    """이미 학습된 모델로 1회 추론. in-sample 편향 주의."""
    print(f"Loading fine-tuned model: {FINETUNED_MODEL}")
    model = AutoModelForSequenceClassification.from_pretrained(FINETUNED_MODEL, num_labels=NUM_LABELS)
    model.to(DEVICE)
    model.eval()

    ds = _tokenize_df(tokenizer, df, max_length)
    trainer = Trainer(
        model=model,
        args=TrainingArguments(
            output_dir=str(tmp_dir),
            per_device_eval_batch_size=batch_size * 2,
            report_to="none",
            seed=SEED,
        ),
        data_collator=DataCollatorWithPadding(tokenizer),
    )
    raw = trainer.predict(ds)
    pred_probs = torch.softmax(torch.tensor(raw.predictions), dim=-1).numpy().astype(np.float32)

    del trainer, model, ds
    clear_memory()
    return pred_probs


def generate_pred_probs_kfold(
    df: pd.DataFrame,
    tokenizer: AutoTokenizer,
    output_dir: Path,
    n_splits: int,
    params: dict[str, Any],
) -> np.ndarray:
    """K-fold 교차검증으로 out-of-sample pred_probs (N, 2) 생성."""
    pred_probs = np.zeros((len(df), NUM_LABELS), dtype=np.float32)
    labels = df["label"].values
    skf = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=SEED)

    for fold, (train_idx, val_idx) in enumerate(skf.split(np.zeros(len(df)), labels)):
        print(f"\n--- Fold {fold + 1}/{n_splits} | train={len(train_idx):,} val={len(val_idx):,} ---")

        train_ds = _tokenize_df(tokenizer, df.iloc[train_idx].reset_index(drop=True), params["max_length"])
        val_ds = _tokenize_df(tokenizer, df.iloc[val_idx].reset_index(drop=True), params["max_length"])

        model = AutoModelForSequenceClassification.from_pretrained(BASE_MODEL, num_labels=NUM_LABELS)
        model.to(DEVICE)

        trainer = Trainer(
            model=model,
            args=TrainingArguments(
                output_dir=str(output_dir / f"fold_{fold}"),
                num_train_epochs=params["epochs"],
                per_device_train_batch_size=params["batch_size"],
                per_device_eval_batch_size=params["batch_size"] * 2,
                learning_rate=params["learning_rate"],
                weight_decay=0.01,
                warmup_ratio=0.06,
                eval_strategy="epoch",
                save_strategy="no",
                logging_strategy="epoch",
                load_best_model_at_end=False,
                seed=SEED,
                report_to="none",
            ),
            train_dataset=train_ds,
            eval_dataset=val_ds,
            data_collator=DataCollatorWithPadding(tokenizer),
        )
        trainer.train()

        raw = trainer.predict(val_ds)
        pred_probs[val_idx] = torch.softmax(torch.tensor(raw.predictions), dim=-1).numpy()

        del trainer, model, train_ds, val_ds
        clear_memory()

    pred_probs = np.clip(pred_probs, 1e-6, 1 - 1e-6)
    pred_probs /= pred_probs.sum(axis=1, keepdims=True)
    return pred_probs
