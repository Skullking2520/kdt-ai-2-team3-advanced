from __future__ import annotations

import argparse
import csv
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np


def load_jsonl(path: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as file:
        for line_number, line in enumerate(file, start=1):
            line = line.strip()
            if not line:
                continue
            try:
                row = json.loads(line)
                row["text"] = str(row["text"]).strip()
                row["label"] = int(row["label"])
            except (json.JSONDecodeError, KeyError, TypeError, ValueError) as exc:
                raise ValueError(f"Invalid row at {path}:{line_number}") from exc
            if row["label"] not in (0, 1):
                raise ValueError(f"Unsupported label at {path}:{line_number}")
            if row["text"]:
                rows.append(row)
    if not rows:
        raise ValueError(f"No usable rows found in {path}")
    return rows


def normalize_label_name(value: Any) -> str:
    normalized = str(value).strip().casefold()
    if normalized in {"0", "label_0", "normal", "정상"}:
        return "normal"
    if normalized in {"1", "label_1", "phishing", "smishing", "스미싱"}:
        return "phishing"
    return normalized


def resolve_label_indices(id2label: dict[Any, Any], num_labels: int) -> dict[str, int]:
    if num_labels != 2:
        raise ValueError(f"Encoder must be binary classification, got {num_labels}")

    normalized: dict[str, int] = {}
    for key, value in id2label.items():
        try:
            index = int(key)
        except (TypeError, ValueError):
            index = int(value) if str(value).isdigit() else -1
        label_name = normalize_label_name(value)
        if label_name in {"normal", "phishing"} and index in (0, 1):
            normalized[label_name] = index

    if not normalized:
        normalized = {"normal": 0, "phishing": 1}
    if set(normalized) != {"normal", "phishing"}:
        raise ValueError(
            "Model config must identify both normal and phishing labels. "
            f"Got: {id2label}"
        )
    return normalized


def choose_device(device: str) -> str:
    if device != "auto":
        return device
    import torch

    if torch.backends.mps.is_available():
        return "mps"
    if torch.cuda.is_available():
        return "cuda"
    return "cpu"


def predict_probabilities(
    *,
    rows: list[dict[str, Any]],
    model_name_or_path: str,
    batch_size: int,
    max_length: int,
    device: str,
) -> tuple[np.ndarray, dict[str, Any]]:
    import torch
    from transformers import AutoModelForSequenceClassification, AutoTokenizer

    selected_device = choose_device(device)
    tokenizer = AutoTokenizer.from_pretrained(model_name_or_path)
    model = AutoModelForSequenceClassification.from_pretrained(model_name_or_path)
    model.to(selected_device)
    model.eval()

    label_indices = resolve_label_indices(
        getattr(model.config, "id2label", {}),
        int(getattr(model.config, "num_labels", 2)),
    )
    probabilities: list[list[float]] = []
    for start in range(0, len(rows), batch_size):
        texts = [row["text"] for row in rows[start : start + batch_size]]
        encoded = tokenizer(
            texts,
            padding=True,
            truncation=True,
            max_length=max_length,
            return_tensors="pt",
        )
        encoded = {key: value.to(selected_device) for key, value in encoded.items()}
        with torch.no_grad():
            logits = model(**encoded).logits
            batch_probs = torch.softmax(logits, dim=-1).detach().cpu().numpy()
        for row_probs in batch_probs:
            probabilities.append(
                [
                    float(row_probs[label_indices["normal"]]),
                    float(row_probs[label_indices["phishing"]]),
                ]
            )

    pred_probs = np.asarray(probabilities, dtype=float)
    if pred_probs.shape != (len(rows), 2):
        raise RuntimeError(f"Unexpected pred_probs shape: {pred_probs.shape}")
    metadata = {
        "model_name_or_path": model_name_or_path,
        "device": selected_device,
        "batch_size": batch_size,
        "max_length": max_length,
        "label_indices": label_indices,
    }
    return pred_probs, metadata


def write_outputs(
    *,
    rows: list[dict[str, Any]],
    pred_probs: np.ndarray,
    output_dir: Path,
    metadata: dict[str, Any],
    preview_limit: int,
) -> dict[str, Any]:
    output_dir.mkdir(parents=True, exist_ok=False)
    pred_probs_path = output_dir / "pred_probs.npy"
    preview_path = output_dir / "pred_probs_preview.csv"
    manifest_path = output_dir / "pred_probs_manifest.json"
    np.save(pred_probs_path, pred_probs)

    with preview_path.open("w", encoding="utf-8", newline="") as file:
        writer = csv.DictWriter(
            file,
            fieldnames=[
                "row_index",
                "label",
                "prob_normal",
                "prob_phishing",
                "pred_label",
                "source",
                "text",
            ],
        )
        writer.writeheader()
        for index, row in enumerate(rows[:preview_limit]):
            prob_normal = float(pred_probs[index][0])
            prob_phishing = float(pred_probs[index][1])
            writer.writerow(
                {
                    "row_index": index,
                    "label": row["label"],
                    "prob_normal": prob_normal,
                    "prob_phishing": prob_phishing,
                    "pred_label": int(prob_phishing > prob_normal),
                    "source": row.get("source") or "",
                    "text": row["text"],
                }
            )

    labels = np.asarray([row["label"] for row in rows], dtype=int)
    predictions = pred_probs.argmax(axis=1)
    summary = {
        "created_at": datetime.now(timezone.utc).isoformat(),
        "row_count": len(rows),
        "pred_probs_path": pred_probs_path.name,
        "preview_path": preview_path.name,
        "agreement_rate": float((labels == predictions).mean()),
        "metadata": metadata,
    }
    manifest_path.write_text(
        json.dumps(summary, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return summary


def generate_pred_probs(
    *,
    train_path: Path,
    output_dir: Path,
    model_name_or_path: str,
    batch_size: int,
    max_length: int,
    device: str,
    preview_limit: int,
) -> dict[str, Any]:
    rows = load_jsonl(train_path)
    pred_probs, metadata = predict_probabilities(
        rows=rows,
        model_name_or_path=model_name_or_path,
        batch_size=batch_size,
        max_length=max_length,
        device=device,
    )
    metadata["train_path"] = str(train_path)
    return write_outputs(
        rows=rows,
        pred_probs=pred_probs,
        output_dir=output_dir,
        metadata=metadata,
        preview_limit=preview_limit,
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate encoder prediction probabilities for Cleanlab."
    )
    parser.add_argument("--train-path", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument(
        "--model-name-or-path",
        required=True,
        help="Local model directory or Hugging Face model id.",
    )
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--max-length", type=int, default=128)
    parser.add_argument(
        "--device",
        choices=("auto", "cpu", "mps", "cuda"),
        default="auto",
    )
    parser.add_argument("--preview-limit", type=int, default=200)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.batch_size < 1:
        raise ValueError("--batch-size must be at least 1")
    if args.max_length < 1:
        raise ValueError("--max-length must be at least 1")
    if args.preview_limit < 0:
        raise ValueError("--preview-limit must be zero or greater")
    summary = generate_pred_probs(
        train_path=args.train_path,
        output_dir=args.output_dir,
        model_name_or_path=args.model_name_or_path,
        batch_size=args.batch_size,
        max_length=args.max_length,
        device=args.device,
        preview_limit=args.preview_limit,
    )
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
