import asyncio
from unittest.mock import AsyncMock

from backend.src.backend.schemas.report_api import ReportRequest
from backend.src.backend.services.report_service import save_report_static_patterns


def test_report_commits_url_candidate_and_phone_pattern_together(
    monkeypatch,
) -> None:
    from backend.src.backend.services import report_service

    db = AsyncMock()
    register_urls = AsyncMock(return_value=[])
    create_phones = AsyncMock(return_value=[])
    monkeypatch.setattr(
        report_service,
        "register_reported_url_candidates",
        register_urls,
    )
    monkeypatch.setattr(
        report_service,
        "upsert_static_patterns",
        create_phones,
    )

    asyncio.run(
        save_report_static_patterns(
            db,
            ReportRequest(
                type="smishing",
                content="http://fake.com/path 010-1234-5678",
            ),
        )
    )

    register_urls.assert_awaited_once()
    assert register_urls.await_args.kwargs["urls"] == [
        "http://fake.com/path"
    ]
    assert create_phones.await_args.kwargs["commit"] is False
    db.commit.assert_awaited_once()
