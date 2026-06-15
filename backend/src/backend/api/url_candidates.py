from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.security import require_admin_api_key
from ..db.session import get_db
from ..models.url_candidate import UrlCandidateStatus
from ..schemas.url_candidate_api import (
    UrlCandidateResponse,
    UrlCandidateReviewRequest,
)
from ..services.url_candidate_service import (
    get_url_candidates,
    review_url_candidate,
)

router = APIRouter(
    prefix="/admin/url-candidates",
    tags=["URL candidates"],
    dependencies=[Depends(require_admin_api_key)],
)


@router.get("", response_model=list[UrlCandidateResponse])
async def list_candidates(
    db: Annotated[AsyncSession, Depends(get_db)],
    candidate_status: Annotated[
        UrlCandidateStatus | None,
        Query(alias="status"),
    ] = None,
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
):
    return await get_url_candidates(
        db,
        status=candidate_status,
        offset=offset,
        limit=limit,
    )


async def _review_candidate(
    *,
    candidate_id: int,
    request: UrlCandidateReviewRequest,
    db: AsyncSession,
    approve: bool,
) -> UrlCandidateResponse:
    candidate = await review_url_candidate(
        db,
        candidate_id=candidate_id,
        approve=approve,
        reviewer=request.reviewer,
        note=request.note,
    )
    if candidate is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="URL candidate not found",
        )
    return UrlCandidateResponse.model_validate(candidate)


@router.post("/{candidate_id}/approve", response_model=UrlCandidateResponse)
async def approve_candidate(
    candidate_id: int,
    request: UrlCandidateReviewRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    return await _review_candidate(
        candidate_id=candidate_id,
        request=request,
        db=db,
        approve=True,
    )


@router.post("/{candidate_id}/reject", response_model=UrlCandidateResponse)
async def reject_candidate(
    candidate_id: int,
    request: UrlCandidateReviewRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    return await _review_candidate(
        candidate_id=candidate_id,
        request=request,
        db=db,
        approve=False,
    )
