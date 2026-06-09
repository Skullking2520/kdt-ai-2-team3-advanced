from sqlalchemy.ext.asyncio import AsyncSession

from ..models.static_patterns import PatternType, StaticPattern
from ..repository.static_pattern_repository import create_static_patterns_if_new
from ..schemas.report_api import ReportRequest
from ..utils.preprocessor import extract_static_patterns
from .url_candidate_service import register_reported_url_candidates


def _to_phone_pattern_rows(request: ReportRequest) -> list[dict]:
    extracted = extract_static_patterns(request.text)

    description = f"사용자 신고 유형: {request.type}"

    return [
        {
            "pattern_type": PatternType.PHONE,
            "pattern_value": phone,
            "description": description,
        }
        for phone in extracted["phones"]
    ]


async def save_report_static_patterns(
    db: AsyncSession,
    request: ReportRequest,
) -> list[StaticPattern]:
    extracted = extract_static_patterns(request.text)
    await register_reported_url_candidates(
        db,
        urls=extracted["urls"],
        report_type=request.type,
    )

    phone_patterns = await create_static_patterns_if_new(
        db,
        _to_phone_pattern_rows(request),
        commit=False,
    )
    await db.commit()
    return phone_patterns
