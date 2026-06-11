from sqlalchemy import delete, select, tuple_
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
    # 데이터베이스(DB)에 이미 존재하는지 한 번에 대량 조회(Bulk Lookup)
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


async def create_static_patterns_if_new(
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
