import importlib.util
import sys
from datetime import datetime
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock

import pytest

COLLECTOR_PATH = (
    Path(__file__).resolve().parents[1]
    / "pipeline"
    / "collect_training_data.py"
)
SPEC = importlib.util.spec_from_file_location(
    "encoder_training_collector",
    COLLECTOR_PATH,
)
assert SPEC is not None and SPEC.loader is not None
collector = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = collector
SPEC.loader.exec_module(collector)

TrainingSample = collector.TrainingSample
deduplicate_samples = collector.deduplicate_samples
load_manual_incidents = collector.load_manual_incidents
normalize_text_key = collector.normalize_text_key
load_database_samples = collector.load_database_samples


def test_normalize_text_key_collapses_whitespace_and_width() -> None:
    assert normalize_text_key("  ＴＥＳＴ \n 문자  ") == "test 문자"


def test_deduplicate_keeps_higher_confidence_same_label() -> None:
    low = TrainingSample(
        text="정상 안내 문자",
        label=0,
        source="HIGH_CONFIDENCE_NORMAL",
        source_id="1",
        confidence=0.98,
        collected_at=None,
    )
    high = TrainingSample(
        text="정상  안내 문자",
        label=0,
        source="HIGH_CONFIDENCE_NORMAL",
        source_id="2",
        confidence=0.995,
        collected_at=None,
    )

    samples, conflicts = deduplicate_samples([low, high])

    assert samples == [high]
    assert conflicts == []


def test_deduplicate_excludes_conflicting_labels() -> None:
    normal = TrainingSample(
        text="같은 문자",
        label=0,
        source="HIGH_CONFIDENCE_NORMAL",
        source_id="1",
        confidence=0.99,
        collected_at=None,
    )
    phishing = TrainingSample(
        text="같은  문자",
        label=1,
        source="STATIC_URL_FILTER",
        source_id="2",
        confidence=1.0,
        collected_at=None,
    )

    samples, conflicts = deduplicate_samples([normal, phishing])

    assert samples == []
    assert len(conflicts) == 1


def test_load_manual_incidents_defaults_to_positive_label(tmp_path: Path) -> None:
    path = tmp_path / "manual.csv"
    path.write_text(
        "text,label,source_id,collected_at\n"
        '"최신 피해 사례",,case-1,2026-06-15\n',
        encoding="utf-8",
    )

    samples = load_manual_incidents(path)

    assert len(samples) == 1
    assert samples[0].label == 1
    assert samples[0].source == "MANUAL_INCIDENT"


def test_manual_incidents_reject_normal_label(tmp_path: Path) -> None:
    path = tmp_path / "manual.csv"
    path.write_text(
        "text,label,source_id,collected_at\n"
        '"정상 문자",0,case-1,2026-06-15\n',
        encoding="utf-8",
    )

    with pytest.raises(ValueError, match="must use label=1"):
        load_manual_incidents(path)


@pytest.mark.anyio
async def test_load_database_samples_maps_static_and_normal_rows(
    monkeypatch,
) -> None:
    rows = [
        {
            "id": 1,
            "content": "배송 주소를 수정하세요. <URL>",
            "is_smishing": True,
            "detection_type": "STATIC_PATTERN",
            "ai_score": None,
            "static_url_match": True,
            "created_at": datetime(2026, 6, 15),
        },
        {
            "id": 2,
            "content": "회의는 오후 세 시입니다.",
            "is_smishing": False,
            "detection_type": "ENCODER",
            "ai_score": 0.995,
            "static_url_match": False,
            "created_at": datetime(2026, 6, 15),
        },
    ]

    result = MagicMock()
    result.mappings.return_value = rows
    connection = MagicMock()
    connection.execute = AsyncMock(return_value=result)

    connection_context = AsyncMock()
    connection_context.__aenter__.return_value = connection
    connection_context.__aexit__.return_value = None

    engine = MagicMock()
    engine.connect.return_value = connection_context
    engine.dispose = AsyncMock()
    monkeypatch.setattr(
        collector,
        "create_async_engine",
        lambda *_args, **_kwargs: engine,
    )

    samples = await load_database_samples(
        "mysql+asyncmy://example",
        normal_confidence=0.98,
    )

    assert [sample.label for sample in samples] == [1, 0]
    assert [sample.source for sample in samples] == [
        "STATIC_URL_FILTER",
        "HIGH_CONFIDENCE_NORMAL",
    ]
    connection.execute.assert_awaited_once()
    engine.dispose.assert_awaited_once()
