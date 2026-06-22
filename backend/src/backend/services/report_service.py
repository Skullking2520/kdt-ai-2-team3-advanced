from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from ..models.smishing_log import DetectionType, InputType
from ..models.static_patterns import PatternType
from ..repository.smishing_log_repository import create_smishing_log
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
            "category": description,
            "source": "USER_REPORT",
        }
        for phone in extracted["phones"]
    ]
    if request.sender and request.sender not in extracted["phones"]:
        rows.append({
            "pattern_type": PatternType.PHONE,
            "pattern_value": request.sender,
            "category": description,
            "source": "USER_REPORT",
        })
    return rows


def _report_input_type(report_type: str) -> InputType:
    normalized = report_type.upper()
    if normalized in InputType.__members__:
        return InputType[normalized]
    return InputType.SMS


def _report_reasoning(request: ReportRequest) -> str:
    parts = [
        f"사용자 신고 유형: {request.category or request.type}",
        f"학습 활용 동의: {bool(request.agreeShare)}",
    ]
    if request.sender:
        parts.append(f"발신번호: {request.sender}")
    if request.url:
        parts.append(f"신고 URL: {request.url}")
    if request.notes:
        parts.append(f"메모: {request.notes}")
    return " | ".join(parts)


async def save_report_static_patterns(
    db: AsyncSession,
    request: ReportRequest,
) -> ReportResponse:
    extracted = extract_static_patterns(request.content)
    urls = list(extracted["urls"])
    if request.url and request.url not in urls:
        urls.append(request.url)

    # URL은 URL 후보 검증 플로우로
    await register_reported_url_candidates(
        db,
        urls=urls,
        report_type=request.type,
    )

    # 전화번호는 정적 패턴에 직접 저장
    phone_rows = _to_phone_pattern_rows(request)
    await upsert_static_patterns(db, phone_rows, commit=False)

    await create_smishing_log(
        db,
        content=request.content,
        is_smishing=True,
        detection_type=DetectionType.STATIC_PATTERN,
        input_type=_report_input_type(request.type),
        reasoning=_report_reasoning(request),
        consent_for_training=bool(request.agreeShare),
        static_url_match=bool(urls),
    )
    await db.commit()

    return ReportResponse(
        receiptId=_generate_receipt_id(),
        status="received",
        createdAt=datetime.now(timezone.utc).isoformat(),
    )
