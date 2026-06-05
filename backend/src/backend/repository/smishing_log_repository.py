from sqlalchemy.ext.asyncio import AsyncSession

from ..models.smishing_log import SmishingLog


async def create_smishing_log(
    db: AsyncSession,
    message_content: str,
    is_smishing: bool,
    ai_score: float | None = None,
    reasoning: str | None = None,
) -> SmishingLog:
    log = SmishingLog(
        message_content=message_content,
        is_smishing=is_smishing,
        ai_score=ai_score,
        reasoning=reasoning,
    )
    db.add(log)
    await db.commit()
    await db.refresh(log)
    return log
