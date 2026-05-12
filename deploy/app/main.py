"""Mock-first deployment wrapper for future Hugging Face Endpoints."""

from __future__ import annotations

import os
from typing import Any

import requests
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field


MOCK_KEYWORDS = (
    "계정 정지",
    "인증",
    "링크",
    "비밀번호",
    "결제",
    "환불",
    "배송",
    "본인확인",
    "즉시",
    "차단",
)

LABEL_ALIASES = {
    "LABEL_0": "normal",
    "LABEL_1": "phishing",
    "NORMAL": "normal",
    "PHISHING": "phishing",
    "SMISHING": "phishing",
    "0": "normal",
    "1": "phishing",
}


class Settings(BaseModel):
    serving_mode: str = Field(default="mock")
    hf_token: str = Field(default="")
    encoder_endpoint_url: str = Field(default="")
    decoder_endpoint_url: str = Field(default="")
    encoder_model_id: str = Field(default="team/kcelectra-smishing-classifier")
    encoder_model_version: str = Field(default="v1.0.0")
    decoder_model_id: str = Field(default="team/decoder-explainer")
    decoder_model_version: str = Field(default="v1.0.0")
    request_timeout_seconds: int = Field(default=60)


class AnalyzeRequest(BaseModel):
    text: str = Field(min_length=1)


class AnalyzeResponse(BaseModel):
    success: bool
    label: str
    confidence: float
    reason: str
    encoder_model_id: str
    encoder_model_version: str
    decoder_model_id: str
    decoder_model_version: str
    serving_mode: str


class ErrorResponse(BaseModel):
    success: bool = False
    error_code: str
    message: str


app = FastAPI(title="Deploy Wrapper API", version="0.1.0")


@app.exception_handler(RequestValidationError)
def validation_exception_handler(
    _request: Request,
    _exc: RequestValidationError,
) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "error_code": "INVALID_REQUEST",
            "message": "Request body is invalid",
        },
    )


def load_settings() -> Settings:
    timeout_seconds = parse_positive_int(
        os.getenv("REQUEST_TIMEOUT_SECONDS"), default=60
    )

    return Settings(
        serving_mode=os.getenv("AI_SERVICE_MODE", "mock"),
        hf_token=os.getenv("HF_TOKEN", ""),
        encoder_endpoint_url=os.getenv("ENCODER_ENDPOINT_URL", ""),
        decoder_endpoint_url=os.getenv("DECODER_ENDPOINT_URL", ""),
        encoder_model_id=os.getenv(
            "ENCODER_MODEL_ID", "team/kcelectra-smishing-classifier"
        ),
        encoder_model_version=os.getenv("ENCODER_MODEL_VERSION", "v1.0.0"),
        decoder_model_id=os.getenv("DECODER_MODEL_ID", "team/decoder-explainer"),
        decoder_model_version=os.getenv("DECODER_MODEL_VERSION", "v1.0.0"),
        request_timeout_seconds=timeout_seconds,
    )


def parse_positive_int(value: str | None, default: int) -> int:
    if value is None or value.strip() == "":
        return default
    try:
        parsed = int(value)
    except ValueError:
        return default
    return parsed if parsed > 0 else default


def normalize_label(raw_label: str) -> str:
    label = raw_label.strip()
    return LABEL_ALIASES.get(label.upper(), label.lower())


def base_response(settings: Settings) -> dict[str, str]:
    return {
        "encoder_model_id": settings.encoder_model_id,
        "encoder_model_version": settings.encoder_model_version,
        "decoder_model_id": settings.decoder_model_id,
        "decoder_model_version": settings.decoder_model_version,
        "serving_mode": settings.serving_mode,
    }


def mock_analyze(text: str, settings: Settings) -> AnalyzeResponse:
    is_phishing = any(keyword in text for keyword in MOCK_KEYWORDS)
    if is_phishing:
        payload: dict[str, Any] = {
            "success": True,
            "label": "phishing",
            "confidence": 0.91,
            "reason": (
                "계정 정지, 인증 요구, 링크 클릭 유도와 같은 "
                "피싱 의심 표현으로 위험도가 높게 분류되었습니다."
            ),
        }
    else:
        payload = {
            "success": True,
            "label": "normal",
            "confidence": 0.82,
            "reason": (
                "피싱으로 의심되는 강한 표현이나 링크 클릭 유도 "
                "패턴이 뚜렷하지 않습니다."
            ),
        }

    payload.update(base_response(settings))
    return AnalyzeResponse(**payload)


def post_hf_endpoint(
    url: str,
    token: str,
    payload: dict[str, Any],
    timeout: int,
) -> Any:
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    try:
        response = requests.post(
            url,
            headers=headers,
            json=payload,
            timeout=timeout,
        )
        response.raise_for_status()
        return response.json()
    except (requests.RequestException, ValueError) as exc:
        raise RuntimeError("Hugging Face endpoint request failed") from exc


def normalize_encoder_response(response_payload: Any) -> tuple[str, float]:
    if isinstance(response_payload, list) and response_payload:
        first_item = response_payload[0]
        if isinstance(first_item, list) and first_item:
            best = max(first_item, key=lambda item: item.get("score", 0.0))
            return normalize_label(str(best.get("label", "unknown"))), float(
                best.get("score", 0.0)
            )
        if isinstance(first_item, dict):
            return normalize_label(str(first_item.get("label", "unknown"))), float(
                first_item.get("score", first_item.get("confidence", 0.0))
            )

    if isinstance(response_payload, dict):
        label = response_payload.get("label", response_payload.get("predicted_label"))
        confidence = response_payload.get("confidence", response_payload.get("score"))
        if label is not None and confidence is not None:
            return normalize_label(str(label)), float(confidence)

    raise RuntimeError("Unsupported encoder endpoint response")


def normalize_decoder_response(response_payload: Any) -> str:
    if isinstance(response_payload, list) and response_payload:
        first_item = response_payload[0]
        if isinstance(first_item, dict):
            return str(
                first_item.get("generated_text")
                or first_item.get("summary_text")
                or first_item.get("reason")
                or "판단 근거를 생성하지 못했습니다."
            )

    if isinstance(response_payload, dict):
        return str(
            response_payload.get("generated_text")
            or response_payload.get("reason")
            or response_payload.get("text")
            or "판단 근거를 생성하지 못했습니다."
        )

    return "판단 근거를 생성하지 못했습니다."


def hf_endpoint_analyze(text: str, settings: Settings) -> AnalyzeResponse:
    if not settings.encoder_endpoint_url or not settings.decoder_endpoint_url:
        raise RuntimeError("HF endpoint URLs are not configured")

    encoder_payload = post_hf_endpoint(
        settings.encoder_endpoint_url,
        settings.hf_token,
        {"inputs": text},
        settings.request_timeout_seconds,
    )
    label, confidence = normalize_encoder_response(encoder_payload)

    decoder_payload = post_hf_endpoint(
        settings.decoder_endpoint_url,
        settings.hf_token,
        {
            "inputs": {
                "text": text,
                "label": label,
                "confidence": confidence,
            }
        },
        settings.request_timeout_seconds,
    )
    reason = normalize_decoder_response(decoder_payload)

    payload: dict[str, Any] = {
        "success": True,
        "label": label,
        "confidence": confidence,
        "reason": reason,
    }
    payload.update(base_response(settings))
    return AnalyzeResponse(**payload)


@app.get("/health")
def health() -> dict[str, str]:
    settings = load_settings()
    return {
        "status": "ok",
        "service": "deploy_wrapper",
        "serving_mode": settings.serving_mode,
    }


@app.post(
    "/analyze",
    response_model=AnalyzeResponse,
    responses={
        400: {"model": ErrorResponse},
        422: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
    },
)
def analyze(payload: AnalyzeRequest) -> AnalyzeResponse | JSONResponse:
    settings = load_settings()

    try:
        if settings.serving_mode == "mock":
            return mock_analyze(payload.text, settings)
        if settings.serving_mode == "hf_endpoint":
            return hf_endpoint_analyze(payload.text, settings)
    except RuntimeError:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error_code": "INFERENCE_FAILED",
                "message": "Deploy wrapper inference failed",
            },
        )

    return JSONResponse(
        status_code=400,
        content={
            "success": False,
            "error_code": "INVALID_SERVING_MODE",
            "message": "AI_SERVICE_MODE must be mock or hf_endpoint",
        },
    )
