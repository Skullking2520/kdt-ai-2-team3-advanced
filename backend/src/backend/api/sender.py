from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.session import get_db
from ..models.smishing_log import DetectionType, InputType
from ..models.static_patterns import PatternType
from ..repository.smishing_log_repository import create_smishing_log
from ..repository.static_pattern_repository import find_matching_static_patterns

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
    matches = await find_matching_static_patterns(db, {PatternType.PHONE: [number]})
    is_smishing = bool(matches)

    await create_smishing_log(
        db,
        content=number,
        is_smishing=is_smishing,
        detection_type=DetectionType.STATIC_PATTERN,
        input_type=InputType.PHONE,
    )

    if matches:
        pattern = matches[0]
        return {
            "number": number,
            "trustScore": 0,
            "status": "danger",
            "reportCount": len(matches),
            "lastReportedAt": pattern.created_at.isoformat() if pattern.created_at else None,
            "categories": [p.description for p in matches if p.description],
            "history": [],
            "isp": "알 수 없음",
            "region": "알 수 없음",
        }

    return {
        "number": number,
        "trustScore": 100,
        "status": "safe",
        "reportCount": 0,
        "lastReportedAt": None,
        "categories": [],
        "history": [],
        "isp": "알 수 없음",
        "region": "알 수 없음",
    }
