import asyncio

from backend.src.backend.schemas.ocr_api import OcrRequest
from backend.src.backend.services import ocr_service


def test_run_ocr_uses_mock_text_when_mock_ocr_enabled(monkeypatch):
    monkeypatch.setattr(ocr_service.settings, "USE_MOCK_OCR", True)

    response = asyncio.run(
        ocr_service.run_ocr(
            OcrRequest(image="data:image/png;base64,abc")
        )
    )

    assert response.imageId.startswith("ocr_")
    assert response.text == ocr_service.MOCK_OCR_TEXT
    assert response.confidence == 1.0
    assert response.blocks == []


def test_run_ocr_calls_engine_when_mock_ocr_disabled(monkeypatch):
    async def extract_text_from_image(image: str) -> str:
        assert image == "data:image/png;base64,abc"
        return "실제 OCR 결과"

    monkeypatch.setattr(ocr_service.settings, "USE_MOCK_OCR", False)
    monkeypatch.setattr(
        ocr_service,
        "extract_text_from_image",
        extract_text_from_image,
    )

    response = asyncio.run(
        ocr_service.run_ocr(
            OcrRequest(image="data:image/png;base64,abc")
        )
    )

    assert response.text == "실제 OCR 결과"
    assert response.confidence == 1.0
    assert response.blocks == []
