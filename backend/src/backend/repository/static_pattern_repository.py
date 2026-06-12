from sqlalchemy import delete, select, tuple_, update
from sqlalchemy.dialects.mysql import insert as mysql_insert
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.static_patterns import (
    URL_CANDIDATE_MANAGED_SOURCE,
    PatternType,
    StaticPattern,
)
from ..utils.url import hash_value, normalize_url


def _normalize_pattern_value(pattern_type: PatternType, value: str) -> str:
    stripped = value.strip()
    if pattern_type is PatternType.URL:
        return normalize_url(stripped)
    return stripped


async def find_matching_static_patterns(
    db: AsyncSession,
    extracted_patterns: dict[PatternType, list[str]],
) -> list[StaticPattern]:
    lookup_pairs = []
    for pattern_type, values in extracted_patterns.items():
        for value in values:
            if not value or not value.strip():
                continue

            normalized_value = _normalize_pattern_value(pattern_type, value)
            lookup_pairs.append(
                (pattern_type, hash_value(normalized_value))
            )
            if pattern_type is PatternType.URL:
                lookup_pairs.append(
                    (pattern_type, hash_value(value.strip()))
                )

    if not lookup_pairs:
        return []

    rows = await db.execute(
        select(StaticPattern).where(
            tuple_(
                StaticPattern.pattern_type,
                StaticPattern.pattern_hash,
            ).in_(set(lookup_pairs))
        )
    )
    return list(rows.scalars().all())


async def increment_pattern_counts(
    db: AsyncSession,
    patterns: list[StaticPattern],
) -> None:
    if not patterns:
        return
    ids = [p.id for p in patterns]
    await db.execute(
        update(StaticPattern)
        .where(StaticPattern.id.in_(ids))
        .values(report_count=StaticPattern.report_count + 1)
    )
    await db.commit()


async def upsert_static_patterns(
    db: AsyncSession,
    patterns: list[dict],
    *,
    commit: bool = True,
) -> list[StaticPattern]:
    if not patterns:
        return []

    normalized_patterns = []
    seen = set()
    for pattern in patterns:
        pattern_type = pattern["pattern_type"]
        pattern_value = _normalize_pattern_value(
            pattern_type,
            pattern["pattern_value"],
        )
        description = pattern.get("description")
        managed_source = pattern.get("managed_source")
        pattern_hash = hash_value(pattern_value)
        key = (pattern_type, pattern_hash)

        if not pattern_value or key in seen:
            continue

        seen.add(key)
        normalized_patterns.append(
            {
                "pattern_type": pattern_type,
                "pattern_value": pattern_value,
                "pattern_hash": pattern_hash,
                "description": description[:255] if description else None,
                "managed_source": managed_source,
            }
        )

    if not normalized_patterns:
        return []

    for pattern in normalized_patterns:
        await db.execute(
            mysql_insert(StaticPattern).values(**pattern).prefix_with("IGNORE")
        )

    if commit:
        await db.commit()
    else:
        await db.flush()

    keys = {
        (pattern["pattern_type"], pattern["pattern_hash"])
        for pattern in normalized_patterns
    }
    rows = await db.execute(
        select(StaticPattern).where(
            tuple_(
                StaticPattern.pattern_type,
                StaticPattern.pattern_hash,
            ).in_(keys)
        )
    )
    return list(rows.scalars().all())


async def delete_static_url_pattern(
    db: AsyncSession,
    url: str,
) -> None:
    normalized_url = normalize_url(url)
    await db.execute(
        delete(StaticPattern).where(
            StaticPattern.pattern_type == PatternType.URL,
            StaticPattern.pattern_hash == hash_value(normalized_url),
            StaticPattern.managed_source == URL_CANDIDATE_MANAGED_SOURCE,
        )
    )
