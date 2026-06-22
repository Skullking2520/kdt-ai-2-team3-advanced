from unittest.mock import AsyncMock
import importlib

from backend.src.backend.schemas.ocr_api import OcrResponse
from backend.src.backend.schemas.report_api import ReportResponse


def test_ocr_api_returns_service_response(client, monkeypatch):
    ocr_api = importlib.import_module("backend.src.backend.api.ocr")

    run_ocr = AsyncMock(
        return_value=OcrResponse(
            imageId="ocr_test",
            text="문자 인식 결과",
            confidence=1.0,
            blocks=[],
        )
    )
    monkeypatch.setattr(ocr_api, "run_ocr", run_ocr)

    response = client.post("/api/ocr", json={"image": "data:image/png;base64,abc"})

    assert response.status_code == 200
    assert response.json() == {
        "imageId": "ocr_test",
        "text": "문자 인식 결과",
        "confidence": 1.0,
        "blocks": [],
    }
    run_ocr.assert_awaited_once()


def test_sender_api_returns_lookup_result(client, monkeypatch):
    sender_api = importlib.import_module("backend.src.backend.api.sender")

    lookup_sender_number = AsyncMock(
        return_value={
            "number": "01012345678",
            "trustScore": 0,
            "status": "danger",
            "reportCount": 2,
            "lastReportedAt": "2026-06-22T10:00:00",
            "categories": ["사용자 신고 유형: sms"],
            "history": [],
        }
    )
    monkeypatch.setattr(
        sender_api,
        "lookup_sender_number",
        lookup_sender_number,
    )

    response = client.get("/api/sender/01012345678")

    assert response.status_code == 200
    assert response.json()["status"] == "danger"
    assert response.json()["reportCount"] == 2
    lookup_sender_number.assert_awaited_once()


def test_report_api_returns_receipt(client, monkeypatch):
    report_api = importlib.import_module("backend.src.backend.api.report")

    save_report_static_patterns = AsyncMock(
        return_value=ReportResponse(
            receiptId="NB20260622-120000",
            status="received",
            createdAt="2026-06-22T12:00:00+00:00",
        )
    )
    monkeypatch.setattr(
        report_api,
        "save_report_static_patterns",
        save_report_static_patterns,
    )

    response = client.post(
        "/api/reports",
        json={
            "type": "sms",
            "content": "배송 주소 확인 http://bad.example",
            "category": "택배 사칭",
            "sender": "01012345678",
            "url": "http://bad.example",
            "notes": "사용자 신고",
            "agreeShare": True,
        },
    )

    assert response.status_code == 200
    assert response.json()["receiptId"] == "NB20260622-120000"
    save_report_static_patterns.assert_awaited_once()


def test_predict_api_delegates_to_predict_service(client, monkeypatch):
    predict_api = importlib.import_module("backend.src.backend.api.predict")

    predict_smishing = AsyncMock(
        return_value={
            "id": "1",
            "type": "sms",
            "content": "테스트 문자",
            "riskLevel": "low",
            "riskScore": 10,
            "smishingType": "정상 문자",
            "reasons": [],
            "actionGuide": [],
            "similarCases": [],
            "modelVersion": "test",
            "processingTime": 1,
            "cacheHit": False,
            "createdAt": "2026-06-22T12:00:00+00:00",
        }
    )
    monkeypatch.setattr(predict_api, "predict_smishing", predict_smishing)

    response = client.post(
        "/api/predict",
        json={
            "type": "sms",
            "content": "테스트 문자",
            "imageId": "ocr_test",
            "allowTrainingUse": False,
        },
    )

    assert response.status_code == 200
    assert response.json()["id"] == "1"
    predict_smishing.assert_awaited_once()
