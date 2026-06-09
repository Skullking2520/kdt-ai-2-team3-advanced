from sqlalchemy.ext.asyncio import AsyncSession

from ..models.static_patterns import PatternType, StaticPattern
from ..repository.static_pattern_repository import create_static_patterns_if_new
from ..schemas.report_api import ReportRequest
from ..utils.preprocessor import extract_static_patterns


def _to_static_pattern_rows(request: ReportRequest) -> list[dict]:
    extracted = extract_static_patterns(request.text)

    description = f"사용자 신고 유형: {request.type}"

    rows = []
    rows.extend(
        {
            "pattern_type": PatternType.URL,
            "pattern_value": url,
            "description": description,
        }
        for url in extracted["urls"]
    )
    rows.extend(
        {
            "pattern_type": PatternType.PHONE,
            "pattern_value": phone,
            "description": description,
        }
        for phone in extracted["phones"]
    )

    return rows


async def save_report_static_patterns(
    db: AsyncSession,
    request: ReportRequest,
) -> list[StaticPattern]:
    rows = _to_static_pattern_rows(request)

    return await create_static_patterns_if_new(db, rows)
