from datetime import datetime, timezone

from fastapi import APIRouter
from pydantic import BaseModel

from ..services.predict_service import extract_ocr_text

router = APIRouter(prefix="/api/ocr")


class OcrRequest(BaseModel):
    image: str


class OcrBlock(BaseModel):
    text: str
    bbox: list[float]


class OcrResponse(BaseModel):
    imageId: str
    text: str
    confidence: float
    blocks: list[OcrBlock]


@router.post("", response_model=OcrResponse)
async def extract_ocr(request: OcrRequest):
    text = await extract_ocr_text(request.image)
    image_id = f"img_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S%f')}"
    return OcrResponse(
        imageId=image_id,
        text=text,
        confidence=1.0 if text.strip() else 0.0,
        blocks=[],
    )
