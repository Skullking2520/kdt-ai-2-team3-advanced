import asyncio
from datetime import date, datetime
from unittest.mock import AsyncMock, MagicMock

import httpx
import pytest
from sqlalchemy.dialects import mysql

from backend.src.backend.models.static_patterns import (
    URL_CANDIDATE_MANAGED_SOURCE,
    PatternType,
)
from backend.src.backend.models.url_candidate import (
    UrlCandidate,
    UrlCandidateSource,
    UrlCandidateStatus,
    VirusTotalQuota,
)
from backend.src.backend.repository.static_pattern_repository import (
    _normalize_pattern_value,
    delete_static_url_pattern,
)
from backend.src.backend.repository.url_candidate_repository import (
    claim_next_candidate_for_vt_check,
    reserve_vt_request,
    upsert_url_candidates,
)
from backend.src.backend.services.virustotal_service import (
    VirusTotalFetchResult,
    VirusTotalRateLimitError,
    VirusTotalVerdict,
    classify_vt_verdict,
    fetch_vt_verdict,
    parse_vt_response,
    record_validation_outcome,
    validate_url_candidate,
)
from backend.src.backend.utils.url import hash_value, normalize_url


def _disable_vt_limits(monkeypatch) -> None:
    from backend.src.backend.services import virustotal_service

    monkeypatch.setattr(
        virustotal_service,
        "_reserve_daily_quota",
        AsyncMock(),
    )
    monkeypatch.setattr(
        virustotal_service,
        "_wait_for_rate_limit",
        AsyncMock(),
    )


def test_normalize_url_preserves_case_sensitive_path() -> None:
    assert normalize_url("HTTPS://Example.COM/CasePath?q=Value#fragment") == (
        "https://example.com/CasePath?q=Value"
    )


def test_normalize_url_adds_scheme_and_strips_message_punctuation() -> None:
    assert normalize_url("Example.COM/CasePath).") == (
        "https://example.com/CasePath"
    )


def test_normalize_url_preserves_balanced_trailing_parenthesis() -> None:
    assert normalize_url("https://example.com/wiki/Function_(math)") == (
        "https://example.com/wiki/Function_(math)"
    )


def test_static_url_normalization_keeps_more_than_500_characters() -> None:
    long_url = "https://example.com/" + ("path/" * 120)

    normalized = _normalize_pattern_value(PatternType.URL, long_url)

    assert len(normalized) > 255
    assert normalized == long_url


def test_url_hash_preserves_case_sensitive_path() -> None:
    upper_path = normalize_url("https://example.com/Admin")
    lower_path = normalize_url("https://example.com/admin")

    assert hash_value(upper_path) != hash_value(lower_path)


def test_vt_verdict_approves_three_malicious_engines() -> None:
    verdict = VirusTotalVerdict(malicious=3, suspicious=0, total=90)

    assert classify_vt_verdict(verdict) is UrlCandidateStatus.APPROVED


def test_vt_verdict_requires_review_for_weak_signal() -> None:
    malicious = VirusTotalVerdict(malicious=1, suspicious=0, total=90)
    suspicious = VirusTotalVerdict(malicious=0, suspicious=1, total=90)

    assert (
        classify_vt_verdict(malicious)
        is UrlCandidateStatus.REVIEW_REQUIRED
    )
    assert (
        classify_vt_verdict(suspicious)
        is UrlCandidateStatus.REVIEW_REQUIRED
    )


def test_vt_verdict_keeps_zero_detection_url_pending() -> None:
    verdict = VirusTotalVerdict(malicious=0, suspicious=0, total=90)

    assert classify_vt_verdict(verdict) is UrlCandidateStatus.PENDING


def test_failed_vt_request_is_attempted_but_not_checked() -> None:
    counts = {
        "attempted": 0,
        "checked": 0,
        "failed": 0,
    }

    record_validation_outcome(counts, "failed")

    assert counts == {
        "attempted": 1,
        "checked": 0,
        "failed": 1,
    }


def test_superseded_vt_result_is_not_counted_as_checked() -> None:
    counts = {
        "attempted": 0,
        "checked": 0,
        "superseded": 0,
    }

    record_validation_outcome(counts, "superseded")

    assert counts == {
        "attempted": 1,
        "checked": 0,
        "superseded": 1,
    }


def test_parse_vt_response_aggregates_all_analysis_results() -> None:
    payload = {
        "data": {
            "attributes": {
                "last_analysis_stats": {
                    "malicious": 4,
                    "suspicious": 2,
                    "harmless": 70,
                    "undetected": 14,
                }
            }
        }
    }

    assert parse_vt_response(payload) == VirusTotalVerdict(
        malicious=4,
        suspicious=2,
        total=90,
    )


def test_unknown_url_is_submitted_for_future_analysis(monkeypatch) -> None:
    from backend.src.backend.services import virustotal_service

    requests = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        if request.method == "GET":
            return httpx.Response(404, request=request)
        return httpx.Response(
            200,
            json={"data": {"type": "analysis"}},
            request=request,
        )

    monkeypatch.setattr(
        virustotal_service.settings,
        "VIRUSTOTAL_API_KEY",
        "test-token",
    )
    monkeypatch.setattr(
        virustotal_service.settings,
        "VT_SUBMIT_UNKNOWN_URLS",
        True,
    )
    _disable_vt_limits(monkeypatch)

    async def run() -> None:
        transport = httpx.MockTransport(handler)
        async with httpx.AsyncClient(transport=transport) as client:
            result = await fetch_vt_verdict(
                client,
                "https://example.com/path",
            )

        assert result == VirusTotalFetchResult(
            verdict=None,
            submitted=True,
        )
        assert [request.method for request in requests] == ["GET", "POST"]
        assert requests[1].url == (
            "https://www.virustotal.com/api/v3/urls"
        )

    asyncio.run(run())


def test_vt_429_uses_retry_after(monkeypatch) -> None:
    from backend.src.backend.services import virustotal_service

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            429,
            headers={"Retry-After": "120"},
            request=request,
        )

    _disable_vt_limits(monkeypatch)
    monkeypatch.setattr(
        virustotal_service.settings,
        "VIRUSTOTAL_API_KEY",
        "test-token",
    )

    async def run() -> None:
        transport = httpx.MockTransport(handler)
        async with httpx.AsyncClient(transport=transport) as client:
            with pytest.raises(VirusTotalRateLimitError) as exc_info:
                await fetch_vt_verdict(client, "https://example.com")

        assert exc_info.value.retry_after_seconds == 120

    asyncio.run(run())


def test_daily_vt_quota_is_reserved_atomically() -> None:
    db = AsyncMock()
    quota = VirusTotalQuota(date=date(2026, 6, 9), auto_used=3)
    db.scalar.return_value = quota

    reserved = asyncio.run(
        reserve_vt_request(
            db,
            quota_date=quota.date,
            daily_limit=4,
        )
    )

    assert reserved is True
    assert quota.auto_used == 4
    db.commit.assert_awaited_once()


def test_daily_vt_quota_rejects_requests_after_limit() -> None:
    db = AsyncMock()
    quota = VirusTotalQuota(date=date(2026, 6, 9), auto_used=4)
    db.scalar.return_value = quota

    reserved = asyncio.run(
        reserve_vt_request(
            db,
            quota_date=quota.date,
            daily_limit=4,
        )
    )

    assert reserved is False
    db.rollback.assert_awaited_once()


def test_candidate_upsert_uses_atomic_mysql_statement() -> None:
    db = AsyncMock()
    select_result = MagicMock()
    select_result.scalars.return_value.all.return_value = []
    db.execute.side_effect = [MagicMock(), select_result]

    asyncio.run(
        upsert_url_candidates(
            db,
            [
                "HTTPS://Example.COM/CasePath#first",
                "https://example.com/CasePath#second",
            ],
            source=UrlCandidateSource.USER_REPORT,
        )
    )

    insert_statement = db.execute.await_args_list[0].args[0]
    sql = str(insert_statement.compile(dialect=mysql.dialect()))
    assert "ON DUPLICATE KEY UPDATE" in sql
    assert "CASE WHEN" in sql
    assert "updated_at" in sql
    assert db.execute.await_count == 2
    db.commit.assert_awaited_once()


def test_candidate_upsert_does_not_truncate_long_url() -> None:
    db = AsyncMock()
    select_result = MagicMock()
    select_result.scalars.return_value.all.return_value = []
    db.execute.side_effect = [MagicMock(), select_result]
    long_url = "https://example.com/" + ("segment/" * 100)

    asyncio.run(
        upsert_url_candidates(
            db,
            [long_url],
            source=UrlCandidateSource.MODEL,
            confidence=0.9,
        )
    )

    insert_statement = db.execute.await_args_list[0].args[0]
    params = insert_statement.compile(dialect=mysql.dialect()).params
    assert long_url in params.values()


def test_candidate_upsert_can_defer_commit() -> None:
    db = AsyncMock()
    select_result = MagicMock()
    select_result.scalars.return_value.all.return_value = []
    db.execute.side_effect = [MagicMock(), select_result]

    asyncio.run(
        upsert_url_candidates(
            db,
            ["example.com/path"],
            source=UrlCandidateSource.USER_REPORT,
            commit=False,
        )
    )

    db.flush.assert_awaited_once()
    db.commit.assert_not_awaited()


def test_static_url_delete_is_limited_to_managed_source() -> None:
    db = AsyncMock()

    asyncio.run(
        delete_static_url_pattern(
            db,
            "https://example.com/path",
        )
    )

    db.execute.assert_awaited_once()
    statement = db.execute.await_args.args[0]
    sql = str(statement.compile(dialect=mysql.dialect()))
    assert "source" in sql
    assert URL_CANDIDATE_MANAGED_SOURCE in statement.compile(
        dialect=mysql.dialect()
    ).params.values()


def test_candidate_claim_sets_database_lease() -> None:
    now = datetime(2026, 6, 9, 0, 0, 0)
    lease_until = datetime(2026, 6, 9, 0, 30, 0)
    candidate = UrlCandidate(
        id=1,
        url="https://example.com/path",
        normalized_url="https://example.com/path",
        url_hash=hash_value("https://example.com/path"),
        last_source=UrlCandidateSource.MODEL,
        status=UrlCandidateStatus.PENDING,
    )
    db = AsyncMock()
    db.scalar.return_value = candidate

    claimed = asyncio.run(
        claim_next_candidate_for_vt_check(
            db,
            now=now,
            lease_until=lease_until,
        )
    )

    assert claimed is candidate
    assert candidate.next_check_at == lease_until
    assert candidate.processing_token is not None
    db.commit.assert_awaited_once()


def test_approved_candidate_is_promoted_with_normalized_url(
    monkeypatch,
) -> None:
    from backend.src.backend.services import virustotal_service

    candidate = UrlCandidate(
        id=1,
        url="HTTPS://Example.COM/CasePath#fragment",
        normalized_url="https://example.com/CasePath",
        url_hash=hash_value("https://example.com/CasePath"),
        last_source=UrlCandidateSource.MODEL,
        status=UrlCandidateStatus.PENDING,
        processing_token="worker-token",
    )
    db = AsyncMock()
    client = AsyncMock()
    promote = AsyncMock(return_value=[])

    monkeypatch.setattr(
        virustotal_service,
        "fetch_vt_verdict",
        AsyncMock(
            return_value=VirusTotalFetchResult(
                verdict=VirusTotalVerdict(
                    malicious=3,
                    suspicious=0,
                    total=90,
                )
            )
        ),
    )
    monkeypatch.setattr(
        virustotal_service,
        "upsert_static_patterns",
        promote,
    )
    monkeypatch.setattr(
        virustotal_service,
        "get_claimed_candidate_for_update",
        AsyncMock(return_value=candidate),
    )

    result = asyncio.run(validate_url_candidate(db, client, candidate))

    assert result.status is UrlCandidateStatus.APPROVED
    assert result.outcome == "approved"
    patterns = promote.await_args.args[1]
    assert patterns[0]["pattern_value"] == candidate.normalized_url
    assert (
        patterns[0]["source"]
        == URL_CANDIDATE_MANAGED_SOURCE
    )
    assert candidate.processing_token is None
    db.commit.assert_awaited_once()


def test_admin_review_supersedes_inflight_worker(monkeypatch) -> None:
    from backend.src.backend.services import virustotal_service

    candidate = UrlCandidate(
        id=1,
        url="https://example.com/path",
        normalized_url="https://example.com/path",
        url_hash=hash_value("https://example.com/path"),
        last_source=UrlCandidateSource.MODEL,
        status=UrlCandidateStatus.PENDING,
        processing_token="worker-token",
    )
    reviewed_candidate = UrlCandidate(
        id=1,
        url=candidate.url,
        normalized_url=candidate.normalized_url,
        url_hash=candidate.url_hash,
        last_source=UrlCandidateSource.MODEL,
        status=UrlCandidateStatus.REJECTED,
        processing_token=None,
    )
    db = AsyncMock()
    db.scalar.return_value = reviewed_candidate
    client = AsyncMock()
    promote = AsyncMock(return_value=[])

    monkeypatch.setattr(
        virustotal_service,
        "fetch_vt_verdict",
        AsyncMock(
            return_value=VirusTotalFetchResult(
                verdict=VirusTotalVerdict(
                    malicious=5,
                    suspicious=0,
                    total=90,
                )
            )
        ),
    )
    monkeypatch.setattr(
        virustotal_service,
        "get_claimed_candidate_for_update",
        AsyncMock(return_value=None),
    )
    monkeypatch.setattr(
        virustotal_service,
        "upsert_static_patterns",
        promote,
    )

    result = asyncio.run(validate_url_candidate(db, client, candidate))

    assert result.status is UrlCandidateStatus.REJECTED
    assert result.outcome == "superseded"
    promote.assert_not_awaited()
