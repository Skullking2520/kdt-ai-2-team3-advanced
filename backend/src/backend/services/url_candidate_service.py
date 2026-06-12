from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from ..models.static_patterns import (
    URL_CANDIDATE_MANAGED_SOURCE,
    PatternType,
)
from ..models.url_candidate import (
    UrlCandidate,
    UrlCandidateSource,
    UrlCandidateStatus,
)
from ..repository.static_pattern_repository import (
    upsert_static_patterns,
    delete_static_url_pattern,
)
from ..repository.url_candidate_repository import (
    list_url_candidates,
    upsert_url_candidates,
)


async def register_model_url_candidates(
    db: AsyncSession,
    *,
    urls: list[str],
    confidence: float,
    reason: str,
) -> list[UrlCandidate]:
    return await upsert_url_candidates(
        db,
        urls,
        source=UrlCandidateSource.MODEL,
        confidence=confidence,
        description=reason,
        commit=False,
    )


async def register_reported_url_candidates(
    db: AsyncSession,
    *,
    urls: list[str],
    report_type: str,
) -> list[UrlCandidate]:
    return await upsert_url_candidates(
        db,
        urls,
        source=UrlCandidateSource.USER_REPORT,
        description=f"사용자 신고 유형: {report_type}",
        commit=False,
    )


async def get_url_candidates(
    db: AsyncSession,
    *,
    status: UrlCandidateStatus | None,
    offset: int,
    limit: int,
) -> list[UrlCandidate]:
    return await list_url_candidates(
        db,
        status=status,
        offset=offset,
        limit=limit,
    )


async def review_url_candidate(
    db: AsyncSession,
    *,
    candidate_id: int,
    approve: bool,
    reviewer: str,
    note: str | None,
) -> UrlCandidate | None:
    candidate = await db.get(UrlCandidate, candidate_id, with_for_update=True)
    if candidate is None:
        return None

    if approve:
        await upsert_static_patterns(
            db,
            [
                {
                    "pattern_type": PatternType.URL,
                    "pattern_value": candidate.normalized_url,
                    "description": (
                        f"관리자 승인 URL 후보 (reviewer={reviewer})"
                    ),
                    "managed_source": URL_CANDIDATE_MANAGED_SOURCE,
                }
            ],
            commit=False,
        )
        candidate.status = UrlCandidateStatus.APPROVED
    else:
        await delete_static_url_pattern(
            db,
            candidate.normalized_url,
        )
        candidate.status = UrlCandidateStatus.REJECTED

    candidate.reviewed_at = datetime.now(timezone.utc).replace(tzinfo=None)
    candidate.reviewer = reviewer[:100]
    candidate.review_note = note[:500] if note else None
    candidate.next_check_at = None
    candidate.processing_token = None
    await db.commit()
    await db.refresh(candidate)
    return candidate
