from fastapi import APIRouter, HTTPException

from ..schemas.share_api import ShareRequest, ShareResponse

router = APIRouter(prefix="/api/share", tags=["Share"])


@router.post("", response_model=ShareResponse)
async def share(request: ShareRequest):
    """
    분석 결과 공유를 위한 단축 URL 생성.

    TODO:
    - 공유 링크 생성
    - 공유 기록 저장
    """
    raise HTTPException(status_code=501, detail="TODO: implement /api/share")
