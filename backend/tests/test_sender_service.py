import asyncio
from datetime import datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock

from backend.src.backend.services import sender_service


def test_lookup_sender_number_returns_danger_for_blacklisted_number(monkeypatch):
    db = AsyncMock()
    matches = [
        SimpleNamespace(
            created_at=datetime(2026, 6, 22, 12, 0, 0),
            category="사용자 신고 유형: sms",
        )
    ]
    find_matches = AsyncMock(return_value=matches)
    create_log = AsyncMock()
    monkeypatch.setattr(
        sender_service,
        "find_sender_blacklist_matches",
        find_matches,
    )
    monkeypatch.setattr(
        sender_service,
        "create_sender_lookup_log",
        create_log,
    )

    result = asyncio.run(
        sender_service.lookup_sender_number(db, "01012345678")
    )

    assert result["status"] == "danger"
    assert result["trustScore"] == 0
    assert result["reportCount"] == 1
    assert result["categories"] == ["사용자 신고 유형: sms"]
    create_log.assert_awaited_once_with(
        db,
        number="01012345678",
        is_smishing=True,
    )


def test_lookup_sender_number_returns_safe_for_unknown_number(monkeypatch):
    db = AsyncMock()
    monkeypatch.setattr(
        sender_service,
        "find_sender_blacklist_matches",
        AsyncMock(return_value=[]),
    )
    create_log = AsyncMock()
    monkeypatch.setattr(
        sender_service,
        "create_sender_lookup_log",
        create_log,
    )

    result = asyncio.run(
        sender_service.lookup_sender_number(db, "01000000000")
    )

    assert result == {
        "number": "01000000000",
        "trustScore": 100,
        "status": "safe",
        "reportCount": 0,
        "lastReportedAt": None,
        "categories": [],
        "history": [],
    }
    create_log.assert_awaited_once_with(
        db,
        number="01000000000",
        is_smishing=False,
    )
