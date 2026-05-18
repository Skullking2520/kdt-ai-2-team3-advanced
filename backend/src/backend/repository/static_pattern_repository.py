from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.static_patterns import StaticPattern


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
