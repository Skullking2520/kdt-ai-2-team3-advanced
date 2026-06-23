from sqlalchemy.ext.asyncio import AsyncSession

from ..models.smishing_log import DetectionType, InputType, SmishingLog
from ..models.static_patterns import PatternType, StaticPattern
from .smishing_log_repository import create_smishing_log
from .static_pattern_repository import find_matching_static_patterns


async def find_sender_blacklist_matches(
    db: AsyncSession,
    number: str,
) -> list[StaticPattern]:
    return await find_matching_static_patterns(db, {PatternType.PHONE: [number]})


async def create_sender_lookup_log(
    db: AsyncSession,
    *,
    number: str,
    is_smishing: bool,
) -> SmishingLog:
    return await create_smishing_log(
        db,
        content=number,
        is_smishing=is_smishing,
        detection_type=DetectionType.STATIC_PATTERN,
        input_type=InputType.PHONE,
    )
