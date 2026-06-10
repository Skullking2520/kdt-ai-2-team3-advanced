from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from ..models.static_patterns import PatternType, StaticPattern
from ..repository.static_pattern_repository import upsert_static_patterns
from ..schemas.report_api import ReportRequest, ReportResponse
from ..utils.preprocessor import extract_static_patterns


def _generate_receipt_id() -> str:
    now = datetime.now(timezone.utc)
    # NB20260608-143022 형식
    return f"NB{now.strftime('%Y%m%d-%H%M%S')}"


def _to_static_pattern_rows(request: ReportRequest) -> list[dict]:
    extracted = extract_static_patterns(request.content)
    description = f"사용자 신고 유형: {request.category or request.type}"

    rows = []
    rows.extend(
        {
            "pattern_type": PatternType.URL,
            "pattern_value": url,
            "description": description,
        }
        for url in extracted["urls"]
    )
    # URL 필드에 직접 입력한 값도 블랙리스트에 추가
    if request.url and request.url not in extracted["urls"]:
        rows.append({
            "pattern_type": PatternType.URL,
            "pattern_value": request.url,
            "description": description,
        })
    rows.extend(
        {
            "pattern_type": PatternType.PHONE,
            "pattern_value": phone,
            "description": description,
        }
        for phone in extracted["phones"]
    )
    if request.sender and request.sender not in extracted["phones"]:
        rows.append({
            "pattern_type": PatternType.PHONE,
            "pattern_value": request.sender,
            "description": description,
        })

    return rows


async def save_report_static_patterns(
    db: AsyncSession,
    request: ReportRequest,
) -> ReportResponse:
    rows = _to_static_pattern_rows(request)
    await upsert_static_patterns(db, rows)

    return ReportResponse(
        receiptId=_generate_receipt_id(),
        status="received",
        createdAt=datetime.now(timezone.utc).isoformat(),
    )
