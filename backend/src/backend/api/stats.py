from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.session import get_db
from ..services.stats_service import get_dashboard_stats

router = APIRouter(prefix="/api/stats", tags=["Stats"])


@router.get("/dashboard")
async def dashboard_stats(db: AsyncSession = Depends(get_db)):
    """
    운영 대시보드 통계. smishing_logs를 created_at(분석 날짜) 기준으로 집계한다.
    - todayTotal: 오늘 총 분석 수
    - today: 오늘 위험도별 카운트 (high/medium/low) — 카드 + 위험도 분포
    - weeklyTrend: 최근 7일 일자별 위험도 카운트 — 주간 탐지 추이
    """
    return await get_dashboard_stats(db)
