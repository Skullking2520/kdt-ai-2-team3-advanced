from fastapi import APIRouter, HTTPException

from ..schemas.ocr_api import OcrRequest, OcrResponse
from ..services.ocr_service import run_ocr

router = APIRouter(prefix="/api/ocr", tags=["OCR"])

@router.post("", response_model=OcrResponse)
async def ocr(request: OcrRequest):
    """
    이미지 OCR 요청.

    TODO:
    - backend.ocr.ocr_service 연동 후 imageId, text, confidence, blocks 반환
    - imageId 발급 및 결과 캐싱
    - FE는 이 응답의 imageId를 /api/predict image 요청에 전달할 수 있음
    """
    try:
        return await run_ocr(request)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
