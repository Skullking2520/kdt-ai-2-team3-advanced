from sqlalchemy.ext.asyncio import AsyncSession

from ..models.smishing_log import DetectionType, SmishingLog


async def create_smishing_log(
    db: AsyncSession,
    message_content: str,
    is_smishing: bool,
    detection_type: DetectionType,
    ai_score: float | None = None,
    reasoning: str | None = None,
) -> SmishingLog:
    log = SmishingLog(
        message_content=message_content,
        is_smishing=is_smishing,
        detection_type=detection_type,
        ai_score=ai_score,
        reasoning=reasoning,
    )
    db.add(log)
    await db.commit()
    await db.refresh(log)
    return log
