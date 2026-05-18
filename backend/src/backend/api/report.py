from fastapi import APIRouter

from ..schemas.report_api import ReportRequest, ReportResponse

router = APIRouter(prefix="/report")


@router.post("", response_model=ReportResponse)
async def report_smishing(request: ReportRequest):
    """
    프론트엔드의 "신고"를 받아 db에 저장한다.
    """

    print(request)

    return {"success": True}
