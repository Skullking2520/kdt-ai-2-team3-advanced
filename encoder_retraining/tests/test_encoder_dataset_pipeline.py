import csv
import importlib.util
import json
import sys
from pathlib import Path


def load_module(name: str, file_name: str):
    module_path = (
        Path(__file__).resolve().parents[1] / "pipeline" / file_name
    )
    pipeline_dir = str(module_path.parent)
    if pipeline_dir not in sys.path:
        sys.path.insert(0, pipeline_dir)
    spec = importlib.util.spec_from_file_location(name, module_path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


builder = load_module(
    "encoder_dataset_builder",
    "build_training_dataset.py",
)
quality = load_module(
    "encoder_cleanlab_runner",
    "run_cleanlab.py",
)
pred_probs = load_module(
    "encoder_pred_probs_generator",
    "generate_cleanlab_pred_probs.py",
)
comparator = load_module(
    "encoder_model_comparator",
    "compare_encoder_models.py",
)
promoter = load_module(
    "encoder_model_promoter",
    "promote_encoder_model.py",
)
runner = load_module(
    "encoder_retraining_pipeline_runner",
    "run_retraining_pipeline.py",
)


def write_jsonl(path: Path, rows: list[dict]) -> None:
    path.write_text(
        "".join(
            json.dumps(row, ensure_ascii=False) + "\n" for row in rows
        ),
        encoding="utf-8",
    )


def read_jsonl(path: Path) -> list[dict]:
    return [
        json.loads(line)
        for line in path.read_text(encoding="utf-8").splitlines()
        if line
    ]


def test_builder_adds_incremental_rows_only_to_train(tmp_path: Path) -> None:
    base_path = tmp_path / "base.jsonl"
    incremental_path = tmp_path / "incremental.jsonl"
    output_dir = tmp_path / "dataset-v1"
    base_rows = [
        {"text": f"정상 기본 문장 {index}", "label": 0}
        for index in range(20)
    ] + [
        {"text": f"위험 기본 문장 {index}", "label": 1}
        for index in range(20)
    ]
    incremental_rows = [
        {
            "text": "신규 정상 문장",
            "label": 0,
            "source": "HIGH_CONFIDENCE_NORMAL",
        },
        {
            "text": "신규 피해 사례",
            "label": 1,
            "source": "MANUAL_INCIDENT",
        },
        {
            "text": "정상 기본 문장 0",
            "label": 1,
            "source": "MANUAL_INCIDENT",
        },
    ]
    write_jsonl(base_path, base_rows)
    write_jsonl(incremental_path, incremental_rows)

    manifest = builder.build_dataset(
        base_path=base_path,
        incremental_path=incremental_path,
        output_dir=output_dir,
        max_per_source=None,
    )

    train = read_jsonl(output_dir / "train.jsonl")
    valid = read_jsonl(output_dir / "valid.jsonl")
    test = read_jsonl(output_dir / "test.jsonl")
    held_out_texts = {row["text"] for row in [*valid, *test]}
    assert "신규 정상 문장" in {row["text"] for row in train}
    assert "신규 피해 사례" in {row["text"] for row in train}
    assert "신규 정상 문장" not in held_out_texts
    assert "신규 피해 사례" not in held_out_texts
    assert manifest["valid_count"] == 4
    assert manifest["test_count"] == 4


def test_mock_quality_check_drops_only_pseudo_label_issue(
    tmp_path: Path,
) -> None:
    train_path = tmp_path / "train.jsonl"
    output_dir = tmp_path / "quality-v1"
    write_jsonl(
        train_path,
        [
            {
                "text": "모델이 잘못 고른 정상 후보",
                "label": 0,
                "source": "HIGH_CONFIDENCE_NORMAL",
                "mock_pred_probs": [0.05, 0.95],
            },
            {
                "text": "검토가 필요한 수동 피해 사례",
                "label": 1,
                "source": "MANUAL_INCIDENT",
                "mock_pred_probs": [0.9, 0.1],
            },
            {
                "text": "정상적인 기존 학습 문장",
                "label": 0,
                "source": "BASE_DATASET",
            },
        ],
    )

    summary = quality.run_quality_check(
        train_path=train_path,
        output_dir=output_dir,
        mode="mock",
        pred_probs_path=None,
        drop_all_issues=False,
    )

    cleaned = read_jsonl(output_dir / "cleaned_train.jsonl")
    with (output_dir / "cleanlab_issues.csv").open(
        encoding="utf-8",
        newline="",
    ) as file:
        issues = list(csv.DictReader(file))
    assert summary["issue_count"] == 2
    assert summary["dropped_count"] == 1
    assert summary["review_count"] == 1
    assert len(cleaned) == 2
    assert {row["action"] for row in issues} == {"drop", "review"}


def test_pred_probs_generator_resolves_label_indices() -> None:
    assert pred_probs.resolve_label_indices(
        {"0": "normal", "1": "phishing"},
        2,
    ) == {"normal": 0, "phishing": 1}
    assert pred_probs.resolve_label_indices(
        {"0": "LABEL_0", "1": "LABEL_1"},
        2,
    ) == {"normal": 0, "phishing": 1}
    assert pred_probs.resolve_label_indices(
        {"0": "스미싱", "1": "정상"},
        2,
    ) == {"phishing": 0, "normal": 1}


def test_pred_probs_generator_writes_outputs(tmp_path: Path) -> None:
    rows = [
        {"text": "정상 문장", "label": 0, "source": "BASE_DATASET"},
        {"text": "위험 문장", "label": 1, "source": "MANUAL_INCIDENT"},
    ]
    output_dir = tmp_path / "pred-probs"
    summary = pred_probs.write_outputs(
        rows=rows,
        pred_probs=pred_probs.np.asarray([[0.9, 0.1], [0.2, 0.8]]),
        output_dir=output_dir,
        metadata={"model_name_or_path": "example/model"},
        preview_limit=10,
    )

    assert summary["row_count"] == 2
    assert summary["agreement_rate"] == 1.0
    assert (output_dir / "pred_probs.npy").exists()
    assert (output_dir / "pred_probs_preview.csv").exists()
    assert (output_dir / "pred_probs_manifest.json").exists()


def test_model_comparator_metrics_and_promotion_policy() -> None:
    labels = comparator.np.asarray([0, 0, 1, 1])
    baseline_probs = comparator.np.asarray(
        [
            [0.8, 0.2],
            [0.4, 0.6],
            [0.3, 0.7],
            [0.6, 0.4],
        ]
    )
    candidate_probs = comparator.np.asarray(
        [
            [0.9, 0.1],
            [0.8, 0.2],
            [0.2, 0.8],
            [0.1, 0.9],
        ]
    )

    baseline = comparator.compute_metrics(
        labels,
        baseline_probs,
        threshold=0.5,
    )
    candidate = comparator.compute_metrics(
        labels,
        candidate_probs,
        threshold=0.5,
    )

    assert baseline["false_positive"] == 1
    assert baseline["false_negative"] == 1
    assert candidate["false_positive"] == 0
    assert candidate["false_negative"] == 0
    assert comparator.should_promote(
        baseline=baseline,
        candidate=candidate,
        min_f1_delta=0.1,
        max_fp_increase=0,
        max_fn_increase=0,
    )


def test_model_comparator_writes_metric_csv(tmp_path: Path) -> None:
    path = tmp_path / "model_comparison.csv"
    comparator.write_metric_csv(
        path,
        [
            {
                "role": "baseline",
                "model_name_or_path": "baseline/model",
                "threshold": 0.5,
                "accuracy": 0.9,
                "precision": 0.8,
                "recall": 0.7,
                "f1": 0.75,
                "true_negative": 8,
                "false_positive": 1,
                "false_negative": 2,
                "true_positive": 7,
                "false_positive_rate": 0.1,
                "false_negative_rate": 0.2,
            }
        ],
    )

    rows = list(csv.DictReader(path.open(encoding="utf-8", newline="")))
    assert rows[0]["role"] == "baseline"
    assert rows[0]["model_name_or_path"] == "baseline/model"


def make_promotion_manifest(path: Path, recommended: bool = True) -> None:
    payload = {
        "sample_count": 4,
        "threshold": 0.5,
        "promotion_recommended": recommended,
        "baseline": {
            "role": "baseline",
            "model_name_or_path": "baseline/model",
            "accuracy": 0.75,
            "precision": 0.7,
            "recall": 0.7,
            "f1": 0.7,
            "false_positive": 1,
            "false_negative": 1,
        },
        "candidate": {
            "role": "candidate",
            "model_name_or_path": str(path.parent / "final_model"),
            "accuracy": 1.0,
            "precision": 1.0,
            "recall": 1.0,
            "f1": 1.0,
            "false_positive": 0,
            "false_negative": 0,
        },
        "deltas": {
            "accuracy_delta": 0.25,
            "precision_delta": 0.3,
            "recall_delta": 0.3,
            "f1_delta": 0.3,
            "false_positive_delta": -1,
            "false_negative_delta": -1,
        },
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload), encoding="utf-8")


def make_model_dir(path: Path) -> None:
    path.mkdir(parents=True)
    for file_name in promoter.REQUIRED_MODEL_FILES:
        (path / file_name).write_text("{}", encoding="utf-8")


def test_promoter_blocks_not_recommended_manifest(tmp_path: Path) -> None:
    manifest_path = tmp_path / "run" / "evaluation" / "promotion_manifest.json"
    make_promotion_manifest(manifest_path, recommended=False)
    make_model_dir(manifest_path.parent / "final_model")

    try:
        promoter.promote_model(
            manifest_path=manifest_path,
            repo_id="team/model",
            candidate_dir=None,
            staging_dir=tmp_path / "staging",
            output_log=tmp_path / "promotion_log.json",
            model_version="v-test",
            private=True,
            dry_run=True,
            allow_not_recommended=False,
            overwrite_staging=False,
        )
    except promoter.PromotionError as exc:
        assert "does not recommend promotion" in str(exc)
    else:
        raise AssertionError("Expected PromotionError")


def test_promoter_dry_run_writes_promotion_log(tmp_path: Path) -> None:
    manifest_path = tmp_path / "run" / "evaluation" / "promotion_manifest.json"
    candidate_dir = tmp_path / "run" / "final_model"
    output_log = tmp_path / "promotion_log.json"
    make_promotion_manifest(manifest_path, recommended=True)
    make_model_dir(candidate_dir)

    record = promoter.promote_model(
        manifest_path=manifest_path,
        repo_id="team/model",
        candidate_dir=candidate_dir,
        staging_dir=tmp_path / "staging",
        output_log=output_log,
        model_version="v-test",
        private=True,
        dry_run=True,
        allow_not_recommended=False,
        overwrite_staging=False,
    )

    saved = json.loads(output_log.read_text(encoding="utf-8"))
    assert record["uploaded"] is False
    assert saved["repo_id"] == "team/model"
    assert saved["model_version"] == "v-test"
    assert not (tmp_path / "staging").exists()


def test_promoter_prepares_staging_model_card(tmp_path: Path) -> None:
    manifest_path = tmp_path / "run" / "evaluation" / "promotion_manifest.json"
    candidate_dir = tmp_path / "run" / "final_model"
    staging_dir = tmp_path / "staging"
    make_promotion_manifest(manifest_path, recommended=True)
    make_model_dir(candidate_dir)
    manifest = promoter.load_json(manifest_path)
    model_card = promoter.render_model_card(
        repo_id="team/model",
        model_version="v-test",
        manifest=manifest,
    )

    promoter.prepare_staging_dir(
        candidate_dir=candidate_dir,
        staging_dir=staging_dir,
        model_card=model_card,
        overwrite=False,
    )

    assert (staging_dir / "model.safetensors").exists()
    readme = (staging_dir / "README.md").read_text(encoding="utf-8")
    assert "KcELECTRA Smishing Classifier" in readme
    assert "Score Meaning" in readme


def test_pipeline_runner_builds_training_command() -> None:
    command = runner.build_training_command(
        train_path=Path("quality/cleaned_train.jsonl"),
        valid_path=Path("dataset/valid.jsonl"),
        test_path=Path("dataset/test.jsonl"),
        model_name_or_path="baseline/model",
        results_dir=Path("training"),
        n_trials=1,
        epochs=3,
        experiments=["focal_no_oversampling"],
        skip_optuna=False,
        wandb_mode="disabled",
    )

    command_text = " ".join(command)
    assert "run_kcelectra_retrain_experiments.py" in command_text
    assert "--train-path quality/cleaned_train.jsonl" in command_text
    assert "--valid-path dataset/valid.jsonl" in command_text
    assert "--test-path dataset/test.jsonl" in command_text
    assert "--model-name-or-path baseline/model" in command_text
    assert "--experiments focal_no_oversampling" in command_text
    assert "--wandb-mode disabled" in command_text


def test_pipeline_runner_run_command_writes_logs(tmp_path: Path) -> None:
    command = [
        sys.executable,
        "-c",
        "import sys; print('out'); print('err', file=sys.stderr)",
    ]

    result = runner.run_command(
        command,
        dry_run=False,
        log_dir=tmp_path / "logs",
    )

    assert result["returncode"] == 0
    assert result["succeeded"] is True
    assert Path(result["stdout_log"]).read_text(encoding="utf-8").strip() == "out"
    assert Path(result["stderr_log"]).read_text(encoding="utf-8").strip() == "err"


def test_pipeline_runner_prepared_dir_skips_dataset_steps(
    tmp_path: Path,
    monkeypatch,
) -> None:
    prepared_dir = tmp_path / "prepared"
    prepared_dir.mkdir()
    write_jsonl(prepared_dir / "cleaned_train.jsonl", [{"text": "train", "label": 0}])
    write_jsonl(prepared_dir / "valid.jsonl", [{"text": "valid", "label": 0}])
    write_jsonl(prepared_dir / "test.jsonl", [{"text": "test", "label": 1}])

    captured_command = {}

    def fake_run_command(command, *, dry_run, log_dir):
        captured_command["command"] = command
        return {"skipped": True, "succeeded": True}

    monkeypatch.setattr(runner, "run_command", fake_run_command)

    summary = runner.run_pipeline(
        prepared_dir=prepared_dir,
        base_path=None,
        incremental_path=None,
        baseline_model=runner.DEFAULT_BASELINE_MODEL,
        output_dir=tmp_path / "run",
        candidate_model=None,
        candidate_experiment="focal_no_oversampling",
        max_per_source=None,
        cleanlab_mode="pred-probs",
        skip_training=False,
        skip_comparison=False,
        dry_run=True,
        n_trials=1,
        epochs=1,
        experiments=["focal_no_oversampling"],
        skip_optuna=False,
        wandb_mode="disabled",
        threshold=0.5,
        min_f1_delta=0.0,
        max_fp_increase=0,
        max_fn_increase=0,
        batch_size=8,
        max_length=64,
        device="cpu",
    )

    command_text = " ".join(captured_command["command"])
    assert summary["steps"]["build_dataset"]["skipped"] is True
    assert summary["steps"]["cleanlab"]["skipped"] is True
    assert "--train-path" in command_text
    assert str(prepared_dir / "cleaned_train.jsonl") in command_text
    assert str(prepared_dir / "valid.jsonl") in command_text
    assert str(prepared_dir / "test.jsonl") in command_text
    assert runner.DEFAULT_BASELINE_MODEL in command_text


def test_pipeline_runner_failed_training_skips_comparison(
    tmp_path: Path,
) -> None:
    command = [sys.executable, "-c", "raise SystemExit(7)"]

    result = runner.run_command(
        command,
        dry_run=False,
        log_dir=tmp_path / "logs",
    )

    assert result["returncode"] == 7
    assert result["succeeded"] is False
    assert Path(result["stderr_log"]).exists()


def test_pipeline_runner_failed_training_fails_cli() -> None:
    summary = {
        "steps": {
            "training": {
                "skipped": False,
                "returncode": 7,
                "succeeded": False,
            }
        }
    }

    assert runner.should_fail_cli(summary, dry_run=False) is True
    assert runner.should_fail_cli(summary, dry_run=True) is False


def test_pipeline_runner_resolves_candidate_model() -> None:
    assert runner.resolve_candidate_model(
        explicit_candidate_model="already-trained/model",
        training_results_dir=Path("training"),
        candidate_experiment="focal_no_oversampling",
    ) == "already-trained/model"
    assert runner.resolve_candidate_model(
        explicit_candidate_model=None,
        training_results_dir=Path("training"),
        candidate_experiment="focal_no_oversampling",
    ) == "training/focal_no_oversampling/final_model"
