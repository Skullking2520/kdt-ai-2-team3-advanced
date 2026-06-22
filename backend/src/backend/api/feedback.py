from fastapi import APIRouter, HTTPException

from ..schemas.feedback_api import FeedbackRequest, FeedbackResponse

router = APIRouter(prefix="/api/feedback", tags=["Feedback"])


@router.post("", response_model=FeedbackResponse)
async def submit_feedback(request: FeedbackRequest):
    """
    사용자 피드백 수집.

    TODO:
    - 분석 결과 보정 저장
    - 사용자 의견 기록
    """
    raise HTTPException(status_code=501, detail="TODO: implement /api/feedback")
