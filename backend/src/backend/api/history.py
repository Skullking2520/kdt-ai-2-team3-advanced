from typing import Annotated

from fastapi import APIRouter, HTTPException, Query

from ..schemas.history_api import HistoryItem, PaginatedHistoryResponse
from ..schemas.predict_api import PredictResponse

router = APIRouter(prefix="/api/history", tags=["History"])


@router.get("", response_model=PaginatedHistoryResponse)
async def get_history(
    page: Annotated[int, Query(ge=1)] = 1,
    size: Annotated[int, Query(ge=1, le=100)] = 20,
):
    """
    분석 이력 목록 조회.

    TODO:
    - DB 조회 및 페이지네이션
    - page/size 쿼리 처리
    """
    raise HTTPException(status_code=501, detail="TODO: implement /api/history")


@router.get("/{analysis_id}", response_model=PredictResponse)
async def get_history_item(analysis_id: str):
    """
    단일 분석 이력 상세 조회.

    TODO:
    - DB에서 analysis_id로 기록 조회
    """
    raise HTTPException(status_code=501, detail="TODO: implement /api/history/{analysis_id}")
