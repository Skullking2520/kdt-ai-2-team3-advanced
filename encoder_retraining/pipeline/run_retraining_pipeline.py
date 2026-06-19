from __future__ import annotations

import argparse
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from build_training_dataset import build_dataset
from compare_encoder_models import compare_models

DEFAULT_BASELINE_MODEL = "kdt-2-team4-newbiz/kcelectra-smishing-classifier"

TRAINING_SCRIPT = (
    Path(__file__).resolve().parents[1]
    / "training"
    / "run_kcelectra_retrain_experiments.py"
)


def build_training_command(
    *,
    train_path: Path,
    valid_path: Path,
    test_path: Path,
    model_name_or_path: str,
    results_dir: Path,
    n_trials: int,
    epochs: int,
    experiments: list[str],
    skip_optuna: bool,
    wandb_mode: str | None,
) -> list[str]:
    command = [
        sys.executable,
        str(TRAINING_SCRIPT),
        "--train-path",
        str(train_path),
        "--valid-path",
        str(valid_path),
        "--test-path",
        str(test_path),
        "--model-name-or-path",
        model_name_or_path,
        "--results-dir",
        str(results_dir),
        "--n-trials",
        str(n_trials),
        "--epochs",
        str(epochs),
        "--experiments",
        *experiments,
    ]
    if skip_optuna:
        command.append("--skip-optuna")
    if wandb_mode is not None:
        command.extend(["--wandb-mode", wandb_mode])
    return command


def run_command(
    command: list[str],
    *,
    dry_run: bool,
    log_dir: Path,
) -> dict[str, Any]:
    stdout_path = log_dir / "training_stdout.log"
    stderr_path = log_dir / "training_stderr.log"
    if dry_run:
        return {
            "command": command,
            "skipped": True,
            "returncode": None,
            "stdout_log": str(stdout_path),
            "stderr_log": str(stderr_path),
        }
    log_dir.mkdir(parents=True, exist_ok=True)
    with stdout_path.open("w", encoding="utf-8") as stdout_file:
        with stderr_path.open("w", encoding="utf-8") as stderr_file:
            completed = subprocess.run(
                command,
                check=False,
                stdout=stdout_file,
                stderr=stderr_file,
            )
    return {
        "command": command,
        "skipped": False,
        "returncode": completed.returncode,
        "succeeded": completed.returncode == 0,
        "stdout_log": str(stdout_path),
        "stderr_log": str(stderr_path),
    }


def resolve_candidate_model(
    *,
    explicit_candidate_model: str | None,
    training_results_dir: Path,
    candidate_experiment: str,
) -> str:
    if explicit_candidate_model:
        return explicit_candidate_model
    return str(training_results_dir / candidate_experiment / "final_model")


def run_pipeline(
    *,
    prepared_dir: Path | None,
    base_path: Path | None,
    incremental_path: Path | None,
    baseline_model: str,
    output_dir: Path,
    candidate_model: str | None,
    candidate_experiment: str,
    max_per_source: int | None,
    skip_training: bool,
    skip_comparison: bool,
    dry_run: bool,
    n_trials: int,
    epochs: int,
    experiments: list[str],
    skip_optuna: bool,
    wandb_mode: str | None,
    threshold: float,
    min_f1_delta: float,
    max_fp_increase: int,
    max_fn_increase: int,
    batch_size: int,
    max_length: int,
    device: str,
) -> dict[str, Any]:
    output_dir.mkdir(parents=True, exist_ok=False)
    dataset_dir = output_dir / "dataset"
    training_results_dir = output_dir / "training"
    evaluation_dir = output_dir / "evaluation"

    manifest: dict[str, Any] = {
        "created_at": datetime.now(timezone.utc).isoformat(),
        "prepared_dir": str(prepared_dir) if prepared_dir else None,
        "base_path": str(base_path) if base_path else None,
        "incremental_path": str(incremental_path) if incremental_path else None,
        "baseline_model": baseline_model,
        "output_dir": str(output_dir),
        "dry_run": dry_run,
        "steps": {},
    }

    if prepared_dir is not None:
        train_path = prepared_dir / "cleaned_train.jsonl"
        valid_path = prepared_dir / "valid.jsonl"
        test_path = prepared_dir / "test.jsonl"
        for required_path in (train_path, valid_path, test_path):
            if not required_path.exists():
                raise FileNotFoundError(
                    f"Prepared dataset file is missing: {required_path}"
                )
        manifest["steps"]["prepared_dataset"] = {
            "prepared_dir": str(prepared_dir),
            "train_path": str(train_path),
            "valid_path": str(valid_path),
            "test_path": str(test_path),
            "manifest_path": str(prepared_dir / "manifest.json"),
        }
        manifest["steps"]["build_dataset"] = {
            "skipped": True,
            "reason": "prepared_dir_provided",
        }
        manifest["steps"]["generate_pred_probs"] = {
            "skipped": True,
            "reason": "prepared_dir_provided",
        }
        manifest["steps"]["cleanlab"] = {
            "skipped": True,
            "reason": "prepared_dir_provided",
        }
    else:
        if base_path is None or incremental_path is None:
            raise ValueError(
                "Either --prepared-dir or both --base-path and "
                "--incremental-path are required."
            )
        dataset_manifest = build_dataset(
            base_path=base_path,
            incremental_path=incremental_path,
            output_dir=dataset_dir,
            max_per_source=max_per_source,
        )
        manifest["steps"]["build_dataset"] = dataset_manifest

        manifest["steps"]["generate_pred_probs"] = {
            "skipped": True,
            "reason": "cleanlab_is_external",
        }
        manifest["steps"]["cleanlab"] = {
            "skipped": True,
            "reason": "cleanlab_is_external",
        }
        train_path = dataset_dir / "train.jsonl"
        valid_path = dataset_dir / "valid.jsonl"
        test_path = dataset_dir / "test.jsonl"

    training_command: list[str] | None = None
    if not skip_training:
        training_command = build_training_command(
            train_path=train_path,
            valid_path=valid_path,
            test_path=test_path,
            model_name_or_path=baseline_model,
            results_dir=training_results_dir,
            n_trials=n_trials,
            epochs=epochs,
            experiments=experiments,
            skip_optuna=skip_optuna,
            wandb_mode=wandb_mode,
        )
        manifest["steps"]["training"] = run_command(
            training_command,
            dry_run=dry_run,
            log_dir=output_dir / "logs",
        )
    else:
        manifest["steps"]["training"] = {"skipped": True}

    resolved_candidate_model = resolve_candidate_model(
        explicit_candidate_model=candidate_model,
        training_results_dir=training_results_dir,
        candidate_experiment=candidate_experiment,
    )
    manifest["candidate_model"] = resolved_candidate_model

    training_succeeded = manifest["steps"]["training"].get("succeeded", True)
    if not skip_comparison and not dry_run and training_succeeded:
        comparison_summary = compare_models(
            test_path=test_path,
            baseline_model=baseline_model,
            candidate_model=resolved_candidate_model,
            output_dir=evaluation_dir,
            threshold=threshold,
            min_f1_delta=min_f1_delta,
            max_fp_increase=max_fp_increase,
            max_fn_increase=max_fn_increase,
            batch_size=batch_size,
            max_length=max_length,
            device=device,
        )
        manifest["steps"]["comparison"] = comparison_summary
    else:
        reason = "dry_run" if dry_run else "skip_comparison"
        if not training_succeeded:
            reason = "training_failed"
        manifest["steps"]["comparison"] = {
            "skipped": True,
            "reason": reason,
        }

    manifest_path = output_dir / "retraining_pipeline_manifest.json"
    manifest_path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return manifest


def should_fail_cli(summary: dict[str, Any], *, dry_run: bool) -> bool:
    if dry_run:
        return False
    training_step = summary.get("steps", {}).get("training", {})
    return training_step.get("succeeded") is False


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run the encoder retraining pipeline end to end."
    )
    parser.add_argument(
        "--prepared-dir",
        type=Path,
        help=(
            "Directory containing cleaned_train.jsonl, valid.jsonl, and "
            "test.jsonl. When provided, dataset build and Cleanlab steps "
            "are skipped."
        ),
    )
    parser.add_argument("--base-path", type=Path)
    parser.add_argument("--incremental-path", type=Path)
    parser.add_argument("--baseline-model", default=DEFAULT_BASELINE_MODEL)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--candidate-model")
    parser.add_argument("--candidate-experiment", default="focal_no_oversampling")
    parser.add_argument("--max-per-source", type=int)
    parser.add_argument("--skip-training", action="store_true")
    parser.add_argument("--skip-comparison", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--n-trials", type=int, default=1)
    parser.add_argument("--epochs", type=int, default=3)
    parser.add_argument(
        "--experiments",
        nargs="*",
        default=["focal_no_oversampling"],
    )
    parser.add_argument("--skip-optuna", action="store_true")
    parser.add_argument(
        "--wandb-mode",
        choices=("online", "offline", "disabled"),
        default="disabled",
    )
    parser.add_argument("--threshold", type=float, default=0.5)
    parser.add_argument("--min-f1-delta", type=float, default=0.0)
    parser.add_argument("--max-fp-increase", type=int, default=0)
    parser.add_argument("--max-fn-increase", type=int, default=0)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--max-length", type=int, default=128)
    parser.add_argument(
        "--device",
        choices=("auto", "cpu", "mps", "cuda"),
        default="auto",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.max_per_source is not None and args.max_per_source < 1:
        raise ValueError("--max-per-source must be at least 1")
    if args.n_trials < 1:
        raise ValueError("--n-trials must be at least 1")
    if args.epochs < 1:
        raise ValueError("--epochs must be at least 1")
    if not args.experiments:
        raise ValueError("--experiments must include at least one experiment")
    if not 0 <= args.threshold <= 1:
        raise ValueError("--threshold must be between 0 and 1")
    if args.batch_size < 1:
        raise ValueError("--batch-size must be at least 1")
    if args.max_length < 1:
        raise ValueError("--max-length must be at least 1")
    if (
        args.skip_training
        and not args.skip_comparison
        and not args.dry_run
        and args.candidate_model is None
    ):
        raise ValueError(
            "--candidate-model is required when --skip-training is used "
            "with comparison enabled."
        )

    summary = run_pipeline(
        prepared_dir=args.prepared_dir,
        base_path=args.base_path,
        incremental_path=args.incremental_path,
        baseline_model=args.baseline_model,
        output_dir=args.output_dir,
        candidate_model=args.candidate_model,
        candidate_experiment=args.candidate_experiment,
        max_per_source=args.max_per_source,
        skip_training=args.skip_training,
        skip_comparison=args.skip_comparison,
        dry_run=args.dry_run,
        n_trials=args.n_trials,
        epochs=args.epochs,
        experiments=args.experiments,
        skip_optuna=args.skip_optuna,
        wandb_mode=args.wandb_mode,
        threshold=args.threshold,
        min_f1_delta=args.min_f1_delta,
        max_fp_increase=args.max_fp_increase,
        max_fn_increase=args.max_fn_increase,
        batch_size=args.batch_size,
        max_length=args.max_length,
        device=args.device,
    )
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    if should_fail_cli(summary, dry_run=args.dry_run):
        print(
            "Encoder retraining failed. See training stdout/stderr logs in the "
            "pipeline manifest for details.",
            file=sys.stderr,
        )
        raise SystemExit(1)


if __name__ == "__main__":
    main()
