import asyncio
from unittest.mock import AsyncMock

from backend.src.backend.models.static_patterns import (
    URL_CANDIDATE_MANAGED_SOURCE,
)
from backend.src.backend.models.url_candidate import (
    UrlCandidate,
    UrlCandidateSource,
    UrlCandidateStatus,
)
from backend.src.backend.services.url_candidate_service import (
    review_url_candidate,
)
from backend.src.backend.utils.url import hash_value


def _candidate(candidate_id: int = 1) -> UrlCandidate:
    return UrlCandidate(
        id=candidate_id,
        url="https://example.com/path",
        normalized_url="https://example.com/path",
        url_hash=hash_value("https://example.com/path"),
        last_source=UrlCandidateSource.MODEL,
        status=UrlCandidateStatus.REVIEW_REQUIRED,
        processing_token="worker-token",
    )


def test_admin_approval_promotes_candidate(monkeypatch) -> None:
    from backend.src.backend.services import url_candidate_service

    candidate = _candidate()
    db = AsyncMock()
    db.get.return_value = candidate
    promote = AsyncMock(return_value=[])
    monkeypatch.setattr(
        url_candidate_service,
        "create_static_patterns_if_new",
        promote,
    )

    result = asyncio.run(
        review_url_candidate(
            db,
            candidate_id=candidate.id,
            approve=True,
            reviewer="reviewer",
            note="confirmed",
        )
    )

    assert result is candidate
    assert candidate.status is UrlCandidateStatus.APPROVED
    assert candidate.reviewer == "reviewer"
    assert candidate.review_note == "confirmed"
    assert candidate.processing_token is None
    promote.assert_awaited_once()
    patterns = promote.await_args.args[1]
    assert (
        patterns[0]["managed_source"]
        == URL_CANDIDATE_MANAGED_SOURCE
    )
    db.commit.assert_awaited_once()


def test_admin_rejection_excludes_candidate_from_rechecks(
    monkeypatch,
) -> None:
    from backend.src.backend.services import url_candidate_service

    candidate = _candidate()
    db = AsyncMock()
    db.get.return_value = candidate
    remove_static = AsyncMock()
    monkeypatch.setattr(
        url_candidate_service,
        "delete_static_url_pattern",
        remove_static,
    )

    result = asyncio.run(
        review_url_candidate(
            db,
            candidate_id=candidate.id,
            approve=False,
            reviewer="reviewer",
            note="official domain",
        )
    )

    assert result is candidate
    assert candidate.status is UrlCandidateStatus.REJECTED
    assert candidate.next_check_at is None
    remove_static.assert_awaited_once_with(
        db,
        candidate.normalized_url,
    )
    db.commit.assert_awaited_once()


def test_approved_candidate_can_be_rejected_by_admin(monkeypatch) -> None:
    from backend.src.backend.services import url_candidate_service

    candidate = _candidate()
    candidate.status = UrlCandidateStatus.APPROVED
    db = AsyncMock()
    db.get.return_value = candidate
    remove_static = AsyncMock()
    monkeypatch.setattr(
        url_candidate_service,
        "delete_static_url_pattern",
        remove_static,
    )

    result = asyncio.run(
        review_url_candidate(
            db,
            candidate_id=candidate.id,
            approve=False,
            reviewer="reviewer",
            note="changed mind",
        )
    )

    assert result is candidate
    assert candidate.status is UrlCandidateStatus.REJECTED
    remove_static.assert_awaited_once()
    db.commit.assert_awaited_once()
