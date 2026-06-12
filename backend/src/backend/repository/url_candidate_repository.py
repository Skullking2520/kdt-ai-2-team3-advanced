from datetime import date, datetime
from uuid import uuid4

from sqlalchemy import case, func, or_, select
from sqlalchemy.dialects.mysql import insert as mysql_insert
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.url_candidate import (
    UrlCandidate,
    UrlCandidateSource,
    UrlCandidateStatus,
    VirusTotalQuota,
)
from ..utils.url import hash_value, normalize_url


async def upsert_url_candidates(
    db: AsyncSession,
    urls: list[str],
    *,
    source: UrlCandidateSource,
    confidence: float | None = None,
    description: str | None = None,
    commit: bool = True,
) -> list[UrlCandidate]:
    normalized_urls = {}

    for url in urls:
        normalized_url = normalize_url(url)
        url_hash = hash_value(normalized_url) if normalized_url else ""
        if not normalized_url or url_hash in normalized_urls:
            continue
        normalized_urls[url_hash] = (normalized_url, url.strip())

    if not normalized_urls:
        return []

    report_increment = 1 if source is UrlCandidateSource.USER_REPORT else 0
    model_increment = 1 if source is UrlCandidateSource.MODEL else 0

    for url_hash, (normalized_url, original_url) in normalized_urls.items():
        statement = mysql_insert(UrlCandidate).values(
            url=original_url,
            normalized_url=normalized_url,
            url_hash=url_hash,
            last_source=source,
            report_count=report_increment,
            model_detection_count=model_increment,
            max_confidence=confidence,
            description=description[:255] if description else None,
            status=UrlCandidateStatus.PENDING,
        )
        updates = {
            "last_source": source,
            "report_count": UrlCandidate.report_count + report_increment,
            "model_detection_count": (
                UrlCandidate.model_detection_count + model_increment
            ),
            "updated_at": func.now(),
        }
        if source is UrlCandidateSource.USER_REPORT:
            reopen_rejected = UrlCandidate.status == UrlCandidateStatus.REJECTED
            updates.update(
                {
                    "status": case(
                        (reopen_rejected, UrlCandidateStatus.PENDING),
                        else_=UrlCandidate.status,
                    ),
                    "next_check_at": case(
                        (reopen_rejected, None),
                        else_=UrlCandidate.next_check_at,
                    ),
                    "reviewed_at": case(
                        (reopen_rejected, None),
                        else_=UrlCandidate.reviewed_at,
                    ),
                    "reviewer": case(
                        (reopen_rejected, None),
                        else_=UrlCandidate.reviewer,
                    ),
                    "review_note": case(
                        (reopen_rejected, None),
                        else_=UrlCandidate.review_note,
                    ),
                    "vt_malicious_count": case(
                        (reopen_rejected, None),
                        else_=UrlCandidate.vt_malicious_count,
                    ),
                    "vt_suspicious_count": case(
                        (reopen_rejected, None),
                        else_=UrlCandidate.vt_suspicious_count,
                    ),
                    "vt_total_count": case(
                        (reopen_rejected, None),
                        else_=UrlCandidate.vt_total_count,
                    ),
                    "vt_last_checked_at": case(
                        (reopen_rejected, None),
                        else_=UrlCandidate.vt_last_checked_at,
                    ),
                    "vt_last_error": case(
                        (reopen_rejected, None),
                        else_=UrlCandidate.vt_last_error,
                    ),
                    "processing_token": case(
                        (reopen_rejected, None),
                        else_=UrlCandidate.processing_token,
                    ),
                }
            )
        if confidence is not None:
            updates["max_confidence"] = func.greatest(
                func.coalesce(UrlCandidate.max_confidence, 0.0),
                confidence,
            )
        if description:
            updates["description"] = description[:255]

        await db.execute(statement.on_duplicate_key_update(**updates))

    if commit:
        await db.commit()
    else:
        await db.flush()
    rows = await db.execute(
        select(UrlCandidate).where(
            UrlCandidate.url_hash.in_(normalized_urls)
        )
    )
    return list(rows.scalars().all())


async def reserve_vt_request(
    db: AsyncSession,
    *,
    quota_date: date,
    daily_limit: int,
) -> bool:
    await db.execute(
        mysql_insert(VirusTotalQuota)
        .values(quota_date=quota_date, used_count=0)
        .prefix_with("IGNORE")
    )
    quota = await db.scalar(
        select(VirusTotalQuota)
        .where(VirusTotalQuota.quota_date == quota_date)
        .with_for_update()
    )
    if quota is None or quota.used_count >= daily_limit:
        await db.rollback()
        return False

    quota.used_count += 1
    await db.commit()
    return True


async def claim_next_candidate_for_vt_check(
    db: AsyncSession,
    *,
    now: datetime,
    lease_until: datetime,
) -> UrlCandidate | None:
    candidate = await db.scalar(
        select(UrlCandidate)
        .where(
            UrlCandidate.status.in_(
                {
                    UrlCandidateStatus.PENDING,
                    UrlCandidateStatus.REVIEW_REQUIRED,
                }
            ),
            or_(
                UrlCandidate.next_check_at.is_(None),
                UrlCandidate.next_check_at <= now,
            ),
        )
        .order_by(UrlCandidate.next_check_at, UrlCandidate.created_at)
        .with_for_update(skip_locked=True)
        .limit(1)
    )
    if candidate is None:
        await db.rollback()
        return None

    candidate.processing_token = str(uuid4())
    candidate.next_check_at = lease_until
    await db.commit()
    return candidate


async def get_claimed_candidate_for_update(
    db: AsyncSession,
    *,
    candidate_id: int,
    processing_token: str,
) -> UrlCandidate | None:
    return await db.scalar(
        select(UrlCandidate)
        .where(
            UrlCandidate.id == candidate_id,
            UrlCandidate.processing_token == processing_token,
            UrlCandidate.status.in_(
                {
                    UrlCandidateStatus.PENDING,
                    UrlCandidateStatus.REVIEW_REQUIRED,
                }
            ),
        )
        .with_for_update()
        .execution_options(populate_existing=True)
    )


async def list_url_candidates(
    db: AsyncSession,
    *,
    status: UrlCandidateStatus | None,
    offset: int,
    limit: int,
) -> list[UrlCandidate]:
    statement = select(UrlCandidate).order_by(
        UrlCandidate.updated_at.desc(),
        UrlCandidate.id.desc(),
    )
    if status is not None:
        statement = statement.where(UrlCandidate.status == status)

    rows = await db.execute(statement.offset(offset).limit(limit))
    return list(rows.scalars().all())
