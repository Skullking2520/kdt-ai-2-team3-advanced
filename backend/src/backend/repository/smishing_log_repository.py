from sqlalchemy.ext.asyncio import AsyncSession

from ..models.smishing_log import DetectionType, InputType, SmishingLog


async def create_smishing_log(
    db: AsyncSession,
    content: str,
    is_smishing: bool,
    detection_type: DetectionType,
    input_type: InputType | None = None,
    ai_score: float | None = None,
    reasoning: str | None = None,
) -> SmishingLog:
    log = SmishingLog(
        content=content,
        is_smishing=is_smishing,
        detection_type=detection_type,
        input_type=input_type,
        ai_score=ai_score,
        reasoning=reasoning,
    )
    db.add(log)
    await db.commit()
    await db.refresh(log)
    return log
