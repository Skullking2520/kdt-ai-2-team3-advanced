from __future__ import annotations

from datetime import date, timedelta

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

# predict 응답의 riskLevel 로직을 DB 집계로 재현한다.
# (smishing_logs에는 risk_level 컬럼이 없어 ai_score/detection_type/is_smishing으로 계산)
RISK_LEVEL_CASE = """
CASE
    WHEN is_smishing = 0 THEN 'low'
    WHEN detection_type = 'STATIC_PATTERN' THEN 'high'
    WHEN ai_score IS NOT NULL AND ai_score * 100 >= 70 THEN 'high'
    ELSE 'medium'
END
"""

_WEEKDAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"]


def _empty_risk() -> dict[str, int]:
    return {"high": 0, "medium": 0, "low": 0}


async def get_dashboard_stats(db: AsyncSession) -> dict:
    # 1) 오늘(created_at = 오늘 날짜) 위험도별 카운트
    today_result = await db.execute(
        text(
            f"""
            SELECT {RISK_LEVEL_CASE} AS risk, COUNT(*) AS cnt
            FROM smishing_logs
            WHERE DATE(created_at) = CURDATE()
            GROUP BY risk
            """
        )
    )
    today = _empty_risk()
    for risk, cnt in today_result:
        if risk in today:
            today[risk] = int(cnt)
    today_total = today["high"] + today["medium"] + today["low"]

    # 2) 최근 7일 날짜별 위험도 카운트
    weekly_result = await db.execute(
        text(
            f"""
            SELECT DATE(created_at) AS d, {RISK_LEVEL_CASE} AS risk, COUNT(*) AS cnt
            FROM smishing_logs
            WHERE created_at >= (CURDATE() - INTERVAL 6 DAY)
            GROUP BY d, risk
            """
        )
    )
    by_date: dict[date, dict[str, int]] = {}
    for d, risk, cnt in weekly_result:
        day = d if isinstance(d, date) else date.fromisoformat(str(d))
        bucket = by_date.setdefault(day, _empty_risk())
        if risk in bucket:
            bucket[risk] = int(cnt)

    today_date = date.today()
    weekly_trend = []
    for offset in range(6, -1, -1):  # 6일 전 ~ 오늘 (날짜순)
        day = today_date - timedelta(days=offset)
        counts = by_date.get(day, _empty_risk())
        weekly_trend.append({
            "day": _WEEKDAY_LABELS[day.weekday()],
            "date": day.isoformat(),
            "high": counts["high"],
            "medium": counts["medium"],
            "low": counts["low"],
        })

    return {
        "todayTotal": today_total,
        "today": today,           # 카드 + 위험도 분포 도넛 (오늘 기준)
        "weeklyTrend": weekly_trend,  # 주간 탐지 추이 (최근 7일)
    }
