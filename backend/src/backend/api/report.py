from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.session import get_db
from ..schemas.report_api import ReportRequest, ReportResponse, ReportStats
from ..services.report_service import build_report_stats, save_report_static_patterns

router = APIRouter(prefix="/api/reports")


@router.post("", response_model=ReportResponse)
async def report_smishing(
    request: ReportRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    프론트엔드의 "신고"를 받아 db에 저장한다
    """

    return await save_report_static_patterns(db, request)


@router.get("/stats", response_model=ReportStats)
async def get_report_stats(
    db: AsyncSession = Depends(get_db),
):
    return await build_report_stats(db)
