import hashlib

from sqlalchemy import select, tuple_, update
from sqlalchemy.dialects.mysql import insert as mysql_insert
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.static_patterns import PatternType, StaticPattern


def _hash_value(value: str) -> str:
    return hashlib.sha256(value.strip().lower().encode()).hexdigest()


async def find_matching_static_patterns(
    db: AsyncSession,
    extracted_patterns: dict[PatternType, list[str]],
) -> list[StaticPattern]:
    lookup_pairs = []
    for pattern_type, values in extracted_patterns.items():
        for value in values:
            if value and value.strip():
                lookup_pairs.append((pattern_type, _hash_value(value)))

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
) -> None:
    if not patterns:
        return

    seen = set()
    for pattern in patterns:
        value = pattern["pattern_value"].strip()
        if not value:
            continue

        pattern_hash = _hash_value(value)
        if pattern_hash in seen:
            continue
        seen.add(pattern_hash)

        await db.execute(
            mysql_insert(StaticPattern)
            .values(
                pattern_type=pattern["pattern_type"],
                pattern_value=value[:500],
                pattern_hash=pattern_hash,
                description=pattern.get("description", "")[:255] if pattern.get("description") else None,
                source=pattern.get("source"),
                is_active=True,
                report_count=1,
            )
            .on_duplicate_key_update(
                report_count=StaticPattern.report_count + 1,
            )
        )

    await db.commit()
