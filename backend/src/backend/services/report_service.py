from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from ..models.static_patterns import PatternType, StaticPattern
from ..repository.static_pattern_repository import upsert_static_patterns
from ..schemas.report_api import ReportRequest, ReportResponse
from ..utils.preprocessor import extract_static_patterns
from .url_candidate_service import register_reported_url_candidates


def _generate_receipt_id() -> str:
    now = datetime.now(timezone.utc)
    # NB20260608-143022 형식
    return f"NB{now.strftime('%Y%m%d-%H%M%S')}"


def _to_phone_pattern_rows(request: ReportRequest) -> list[dict]:
    extracted = extract_static_patterns(request.content)
    description = f"사용자 신고 유형: {request.category or request.type}"

    rows = [
        {
            "pattern_type": PatternType.PHONE,
            "pattern_value": phone,
            "description": description,
        }
        for phone in extracted["phones"]
    ]
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
    extracted = extract_static_patterns(request.content)

    # URL은 URL 후보 검증 플로우로
    await register_reported_url_candidates(
        db,
        urls=extracted["urls"],
        report_type=request.type,
    )

    # 전화번호는 정적 패턴에 직접 저장
    phone_rows = _to_phone_pattern_rows(request)
    await upsert_static_patterns(db, phone_rows, commit=True)

    return ReportResponse(
        receiptId=_generate_receipt_id(),
        status="received",
        createdAt=datetime.now(timezone.utc).isoformat(),
    )
