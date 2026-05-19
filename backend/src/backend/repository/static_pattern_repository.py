from sqlalchemy import func, select, tuple_
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.static_patterns import PatternType, StaticPattern


async def find_matching_static_patterns(
    db: AsyncSession,
    extracted_patterns: dict[PatternType, list[str]],
) -> list[StaticPattern]:
    # 데이터베이스(DB)에 이미 존재하는지 한 번에 대량 조회(Bulk Lookup)
    lookup_pairs = []
    for pattern_type, values in extracted_patterns.items():
        lookup_pairs.extend(
            (pattern_type, value.strip().lower())
            for value in values
            if value and value.strip()
        )

    if not lookup_pairs:
        return []

    rows = await db.execute(
        select(StaticPattern).where(
            tuple_(
                StaticPattern.pattern_type,
                func.lower(StaticPattern.pattern_value),
            ).in_(set(lookup_pairs))
        )
    )

    return list(rows.scalars().all())


async def create_static_patterns_if_new(
    db: AsyncSession,
    patterns: list[dict],
) -> list[StaticPattern]:
    if not patterns:
        return []

    normalized_patterns = []
    seen = set()
    for pattern in patterns:
        pattern_type = pattern["pattern_type"]
        pattern_value = pattern["pattern_value"].strip()[:255]
        description = pattern.get("description")
        key = (pattern_type, pattern_value.lower())

        if not pattern_value or key in seen:
            continue

        seen.add(key)
        normalized_patterns.append(
            {
                "pattern_type": pattern_type,
                "pattern_value": pattern_value,
                "description": description[:255] if description else None,
            }
        )

    if not normalized_patterns:
        return []

    pattern_types = {pattern["pattern_type"] for pattern in normalized_patterns}
    lower_values = {pattern["pattern_value"].lower() for pattern in normalized_patterns}
    existing_rows = await db.execute(
        select(StaticPattern.pattern_type, StaticPattern.pattern_value)
        .where(StaticPattern.pattern_type.in_(pattern_types))
        .where(func.lower(StaticPattern.pattern_value).in_(lower_values))
    )
    existing = {
        (pattern_type, pattern_value.lower())
        for pattern_type, pattern_value in existing_rows.all()
    }

    new_patterns = [
        StaticPattern(**pattern)
        for pattern in normalized_patterns
        if (pattern["pattern_type"], pattern["pattern_value"].lower()) not in existing
    ]

    if not new_patterns:
        return []

    db.add_all(new_patterns)
    await db.commit()

    for pattern in new_patterns:
        await db.refresh(pattern)

    return new_patterns
