from __future__ import annotations

import argparse
import gc
import inspect
import json
import os
import time
import warnings
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

import numpy as np
import optuna
import pandas as pd
import torch
from datasets import Dataset
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    precision_recall_fscore_support,
)
from sklearn.model_selection import train_test_split
from transformers import (
    AutoModelForSequenceClassification,
    AutoTokenizer,
    DataCollatorWithPadding,
    Trainer,
    TrainingArguments,
    set_seed,
)

warnings.filterwarnings("ignore")
os.environ.setdefault("PYTORCH_ENABLE_MPS_FALLBACK", "1")


DEFAULT_DATA_PATH = Path(__file__).resolve().parents[2] / "cleaned_dataset.jsonl"
DEFAULT_RESULTS_DIR = Path(__file__).resolve().parents[1] / "results"
DEFAULT_MODEL_NAME = "kdt-2-team4-newbiz/kcelectra-smishing-classifier"
TEXT_COL = "text"
LABEL_COL = "label"
SEED = 42
NUM_LABELS = 2
FOCAL_GAMMA = 1.5
DEFAULT_EPOCHS = 3
OVERSAMPLING_RATIOS = (0.2, 0.3, 0.4, 0.5, 0.6, 0.7)


@dataclass(frozen=True)
class ExperimentConfig:
    name: str
    use_focal_loss: bool
    positive_oversampling_ratio: float | None = None


@dataclass
class ExperimentResult:
    experiment_name: str
    use_focal_loss: bool
    positive_oversampling_ratio: float | None
    optuna_trial_number: int
    optuna_valid_f1: float
    test_acc: float
    test_f1: float
    test_precision: float
    test_recall: float
    test_fp: int
    test_fn: int
    test_tn: int
    test_tp: int
    elapsed_minutes: float
    model_dir: str
    best_params_path: str
    metrics_path: str


@dataclass(frozen=True)
class WandbConfig:
    enabled: bool
    project: str
    entity: str | None
    group: str | None
    run_prefix: str
    mode: str | None


EXPERIMENTS = [
    ExperimentConfig(name="ce_no_oversampling", use_focal_loss=False),
    ExperimentConfig(name="focal_no_oversampling", use_focal_loss=True),
    *[
        ExperimentConfig(
            name=f"focal_positive_oversampling_{str(ratio).replace('.', 'p')}",
            use_focal_loss=True,
            positive_oversampling_ratio=ratio,
        )
        for ratio in OVERSAMPLING_RATIOS
    ],
]


def get_device() -> str:
    if torch.backends.mps.is_available():
        return "mps"
    if torch.cuda.is_available():
        return "cuda"
    return "cpu"


DEVICE = get_device()


def clear_memory() -> None:
    gc.collect()
    if DEVICE == "mps":
        torch.mps.empty_cache()
    elif torch.cuda.is_available():
        torch.cuda.empty_cache()


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

            text = row.get(TEXT_COL)
            label = normalize_label(row.get(LABEL_COL))
            if text is None or str(text).strip() == "" or label is None:
                continue

            rows.append({"text": str(text), "label": label})

    if not rows:
        raise ValueError(f"No usable rows found in {path}")

    return pd.DataFrame(rows)


def normalize_label(raw_label: Any) -> int | None:
    if raw_label in [0, 0.0, "0", "0.0"]:
        return 0
    if raw_label in [1, 1.0, "1", "1.0"]:
        return 1
    return None


def split_dataset(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    train_df, temp_df = train_test_split(
        df,
        test_size=0.2,
        random_state=SEED,
        stratify=df["label"],
    )
    valid_df, test_df = train_test_split(
        temp_df,
        test_size=0.5,
        random_state=SEED,
        stratify=temp_df["label"],
    )
    return train_df, valid_df, test_df


def load_dataset_splits(
    *,
    data_path: Path,
    train_path: Path | None,
    valid_path: Path | None,
    test_path: Path | None,
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    split_paths = (train_path, valid_path, test_path)
    if any(path is not None for path in split_paths):
        if not all(path is not None for path in split_paths):
            raise ValueError(
                "--train-path, --valid-path, and --test-path "
                "must be provided together"
            )
        assert train_path is not None
        assert valid_path is not None
        assert test_path is not None
        return (
            load_jsonl(train_path),
            load_jsonl(valid_path),
            load_jsonl(test_path),
        )

    return split_dataset(load_jsonl(data_path))


def apply_positive_oversampling(
    train_df: pd.DataFrame,
    ratio: float | None,
) -> pd.DataFrame:
    if ratio is None:
        return train_df

    normal_df = train_df[train_df["label"] == 0]
    positive_df = train_df[train_df["label"] == 1]
    target_positive_count = int(round(len(normal_df) * ratio))

    if len(positive_df) == 0 or len(positive_df) >= target_positive_count:
        return train_df

    sampled_positive_df = positive_df.sample(
        n=target_positive_count - len(positive_df),
        replace=True,
        random_state=SEED,
    )
    oversampled_df = pd.concat([train_df, sampled_positive_df], axis=0)
    return oversampled_df.sample(frac=1.0, random_state=SEED).reset_index(drop=True)


def tokenize_dataframe(
    tokenizer: AutoTokenizer,
    input_df: pd.DataFrame,
    max_length: int,
) -> Dataset:
    dataset = Dataset.from_pandas(input_df.reset_index(drop=True))

    def tokenize_fn(batch: dict[str, list[str]]) -> dict[str, Any]:
        return tokenizer(
            batch["text"],
            truncation=True,
            max_length=max_length,
        )

    dataset = dataset.map(tokenize_fn, batched=True, remove_columns=["text"])
    return dataset.rename_column("label", "labels")


def compute_binary_metrics(eval_pred: Any) -> dict[str, float | int]:
    logits, labels = eval_pred
    preds = np.argmax(logits, axis=-1)
    return compute_metrics(labels, preds)


def compute_metrics(labels: np.ndarray, preds: np.ndarray) -> dict[str, float | int]:
    acc = accuracy_score(labels, preds)
    precision, recall, f1, _ = precision_recall_fscore_support(
        labels,
        preds,
        average="binary",
        pos_label=1,
        zero_division=0,
    )
    tn, fp, fn, tp = confusion_matrix(labels, preds, labels=[0, 1]).ravel()

    return {
        "acc": float(acc),
        "f1": float(f1),
        "precision": float(precision),
        "recall": float(recall),
        "fp": int(fp),
        "fn": int(fn),
        "tn": int(tn),
        "tp": int(tp),
    }


class FocalLossTrainer(Trainer):
    def __init__(self, *args: Any, gamma: float = FOCAL_GAMMA, **kwargs: Any) -> None:
        super().__init__(*args, **kwargs)
        self.gamma = gamma

    def compute_loss(
        self,
        model: torch.nn.Module,
        inputs: dict[str, torch.Tensor],
        return_outputs: bool = False,
        **_: Any,
    ) -> Any:
        labels = inputs.pop("labels")
        outputs = model(**inputs)
        logits = outputs.logits

        ce_loss = torch.nn.functional.cross_entropy(
            logits,
            labels,
            reduction="none",
        )
        probs = torch.softmax(logits, dim=-1)
        pt = probs.gather(1, labels.unsqueeze(1)).squeeze(1)
        focal_factor = (1.0 - pt) ** self.gamma
        loss = (focal_factor * ce_loss).mean()

        return (loss, outputs) if return_outputs else loss


def build_training_args(
    output_dir: Path,
    trial_params: dict[str, Any],
    run_name: str,
    wandb_config: WandbConfig,
) -> TrainingArguments:
    return TrainingArguments(
        output_dir=str(output_dir),
        num_train_epochs=trial_params["epochs"],
        per_device_train_batch_size=trial_params["batch_size"],
        per_device_eval_batch_size=trial_params["batch_size"],
        gradient_accumulation_steps=trial_params["gradient_accumulation_steps"],
        learning_rate=trial_params["learning_rate"],
        weight_decay=trial_params["weight_decay"],
        warmup_ratio=trial_params["warmup_ratio"],
        eval_strategy="epoch",
        save_strategy="epoch",
        logging_strategy="epoch",
        load_best_model_at_end=True,
        metric_for_best_model="f1",
        greater_is_better=True,
        save_total_limit=1,
        report_to="wandb" if wandb_config.enabled else "none",
        seed=SEED,
        run_name=run_name,
    )


def start_wandb_run(
    wandb_config: WandbConfig,
    run_name: str,
    run_config: dict[str, Any],
) -> Any:
    if not wandb_config.enabled:
        return None

    import wandb

    init_kwargs = {
        "project": wandb_config.project,
        "name": f"{wandb_config.run_prefix}_{run_name}",
        "group": wandb_config.group,
        "config": run_config,
        "reinit": True,
    }
    if wandb_config.entity:
        init_kwargs["entity"] = wandb_config.entity
    if wandb_config.mode:
        init_kwargs["mode"] = wandb_config.mode

    return wandb.init(**init_kwargs)


def finish_wandb_run(run: Any, summary: dict[str, Any] | None = None) -> None:
    if run is None:
        return

    if summary:
        for key, value in summary.items():
            run.summary[key] = value
    run.finish()


def create_trainer(
    experiment: ExperimentConfig,
    model: AutoModelForSequenceClassification,
    args: TrainingArguments,
    tokenizer: AutoTokenizer,
    train_ds: Dataset,
    valid_ds: Dataset,
) -> Trainer:
    trainer_class = FocalLossTrainer if experiment.use_focal_loss else Trainer
    extra_kwargs = {"gamma": FOCAL_GAMMA} if experiment.use_focal_loss else {}

    return trainer_class(
        model=model,
        args=args,
        train_dataset=train_ds,
        eval_dataset=valid_ds,
        data_collator=DataCollatorWithPadding(tokenizer),
        compute_metrics=compute_binary_metrics,
        **build_trainer_tokenizer_kwargs(tokenizer),
        **extra_kwargs,
    )


def build_trainer_tokenizer_kwargs(tokenizer: AutoTokenizer) -> dict[str, Any]:
    trainer_params = inspect.signature(Trainer.__init__).parameters
    if "processing_class" in trainer_params:
        return {"processing_class": tokenizer}
    if "tokenizer" in trainer_params:
        return {"tokenizer": tokenizer}
    return {}


def suggest_params(trial: optuna.Trial, epochs: int) -> dict[str, Any]:
    return {
        "learning_rate": trial.suggest_float("learning_rate", 1e-5, 5e-5, log=True),
        "batch_size": trial.suggest_categorical("batch_size", [8, 16]),
        "gradient_accumulation_steps": trial.suggest_categorical(
            "gradient_accumulation_steps",
            [1, 2, 4],
        ),
        "max_length": trial.suggest_categorical("max_length", [64, 96, 128]),
        "epochs": epochs,
        "weight_decay": trial.suggest_float("weight_decay", 0.0, 0.1),
        "warmup_ratio": trial.suggest_float("warmup_ratio", 0.0, 0.15),
    }


def complete_params(params: dict[str, Any]) -> dict[str, Any]:
    completed = dict(params)
    completed.setdefault("epochs", DEFAULT_EPOCHS)
    return completed


def load_existing_optuna_result(results_dir: Path) -> tuple[dict[str, Any], int, float]:
    best_params_path = results_dir / "best_params.json"
    summary_path = results_dir / "optuna_summary.json"

    if not best_params_path.exists():
        raise FileNotFoundError(
            f"Cannot skip Optuna because {best_params_path} does not exist."
        )

    with best_params_path.open("r", encoding="utf-8") as file:
        best_params = complete_params(json.load(file))

    optuna_trial_number = -1
    optuna_valid_f1 = 0.0
    if summary_path.exists():
        with summary_path.open("r", encoding="utf-8") as file:
            summary = json.load(file)
        optuna_trial_number = int(summary.get("best_trial_number", -1))
        optuna_valid_f1 = float(summary.get("best_valid_f1", 0.0))

    with best_params_path.open("w", encoding="utf-8") as file:
        json.dump(best_params, file, ensure_ascii=False, indent=2)

    return best_params, optuna_trial_number, optuna_valid_f1


def run_base_optuna(
    train_df: pd.DataFrame,
    valid_df: pd.DataFrame,
    tokenizer: AutoTokenizer,
    model_name_or_path: str,
    results_dir: Path,
    n_trials: int,
    epochs: int,
    wandb_config: WandbConfig,
) -> optuna.Study:
    experiment = ExperimentConfig(name="base_optuna", use_focal_loss=False)
    experiment_dir = results_dir / "base_optuna"
    trial_dir = experiment_dir / "trials"
    trial_dir.mkdir(parents=True, exist_ok=True)

    def objective(trial: optuna.Trial) -> float:
        trial_params = suggest_params(trial, epochs)
        trial.set_user_attr("epochs", trial_params["epochs"])
        run_name = f"{experiment.name}_trial_{trial.number}"
        run = start_wandb_run(
            wandb_config,
            run_name,
            {
                "phase": "base_optuna",
                "trial_number": trial.number,
                "device": DEVICE,
                "model_name_or_path": model_name_or_path,
                "train_size": len(train_df),
                "valid_size": len(valid_df),
                **trial_params,
            },
        )
        train_ds = tokenize_dataframe(
            tokenizer,
            train_df,
            trial_params["max_length"],
        )
        valid_ds = tokenize_dataframe(tokenizer, valid_df, trial_params["max_length"])

        model = AutoModelForSequenceClassification.from_pretrained(
            model_name_or_path,
            num_labels=NUM_LABELS,
        )
        model.to(DEVICE)

        args = build_training_args(
            trial_dir / f"trial_{trial.number}",
            trial_params,
            run_name=run_name,
            wandb_config=wandb_config,
        )
        trainer = create_trainer(
            experiment,
            model,
            args,
            tokenizer,
            train_ds,
            valid_ds,
        )

        trainer.train()
        metrics = trainer.evaluate()
        valid_f1 = float(metrics["eval_f1"])
        finish_wandb_run(
            run,
            {
                "valid_f1": valid_f1,
                "valid_acc": float(metrics.get("eval_acc", 0.0)),
                "valid_precision": float(metrics.get("eval_precision", 0.0)),
                "valid_recall": float(metrics.get("eval_recall", 0.0)),
            },
        )

        del trainer, model, train_ds, valid_ds
        clear_memory()
        return valid_f1

    study = optuna.create_study(direction="maximize")
    study.optimize(objective, n_trials=n_trials)
    best_params = complete_params(study.best_params)

    with (results_dir / "best_params.json").open("w", encoding="utf-8") as file:
        json.dump(best_params, file, ensure_ascii=False, indent=2)
    with (experiment_dir / "best_params.json").open("w", encoding="utf-8") as file:
        json.dump(best_params, file, ensure_ascii=False, indent=2)

    best_summary = {
        "best_trial_number": study.best_trial.number,
        "best_valid_f1": float(study.best_value),
        "best_params": best_params,
    }
    with (results_dir / "optuna_summary.json").open("w", encoding="utf-8") as file:
        json.dump(best_summary, file, ensure_ascii=False, indent=2)

    return study


def train_final_model(
    experiment: ExperimentConfig,
    best_params: dict[str, Any],
    optuna_trial_number: int,
    optuna_valid_f1: float,
    train_df: pd.DataFrame,
    valid_df: pd.DataFrame,
    test_df: pd.DataFrame,
    tokenizer: AutoTokenizer,
    model_name_or_path: str,
    results_dir: Path,
    wandb_config: WandbConfig,
) -> ExperimentResult:
    start = time.time()
    experiment_dir = results_dir / experiment.name
    final_dir = experiment_dir / "final_model"
    final_dir.mkdir(parents=True, exist_ok=True)

    strategy_train_df = apply_positive_oversampling(
        train_df,
        experiment.positive_oversampling_ratio,
    )
    train_ds = tokenize_dataframe(
        tokenizer,
        strategy_train_df,
        best_params["max_length"],
    )
    valid_ds = tokenize_dataframe(tokenizer, valid_df, best_params["max_length"])
    test_ds = tokenize_dataframe(tokenizer, test_df, best_params["max_length"])

    model = AutoModelForSequenceClassification.from_pretrained(
        model_name_or_path,
        num_labels=NUM_LABELS,
    )
    model.to(DEVICE)

    run_name = f"{experiment.name}_final"
    args = build_training_args(
        experiment_dir / "final_training",
        best_params,
        run_name=run_name,
        wandb_config=wandb_config,
    )
    run = start_wandb_run(
        wandb_config,
        run_name,
        {
            "phase": "final_experiment",
            "experiment_name": experiment.name,
            "use_focal_loss": experiment.use_focal_loss,
            "positive_oversampling_ratio": experiment.positive_oversampling_ratio,
            "device": DEVICE,
            "model_name_or_path": model_name_or_path,
            "train_size": len(strategy_train_df),
            "valid_size": len(valid_df),
            "test_size": len(test_df),
            "optuna_trial_number": optuna_trial_number,
            "optuna_valid_f1": optuna_valid_f1,
            **best_params,
        },
    )
    trainer = create_trainer(
        experiment,
        model,
        args,
        tokenizer,
        train_ds,
        valid_ds,
    )
    trainer.train()

    predictions = trainer.predict(test_ds)
    pred_labels = np.argmax(predictions.predictions, axis=-1)
    metrics = compute_metrics(predictions.label_ids, pred_labels)
    finish_wandb_run(
        run,
        {
            "test_acc": float(metrics["acc"]),
            "test_f1": float(metrics["f1"]),
            "test_precision": float(metrics["precision"]),
            "test_recall": float(metrics["recall"]),
            "test_fp": int(metrics["fp"]),
            "test_fn": int(metrics["fn"]),
            "test_tn": int(metrics["tn"]),
            "test_tp": int(metrics["tp"]),
        },
    )

    trainer.save_model(str(final_dir))
    tokenizer.save_pretrained(str(final_dir))

    metrics_path = experiment_dir / "test_metrics.json"
    result = ExperimentResult(
        experiment_name=experiment.name,
        use_focal_loss=experiment.use_focal_loss,
        positive_oversampling_ratio=experiment.positive_oversampling_ratio,
        optuna_trial_number=optuna_trial_number,
        optuna_valid_f1=optuna_valid_f1,
        test_acc=float(metrics["acc"]),
        test_f1=float(metrics["f1"]),
        test_precision=float(metrics["precision"]),
        test_recall=float(metrics["recall"]),
        test_fp=int(metrics["fp"]),
        test_fn=int(metrics["fn"]),
        test_tn=int(metrics["tn"]),
        test_tp=int(metrics["tp"]),
        elapsed_minutes=(time.time() - start) / 60,
        model_dir=str(final_dir),
        best_params_path=str(results_dir / "best_params.json"),
        metrics_path=str(metrics_path),
    )

    with metrics_path.open("w", encoding="utf-8") as file:
        json.dump(asdict(result), file, ensure_ascii=False, indent=2)

    test_predictions_df = test_df.reset_index(drop=True).copy()
    test_predictions_df["pred"] = pred_labels
    test_predictions_df.to_csv(
        experiment_dir / "test_predictions.csv",
        index=False,
        encoding="utf-8-sig",
    )

    del trainer, model, train_ds, valid_ds, test_ds
    clear_memory()
    return result


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run KcELECTRA retraining experiments with Optuna."
    )
    parser.add_argument("--data-path", type=Path, default=DEFAULT_DATA_PATH)
    parser.add_argument(
        "--model-name-or-path",
        default=DEFAULT_MODEL_NAME,
        help=(
            "Initial encoder checkpoint. Defaults to the deployed Hugging Face "
            "baseline. Pass beomi/KcELECTRA-base explicitly for full "
            "retraining from scratch."
        ),
    )
    parser.add_argument(
        "--train-path",
        type=Path,
        help="Prebuilt training split. Requires valid/test paths.",
    )
    parser.add_argument(
        "--valid-path",
        type=Path,
        help="Fixed validation split. Requires train/test paths.",
    )
    parser.add_argument(
        "--test-path",
        type=Path,
        help="Fixed test split. Requires train/valid paths.",
    )
    parser.add_argument("--results-dir", type=Path, default=DEFAULT_RESULTS_DIR)
    parser.add_argument("--n-trials", type=int, default=1)
    parser.add_argument(
        "--epochs",
        type=int,
        default=DEFAULT_EPOCHS,
        help="Epoch count used for base Optuna and final experiments.",
    )
    parser.add_argument(
        "--skip-optuna",
        action="store_true",
        help="Reuse results/best_params.json instead of running base Optuna.",
    )
    parser.add_argument(
        "--experiments",
        nargs="*",
        default=[experiment.name for experiment in EXPERIMENTS],
        help="Subset of experiment names to run.",
    )
    parser.add_argument(
        "--use-wandb",
        action="store_true",
        help="Enable Weights & Biases logging for the next run.",
    )
    parser.add_argument("--wandb-project", default="kcelectra-retrain")
    parser.add_argument("--wandb-entity", default=None)
    parser.add_argument("--wandb-group", default=None)
    parser.add_argument("--wandb-run-prefix", default="kcelectra")
    parser.add_argument(
        "--wandb-mode",
        choices=["online", "offline", "disabled"],
        default=None,
        help="Optional W&B mode. Use offline if login/network is not ready.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    set_seed(SEED)
    args.results_dir.mkdir(parents=True, exist_ok=True)

    print(f"Device: {DEVICE}")
    if args.train_path is None:
        print(f"Data path: {args.data_path}")
    else:
        print(f"Train path: {args.train_path}")
        print(f"Validation path: {args.valid_path}")
        print(f"Test path: {args.test_path}")
    print(f"Results dir: {args.results_dir}")
    print(f"Initial model: {args.model_name_or_path}")
    print(f"Base Optuna trials: {args.n_trials}")
    print(f"Epochs per training run: {args.epochs}")
    print("Optuna runs once. Best params are reused for all final experiments.")

    wandb_config = WandbConfig(
        enabled=args.use_wandb,
        project=args.wandb_project,
        entity=args.wandb_entity,
        group=args.wandb_group,
        run_prefix=args.wandb_run_prefix,
        mode=args.wandb_mode,
    )
    if wandb_config.enabled:
        print(
            "Weights & Biases logging enabled: "
            f"project={wandb_config.project}, group={wandb_config.group}"
        )

    train_df, valid_df, test_df = load_dataset_splits(
        data_path=args.data_path,
        train_path=args.train_path,
        valid_path=args.valid_path,
        test_path=args.test_path,
    )
    print("\nTraining label counts:")
    print(train_df["label"].value_counts())
    print("\nSplit sizes:")
    print(f"train={len(train_df):,}, valid={len(valid_df):,}, test={len(test_df):,}")

    tokenizer = AutoTokenizer.from_pretrained(args.model_name_or_path)
    experiment_names = {experiment.name for experiment in EXPERIMENTS}
    unknown_names = set(args.experiments) - experiment_names
    if unknown_names:
        raise ValueError(
            f"Unknown experiments: {sorted(unknown_names)}. "
            f"Available experiments: {sorted(experiment_names)}"
        )

    selected_experiments = [
        experiment
        for experiment in EXPERIMENTS
        if experiment.name in set(args.experiments)
    ]

    if args.skip_optuna:
        print("\n=== Skipping base Optuna ===")
        best_params, optuna_trial_number, optuna_valid_f1 = (
            load_existing_optuna_result(args.results_dir)
        )
        print(f"Reused best params from {args.results_dir / 'best_params.json'}")
    else:
        print("\n=== Running base Optuna once ===")
        study = run_base_optuna(
            train_df,
            valid_df,
            tokenizer,
            args.model_name_or_path,
            args.results_dir,
            args.n_trials,
            args.epochs,
            wandb_config,
        )
        best_params = complete_params(study.best_params)
        optuna_trial_number = study.best_trial.number
        optuna_valid_f1 = float(study.best_value)

    print("\n=== Base Optuna result ===")
    print(f"best_trial_number={optuna_trial_number}")
    print(f"best_valid_f1={optuna_valid_f1}")
    print(f"best_params={best_params}")

    all_results: list[ExperimentResult] = []
    for experiment in selected_experiments:
        print(f"\n=== Running final experiment: {experiment.name} ===")
        result = train_final_model(
            experiment,
            best_params,
            optuna_trial_number,
            optuna_valid_f1,
            train_df,
            valid_df,
            test_df,
            tokenizer,
            args.model_name_or_path,
            args.results_dir,
            wandb_config,
        )
        all_results.append(result)

        partial_df = pd.DataFrame([asdict(row) for row in all_results])
        partial_df.to_csv(
            args.results_dir / "experiment_comparison_partial.csv",
            index=False,
            encoding="utf-8-sig",
        )

    final_df = pd.DataFrame([asdict(row) for row in all_results])
    final_path = args.results_dir / "experiment_comparison_final.csv"
    final_df.to_csv(final_path, index=False, encoding="utf-8-sig")

    print("\n=== Experiment comparison ===")
    print(final_df)
    print(f"\nSaved final comparison: {final_path}")


if __name__ == "__main__":
    main()
