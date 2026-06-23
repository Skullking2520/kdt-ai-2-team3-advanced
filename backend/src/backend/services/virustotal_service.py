import asyncio
import base64
import time
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime

import httpx
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.pydantic_settings import settings
from ..models.static_patterns import (
    URL_CANDIDATE_MANAGED_SOURCE,
    PatternType,
)
from ..models.url_candidate import UrlCandidate, UrlCandidateStatus
from ..repository.static_pattern_repository import upsert_static_patterns
from ..repository.url_candidate_repository import (
    claim_next_candidate_for_vt_check,
    get_claimed_candidate_for_update,
    reserve_vt_request,
)


@dataclass(frozen=True)
class VirusTotalVerdict:
    malicious: int
    suspicious: int
    total: int


@dataclass(frozen=True)
class VirusTotalFetchResult:
    verdict: VirusTotalVerdict | None
    submitted: bool = False


@dataclass(frozen=True)
class CandidateValidationResult:
    status: UrlCandidateStatus
    outcome: str


class VirusTotalRateLimitError(RuntimeError):
    def __init__(self, retry_after_seconds: int):
        super().__init__("VirusTotal request limit reached")
        self.retry_after_seconds = retry_after_seconds


_rate_limit_lock = asyncio.Lock()
_next_request_at = 0.0


def record_validation_outcome(
    counts: dict[str, int],
    outcome: str,
) -> None:
    counts["attempted"] += 1
    counts[outcome] += 1
    if outcome not in {"failed", "rate_limited", "superseded"}:
        counts["checked"] += 1


async def _superseded_result(
    db: AsyncSession,
    candidate_id: int,
) -> CandidateValidationResult:
    current = await db.scalar(
        select(UrlCandidate)
        .where(UrlCandidate.id == candidate_id)
        .execution_options(populate_existing=True)
    )
    return CandidateValidationResult(
        status=(
            current.status
            if current is not None
            else UrlCandidateStatus.PENDING
        ),
        outcome="superseded",
    )


def classify_vt_verdict(verdict: VirusTotalVerdict) -> UrlCandidateStatus:
    if verdict.malicious >= settings.VT_AUTO_APPROVE_MALICIOUS_COUNT:
        return UrlCandidateStatus.APPROVED
    if verdict.malicious >= 1 or verdict.suspicious >= 1:
        return UrlCandidateStatus.REVIEW_REQUIRED
    return UrlCandidateStatus.PENDING


def parse_vt_response(payload: dict) -> VirusTotalVerdict:
    stats = payload["data"]["attributes"]["last_analysis_stats"]
    return VirusTotalVerdict(
        malicious=int(stats.get("malicious", 0)),
        suspicious=int(stats.get("suspicious", 0)),
        total=sum(int(value) for value in stats.values()),
    )


def _url_identifier(url: str) -> str:
    return base64.urlsafe_b64encode(url.encode()).decode().rstrip("=")


def _retry_after_seconds(response: httpx.Response) -> int:
    value = response.headers.get("Retry-After")
    if not value:
        return settings.VT_RATE_LIMIT_RETRY_SECONDS

    try:
        return max(1, int(value))
    except ValueError:
        try:
            retry_at = parsedate_to_datetime(value)
            now = datetime.now(retry_at.tzinfo or timezone.utc)
            return max(1, int((retry_at - now).total_seconds()))
        except (TypeError, ValueError):
            return settings.VT_RATE_LIMIT_RETRY_SECONDS


async def _reserve_daily_quota() -> None:
    from ..db.session import AsyncSessionLocal

    async with AsyncSessionLocal() as quota_db:
        reserved = await reserve_vt_request(
            quota_db,
            quota_date=datetime.now(timezone.utc).date(),
            daily_limit=settings.VT_DAILY_REQUEST_LIMIT,
        )
    if not reserved:
        raise VirusTotalRateLimitError(
            settings.VT_DAILY_LIMIT_RETRY_SECONDS
        )


async def _wait_for_rate_limit() -> None:
    global _next_request_at

    async with _rate_limit_lock:
        wait_seconds = _next_request_at - time.monotonic()
        if wait_seconds > 0:
            await asyncio.sleep(wait_seconds)

        interval = 60 / settings.VT_REQUESTS_PER_MINUTE
        _next_request_at = time.monotonic() + interval


async def _request_vt(
    client: httpx.AsyncClient,
    method: str,
    url: str,
    *,
    allowed_statuses: set[int] | None = None,
    **kwargs,
) -> httpx.Response:
    await _reserve_daily_quota()
    await _wait_for_rate_limit()

    response = await client.request(
        method,
        url,
        headers={"x-apikey": settings.VIRUSTOTAL_API_KEY},
        **kwargs,
    )
    if response.status_code == 429:
        raise VirusTotalRateLimitError(_retry_after_seconds(response))
    if allowed_statuses and response.status_code in allowed_statuses:
        return response
    response.raise_for_status()
    return response


async def fetch_vt_verdict(
    client: httpx.AsyncClient,
    url: str,
) -> VirusTotalFetchResult:
    response = await _request_vt(
        client,
        "GET",
        f"https://www.virustotal.com/api/v3/urls/{_url_identifier(url)}",
        allowed_statuses={404},
    )
    if response.status_code == 404:
        if settings.VT_SUBMIT_UNKNOWN_URLS:
            await _request_vt(
                client,
                "POST",
                "https://www.virustotal.com/api/v3/urls",
                data={"url": url},
            )
            return VirusTotalFetchResult(verdict=None, submitted=True)
        return VirusTotalFetchResult(verdict=None)
    return VirusTotalFetchResult(verdict=parse_vt_response(response.json()))


async def validate_url_candidate(
    db: AsyncSession,
    client: httpx.AsyncClient,
    candidate: UrlCandidate,
) -> CandidateValidationResult:
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    candidate_id = candidate.id
    processing_token = candidate.processing_token
    if not processing_token:
        return CandidateValidationResult(
            status=candidate.status,
            outcome="superseded",
        )

    try:
        fetch_result = await fetch_vt_verdict(
            client,
            candidate.normalized_url,
        )
        candidate = await get_claimed_candidate_for_update(
            db,
            candidate_id=candidate_id,
            processing_token=processing_token,
        )
        if candidate is None:
            await db.rollback()
            return await _superseded_result(db, candidate_id)

        verdict = fetch_result.verdict
        candidate.vt_last_checked_at = now
        candidate.vt_last_error = None
        candidate.processing_token = None

        if verdict is None:
            candidate.status = UrlCandidateStatus.PENDING
            candidate.next_check_at = (
                now
                + timedelta(
                    minutes=settings.VT_SUBMITTED_RECHECK_MINUTES
                )
                if fetch_result.submitted
                else now + timedelta(days=settings.VT_RECHECK_DAYS)
            )
            await db.commit()
            return CandidateValidationResult(
                status=candidate.status,
                outcome="submitted" if fetch_result.submitted else "pending",
            )

        candidate.vt_malicious_count = verdict.malicious
        candidate.vt_suspicious_count = verdict.suspicious
        candidate.vt_total_count = verdict.total
        candidate.status = classify_vt_verdict(verdict)
        candidate.next_check_at = (
            None
            if candidate.status is UrlCandidateStatus.APPROVED
            else now + timedelta(days=settings.VT_RECHECK_DAYS)
        )

        if candidate.status is UrlCandidateStatus.APPROVED:
            await upsert_static_patterns(
                db,
                [
                    {
                        "pattern_type": PatternType.URL,
                        "pattern_value": candidate.normalized_url,
                        "category": (
                            "VirusTotal 자동 승인 "
                            f"(malicious={verdict.malicious}, "
                            f"suspicious={verdict.suspicious})"
                        ),
                        "source": URL_CANDIDATE_MANAGED_SOURCE,
                    }
                ],
                commit=False,
            )

        await db.commit()
        return CandidateValidationResult(
            status=candidate.status,
            outcome=candidate.status.value.lower(),
        )
    except VirusTotalRateLimitError as exc:
        await db.rollback()
        candidate = await get_claimed_candidate_for_update(
            db,
            candidate_id=candidate_id,
            processing_token=processing_token,
        )
        if candidate is None:
            await db.rollback()
            return await _superseded_result(db, candidate_id)

        candidate.vt_last_error = str(exc)
        candidate.processing_token = None
        candidate.next_check_at = now + timedelta(
            seconds=exc.retry_after_seconds
        )
        await db.commit()
        return CandidateValidationResult(
            status=candidate.status,
            outcome="rate_limited",
        )
    except (httpx.HTTPError, KeyError, TypeError, ValueError) as exc:
        await db.rollback()
        candidate = await get_claimed_candidate_for_update(
            db,
            candidate_id=candidate_id,
            processing_token=processing_token,
        )
        if candidate is None:
            await db.rollback()
            return await _superseded_result(db, candidate_id)

        candidate.vt_last_error = str(exc)[:255]
        candidate.processing_token = None
        candidate.next_check_at = now + timedelta(
            hours=settings.VT_ERROR_RETRY_HOURS
        )
        await db.commit()
        return CandidateValidationResult(
            status=candidate.status,
            outcome="failed",
        )


async def process_pending_url_candidates() -> dict[str, int]:
    if not settings.VIRUSTOTAL_API_KEY:
        raise RuntimeError("VIRUSTOTAL_API_KEY 환경변수가 필요합니다.")

    from ..db.base import engine
    from ..db.session import AsyncSessionLocal

    counts = {
        "attempted": 0,
        "checked": 0,
        "approved": 0,
        "review_required": 0,
        "pending": 0,
        "submitted": 0,
        "rate_limited": 0,
        "failed": 0,
        "superseded": 0,
        "lock_unavailable": 0,
    }
    async with engine.connect() as lock_connection:
        acquired = await lock_connection.scalar(
            text(
                "SELECT GET_LOCK("
                "CONCAT(DATABASE(), '_virustotal_url_worker'), 0"
                ")"
            )
        )
        if acquired != 1:
            counts["lock_unavailable"] = 1
            return counts

        try:
            timeout = httpx.Timeout(settings.VT_TIMEOUT_SECONDS)
            async with httpx.AsyncClient(timeout=timeout) as client:
                async with AsyncSessionLocal() as db:
                    for _ in range(settings.VT_BATCH_SIZE):
                        now = datetime.now(timezone.utc).replace(tzinfo=None)
                        candidate = await claim_next_candidate_for_vt_check(
                            db,
                            now=now,
                            lease_until=now
                            + timedelta(
                                minutes=settings.VT_CANDIDATE_LEASE_MINUTES
                            ),
                        )
                        if candidate is None:
                            break

                        result = await validate_url_candidate(
                            db,
                            client,
                            candidate,
                        )
                        record_validation_outcome(counts, result.outcome)
                        if result.outcome == "rate_limited":
                            break
        finally:
            await lock_connection.execute(
                text(
                    "SELECT RELEASE_LOCK("
                    "CONCAT(DATABASE(), '_virustotal_url_worker')"
                    ")"
                )
            )

    return counts
