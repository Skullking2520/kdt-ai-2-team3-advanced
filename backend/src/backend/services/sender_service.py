from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from ..repository.sender_repository import (
    create_sender_lookup_log,
    find_sender_blacklist_matches,
)


async def lookup_sender_number(
    db: AsyncSession,
    number: str,
) -> dict[str, Any]:
    matches = await find_sender_blacklist_matches(db, number)
    is_smishing = bool(matches)

    await create_sender_lookup_log(
        db,
        number=number,
        is_smishing=is_smishing,
    )

    if matches:
        pattern = matches[0]
        return {
            "number": number,
            "trustScore": 0,
            "status": "danger",
            "reportCount": len(matches),
            "lastReportedAt": (
                pattern.created_at.isoformat() if pattern.created_at else None
            ),
            "categories": [p.category for p in matches if p.category],
            "history": [],
        }

    return {
        "number": number,
        "trustScore": 100,
        "status": "safe",
        "reportCount": 0,
        "lastReportedAt": None,
        "categories": [],
        "history": [],
    }
