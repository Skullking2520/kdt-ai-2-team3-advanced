from __future__ import annotations

import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

REQUIRED_MODEL_FILES = (
    "config.json",
    "model.safetensors",
    "tokenizer.json",
    "tokenizer_config.json",
)


class PromotionError(RuntimeError):
    pass


def metric_line(metrics: dict[str, Any]) -> str:
    return (
        f"| {metrics['role']} | {metrics['accuracy']:.6f} | "
        f"{metrics['precision']:.6f} | {metrics['recall']:.6f} | "
        f"{metrics['f1']:.6f} | {metrics['false_positive']} | "
        f"{metrics['false_negative']} |"
    )


def render_model_card(
    *,
    repo_id: str,
    model_version: str,
    manifest: dict[str, Any],
) -> str:
    baseline = manifest["baseline"]
    candidate = manifest["candidate"]
    deltas = manifest["deltas"]
    created_at = datetime.now(timezone.utc).isoformat()

    return f"""---
library_name: transformers
pipeline_tag: text-classification
language:
- ko
tags:
- smishing
- kc-electra
- text-classification
---

# KcELECTRA Smishing Classifier

Repository: `{repo_id}`

Model version: `{model_version}`

This model classifies Korean SMS text as `normal` or `phishing`.

## Labels

| ID | Label | Meaning |
| --- | --- | --- |
| 0 | normal | 일반/정상 문자 |
| 1 | phishing | 스미싱/피싱 의심 문자 |

## Score Meaning

Hugging Face text-classification `score` is the confidence for the predicted
label, not always the phishing probability.

For example:

```json
[
  {{"label": "normal", "score": 0.948}}
]
```

This means the model is 94.8% confident that the message is `normal`.

## Promotion Evaluation

Generated at: `{created_at}`

Evaluation threshold: `{manifest["threshold"]}`

Sample count: `{manifest["sample_count"]}`

| Role | Accuracy | Precision | Recall | F1 | FP | FN |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
{metric_line(baseline)}
{metric_line(candidate)}

## Delta

| Metric | Delta |
| --- | ---: |
| Accuracy | {deltas["accuracy_delta"]:.6f} |
| Precision | {deltas["precision_delta"]:.6f} |
| Recall | {deltas["recall_delta"]:.6f} |
| F1 | {deltas["f1_delta"]:.6f} |
| False Positive | {deltas["false_positive_delta"]} |
| False Negative | {deltas["false_negative_delta"]} |

## Operational Note

Use this model only after reviewing `promotion_manifest.json` and confirming
that `promotion_recommended` is `true`.
"""


def ensure_hf_token_available() -> None:
    if os.environ.get("HF_TOKEN") or os.environ.get("HUGGING_FACE_HUB_TOKEN"):
        return
    raise PromotionError(
        "HF_TOKEN or HUGGING_FACE_HUB_TOKEN is required for Hugging Face upload."
    )


def upload_to_hf(
    *,
    staging_dir: Path,
    repo_id: str,
    private: bool,
    commit_message: str,
) -> str:
    ensure_hf_token_available()
    try:
        from huggingface_hub import HfApi, create_repo
    except ImportError as exc:
        raise PromotionError(
            "huggingface_hub is required for Hugging Face upload."
        ) from exc

    try:
        create_repo(
            repo_id=repo_id,
            repo_type="model",
            private=private,
            exist_ok=True,
        )
        api = HfApi()
        return api.upload_folder(
            folder_path=str(staging_dir),
            repo_id=repo_id,
            repo_type="model",
            commit_message=commit_message,
        )
    except Exception as exc:
        raise PromotionError(
            f"Failed to upload promoted encoder model to Hugging Face repo "
            f"{repo_id!r}."
        ) from exc
