import asyncio
from unittest.mock import AsyncMock

from backend.src.backend.models.smishing_log import DetectionType, InputType
from backend.src.backend.models.static_patterns import PatternType
from backend.src.backend.schemas.report_api import ReportRequest
from backend.src.backend.services import report_service


def test_save_report_static_patterns_persists_report_to_existing_tables(
    monkeypatch,
):
    db = AsyncMock()
    register_urls = AsyncMock(return_value=[])
    upsert_patterns = AsyncMock(return_value=[])
    create_log = AsyncMock()
    monkeypatch.setattr(
        report_service,
        "register_reported_url_candidates",
        register_urls,
    )
    monkeypatch.setattr(
        report_service,
        "upsert_static_patterns",
        upsert_patterns,
    )
    monkeypatch.setattr(
        report_service,
        "create_smishing_log",
        create_log,
    )

    request = ReportRequest(
        type="sms",
        content="배송 주소 확인 http://bad.example 010-1234-5678",
        category="택배 사칭",
        sender="01099998888",
        url="http://reported.example",
        notes="피해 신고",
        agreeShare=True,
    )

    response = asyncio.run(
        report_service.save_report_static_patterns(db, request)
    )

    assert response.status == "received"
    assert response.receiptId.startswith("NB")

    register_urls.assert_awaited_once()
    assert register_urls.await_args is not None
    assert register_urls.await_args.kwargs["urls"] == [
        "http://bad.example",
        "http://reported.example",
    ]
    assert register_urls.await_args.kwargs["report_type"] == "sms"

    upsert_patterns.assert_awaited_once()
    assert upsert_patterns.await_args is not None
    patterns = upsert_patterns.await_args.args[1]
    assert {
        row["pattern_type"]
        for row in patterns
    } == {PatternType.PHONE}
    assert {
        row["pattern_value"]
        for row in patterns
    } == {"010-1234-5678", "01099998888"}
    assert all(row["source"] == "USER_REPORT" for row in patterns)

    create_log.assert_awaited_once()
    assert create_log.await_args is not None
    assert create_log.await_args.kwargs["content"] == request.content
    assert create_log.await_args.kwargs["is_smishing"] is True
    assert (
        create_log.await_args.kwargs["detection_type"]
        is DetectionType.STATIC_PATTERN
    )
    assert create_log.await_args.kwargs["input_type"] is InputType.SMS
    assert create_log.await_args.kwargs["consent_for_training"] is True
    assert create_log.await_args.kwargs["static_url_match"] is True
    assert "피해 신고" in create_log.await_args.kwargs["reasoning"]
    db.commit.assert_awaited_once()
