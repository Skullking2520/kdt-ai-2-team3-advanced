from __future__ import annotations

import argparse
import json
import shutil
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


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def ensure_promotable(
    manifest: dict[str, Any],
    *,
    allow_not_recommended: bool,
) -> None:
    if manifest.get("promotion_recommended") is True:
        return
    if allow_not_recommended:
        return
    raise PromotionError(
        "promotion_manifest.json does not recommend promotion. "
        "Use --allow-not-recommended only for manual override."
    )


def resolve_candidate_dir(
    *,
    manifest: dict[str, Any],
    explicit_candidate_dir: Path | None,
) -> Path:
    if explicit_candidate_dir is not None:
        return explicit_candidate_dir

    candidate = manifest.get("candidate", {})
    candidate_path = candidate.get("model_name_or_path")
    if not candidate_path:
        raise PromotionError(
            "Cannot resolve candidate model directory from promotion manifest."
        )
    return Path(candidate_path)


def validate_candidate_dir(candidate_dir: Path) -> None:
    if not candidate_dir.exists() or not candidate_dir.is_dir():
        raise PromotionError(
            f"Candidate model directory does not exist: {candidate_dir}"
        )

    missing = [
        file_name
        for file_name in REQUIRED_MODEL_FILES
        if not (candidate_dir / file_name).exists()
    ]
    if missing:
        raise PromotionError(
            "Candidate model directory is missing required files: "
            + ", ".join(missing)
        )


def infer_version(
    *,
    explicit_version: str | None,
    manifest_path: Path,
) -> str:
    if explicit_version:
        return explicit_version
    run_name = (
        manifest_path.parents[1].name if len(manifest_path.parents) > 1 else "run"
    )
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    return f"{run_name}-{timestamp}"


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


def prepare_staging_dir(
    *,
    candidate_dir: Path,
    staging_dir: Path,
    model_card: str,
    overwrite: bool,
) -> None:
    if staging_dir.exists():
        if not overwrite:
            raise PromotionError(
                f"Staging directory already exists: {staging_dir}. "
                "Use --overwrite-staging to replace it."
            )
        shutil.rmtree(staging_dir)

    ignore = shutil.ignore_patterns(
        "checkpoint-*",
        "runs",
        "wandb",
        "__pycache__",
        "*.bin",
    )
    shutil.copytree(candidate_dir, staging_dir, ignore=ignore)
    (staging_dir / "README.md").write_text(model_card, encoding="utf-8")


def build_promotion_record(
    *,
    manifest_path: Path,
    candidate_dir: Path,
    staging_dir: Path,
    repo_id: str,
    model_version: str,
    dry_run: bool,
    uploaded: bool,
) -> dict[str, Any]:
    return {
        "created_at": datetime.now(timezone.utc).isoformat(),
        "manifest_path": str(manifest_path),
        "candidate_dir": str(candidate_dir),
        "staging_dir": str(staging_dir),
        "repo_id": repo_id,
        "model_version": model_version,
        "dry_run": dry_run,
        "uploaded": uploaded,
    }


def upload_to_hf(
    *,
    staging_dir: Path,
    repo_id: str,
    private: bool,
    commit_message: str,
) -> str:
    from huggingface_hub import HfApi, create_repo

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


def promote_model(
    *,
    manifest_path: Path,
    repo_id: str,
    candidate_dir: Path | None,
    staging_dir: Path | None,
    output_log: Path | None,
    model_version: str | None,
    private: bool,
    dry_run: bool,
    allow_not_recommended: bool,
    overwrite_staging: bool,
) -> dict[str, Any]:
    manifest = load_json(manifest_path)
    ensure_promotable(manifest, allow_not_recommended=allow_not_recommended)

    resolved_candidate_dir = resolve_candidate_dir(
        manifest=manifest,
        explicit_candidate_dir=candidate_dir,
    )
    validate_candidate_dir(resolved_candidate_dir)

    resolved_version = infer_version(
        explicit_version=model_version,
        manifest_path=manifest_path,
    )
    resolved_staging_dir = staging_dir or (
        manifest_path.parents[1] / "hf_upload" / resolved_version
    )
    resolved_output_log = output_log or (
        manifest_path.parents[1] / "promotion_log.json"
    )
    model_card = render_model_card(
        repo_id=repo_id,
        model_version=resolved_version,
        manifest=manifest,
    )

    uploaded = False
    commit_url = None
    if not dry_run:
        prepare_staging_dir(
            candidate_dir=resolved_candidate_dir,
            staging_dir=resolved_staging_dir,
            model_card=model_card,
            overwrite=overwrite_staging,
        )
        commit_message = f"Promote encoder model {resolved_version}"
        commit_url = upload_to_hf(
            staging_dir=resolved_staging_dir,
            repo_id=repo_id,
            private=private,
            commit_message=commit_message,
        )
        uploaded = True

    record = build_promotion_record(
        manifest_path=manifest_path,
        candidate_dir=resolved_candidate_dir,
        staging_dir=resolved_staging_dir,
        repo_id=repo_id,
        model_version=resolved_version,
        dry_run=dry_run,
        uploaded=uploaded,
    )
    record["commit_url"] = commit_url
    record["promotion_recommended"] = manifest.get("promotion_recommended")
    record["candidate_f1"] = manifest["candidate"]["f1"]
    record["baseline_f1"] = manifest["baseline"]["f1"]
    record["f1_delta"] = manifest["deltas"]["f1_delta"]

    write_json(resolved_output_log, record)
    return record


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Promote an encoder candidate model to Hugging Face Hub."
    )
    parser.add_argument("--promotion-manifest", type=Path, required=True)
    parser.add_argument("--repo-id", required=True)
    parser.add_argument("--candidate-dir", type=Path)
    parser.add_argument("--staging-dir", type=Path)
    parser.add_argument("--output-log", type=Path)
    parser.add_argument("--model-version")
    parser.add_argument("--private", action="store_true")
    parser.add_argument("--upload", action="store_true")
    parser.add_argument("--allow-not-recommended", action="store_true")
    parser.add_argument("--overwrite-staging", action="store_true")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    record = promote_model(
        manifest_path=args.promotion_manifest,
        repo_id=args.repo_id,
        candidate_dir=args.candidate_dir,
        staging_dir=args.staging_dir,
        output_log=args.output_log,
        model_version=args.model_version,
        private=args.private,
        dry_run=not args.upload,
        allow_not_recommended=args.allow_not_recommended,
        overwrite_staging=args.overwrite_staging,
    )
    print(json.dumps(record, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
