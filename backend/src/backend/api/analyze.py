from fastapi import APIRouter, HTTPException

from ..schemas.predict_api import PredictRequest, PredictResponse

router = APIRouter(prefix="/api/analyze", tags=["Analyze"])


@router.post("", response_model=PredictResponse)
async def analyze(request: PredictRequest):
    """
    Frontend-compatible analyze endpoint.

    TODO:
    - OCR가 필요한 image 분석 플로우
    - URL/문자 분석 모델 호출
    - history 저장 및 cacheHit 처리
    """
    raise HTTPException(status_code=501, detail="TODO: implement /api/analyze")
