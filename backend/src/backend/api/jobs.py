from fastapi import APIRouter, HTTPException

from ..schemas.job_api import AsyncJob

router = APIRouter(prefix="/api/jobs", tags=["Jobs"])


@router.get("/{job_id}", response_model=AsyncJob)
async def get_job(job_id: str):
    """
    비동기 작업 상태 조회.

    TODO:
    - job queue/worker 상태 조회
    - job 결과 및 에러 필드 포함
    """
    raise HTTPException(status_code=501, detail="TODO: implement /api/jobs/{job_id}")
