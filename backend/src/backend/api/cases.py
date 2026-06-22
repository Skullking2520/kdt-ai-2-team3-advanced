from typing import Annotated

from fastapi import APIRouter, HTTPException, Query

from ..schemas.case_api import CaseStudy, PaginatedCaseStudyResponse

router = APIRouter(prefix="/api/cases", tags=["Cases"])


@router.get("", response_model=PaginatedCaseStudyResponse)
async def list_cases(
    category: Annotated[str | None, Query()] = None,
    page: Annotated[int, Query(ge=1)] = 1,
):
    """
    사례 목록 조회.

    TODO:
    - DB에서 category 필터링 및 page 기반 페이지네이션
    - page/limit 쿼리 처리
    """
    raise HTTPException(status_code=501, detail="TODO: implement /api/cases")


@router.get("/{case_id}", response_model=CaseStudy)
async def get_case(case_id: str):
    """
    개별 사례 조회.

    TODO:
    - DB에서 case_id로 사례 조회
    """
    raise HTTPException(status_code=501, detail="TODO: implement /api/cases/{case_id}")
