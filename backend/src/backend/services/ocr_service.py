from __future__ import annotations

import hashlib

from ..core.pydantic_settings import settings
from ..ocr.ocr_service import extract_text_from_image
from ..schemas.ocr_api import OcrRequest, OcrResponse


MOCK_OCR_TEXT = "[국외발신] 귀하의 계좌가 정지되었습니다. 확인 → http://fake-ocr-test.com"


def _build_image_id(image: str) -> str:
    digest = hashlib.sha256(image.encode("utf-8")).hexdigest()[:16]
    return f"ocr_{digest}"


async def run_ocr(request: OcrRequest) -> OcrResponse:
    if settings.USE_MOCK_OCR:
        text = MOCK_OCR_TEXT
        confidence = 1.0
    else:
        text = await extract_text_from_image(request.image)
        confidence = 1.0 if text.strip() else 0.0

    return OcrResponse(
        imageId=_build_image_id(request.image),
        text=text,
        confidence=confidence,
        blocks=[],
    )
