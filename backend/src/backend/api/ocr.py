from fastapi import APIRouter, HTTPException

from ..schemas.ocr_api import OcrRequest, OcrResponse

router = APIRouter(prefix="/api/ocr", tags=["OCR"])


@router.post("", response_model=OcrResponse)
async def ocr(request: OcrRequest):
    """
    이미지 OCR 요청.

    TODO:
    - PaddleOCR 또는 외부 OCR 서비스 연동
    - imageId 발급 및 결과 캐싱
    """
    raise HTTPException(status_code=501, detail="TODO: implement /api/ocr")
