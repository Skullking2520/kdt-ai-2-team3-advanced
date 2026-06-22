from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.session import get_db
from ..services.sender_service import lookup_sender_number

router = APIRouter(prefix="/api/sender")


@router.get("/{number}")
async def lookup_sender(
    number: str,
    db: AsyncSession = Depends(get_db),
):
    """
    전화번호 블랙리스트 조회 — static_patterns 테이블(PHONE 타입) 기반
    조회 이력은 smishing_logs에 저장
    """
    return await lookup_sender_number(db, number)
