"""Mock-first deployment wrapper for future Hugging Face Endpoints."""

from __future__ import annotations

import logging
import os
import re
from contextlib import asynccontextmanager
from dataclasses import dataclass
from typing import Any

import httpx
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field


MOCK_KEYWORDS = (
    "계정 정지",
    "계정",
    "정지",
    "인증",
    "링크",
    "비밀번호",
    "결제",
    "환불",
    "배송",
    "본인확인",
    "즉시",
    "차단",
    "환급",
    "상품권",
    "급하게",
    "폰 고장",
    "번호 바뀜",
    "저금리",
    "무직자대출",
    "당일입금",
    "급전",
    "카톡",
    "텔레그램",
    "whatsapp",
    "line",
)

URL_PATTERN = re.compile(
    r"(?:https?://\S+|www\.\S+|(?:[a-zA-Z0-9-]+\.)+"
    r"(?:com|net|org|kr|co\.kr|go\.kr|or\.kr|ne\.kr|io|ai|ly|me|cc|xyz|top|site|shop|info|biz)(?:/\S*)?)",
    re.IGNORECASE,
)
PHONE_PATTERN = re.compile(r"(?:\d{2,3}-\d{3,4}-\d{4}|\d{10,11})")
MONEY_PATTERN = re.compile(
    r"\d+[,\d]*\s?(?:만원권|만원|천원|억원|원|KRW|USD|\$)|"
    r"\$\s?\d+[,\d]*|\d+[,\d]*\s?\$",
    re.IGNORECASE,
)
WEB_PATTERN = re.compile(r"\[?\s*web\s*발신\s*\]?", re.IGNORECASE)
FOREIGN_PATTERN = re.compile(r"\[?\s*(?:국외|국제)\s*발신\s*\]?")
EXTERNAL_CONTACT_PATTERN = re.compile(
    r"(?:카톡|카카오|텔레그램|telegram|whatsapp|라인|line|위챗|wechat|"
    r"인스타|instagram|페이스북|facebook)"
    r"\s*(?:ID|id|아이디)?\s*[:：]\s*\S+",
    re.IGNORECASE,
)

LABEL_ALIASES = {
    "LABEL_0": "normal",
    "LABEL_1": "phishing",
    "NORMAL": "normal",
    "PHISHING": "phishing",
    "SMISHING": "phishing",
    "정상": "normal",
    "스미싱": "phishing",
    "0": "normal",
    "1": "phishing",
}


logger = logging.getLogger("deploy_wrapper")


@dataclass(frozen=True)
class MockFeatures:
    urls: list[str]
    phones: list[str]
    money: list[str]
    keywords: list[str]
    from_web: bool
    from_foreign: bool
    has_external_contact: bool


class InferenceError(Exception):
    error_code = "INFERENCE_FAILED"
    status_code = 500
    public_message = "Deploy wrapper inference failed"


class ConfigurationError(InferenceError):
    error_code = "CONFIGURATION_ERROR"
    status_code = 500
    public_message = "Deploy wrapper configuration is invalid"


class UpstreamInferenceError(InferenceError):
    error_code = "UPSTREAM_INFERENCE_FAILED"
    status_code = 502
    public_message = "HF endpoint request failed"


class ResponseNormalizationError(InferenceError):
    error_code = "INFERENCE_RESPONSE_INVALID"
    status_code = 502
    public_message = "HF endpoint response could not be normalized"


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
    model_config = ConfigDict(extra="forbid")

    text: str = Field(min_length=1)


class AnalyzeResponse(BaseModel):
    success: bool
    label: str
    confidence: float
    reason: str
    features: list[str]
    risk_level: str
    score: int
    encoder_model_id: str
    encoder_model_version: str
    decoder_model_id: str
    decoder_model_version: str
    serving_mode: str


class ErrorResponse(BaseModel):
    success: bool = False
    error_code: str
    message: str


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with httpx.AsyncClient() as client:
        app.state.http_client = client
        yield


app = FastAPI(title="Deploy Wrapper API", version="0.1.0", lifespan=lifespan)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
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


def extract_mock_features(text: str) -> MockFeatures:
    keywords = [
        keyword
        for keyword in MOCK_KEYWORDS
        if keyword.lower() in text.lower()
    ]

    return MockFeatures(
        urls=URL_PATTERN.findall(text),
        phones=PHONE_PATTERN.findall(text),
        money=MONEY_PATTERN.findall(text),
        keywords=list(dict.fromkeys(keywords)),
        from_web=WEB_PATTERN.search(text) is not None,
        from_foreign=FOREIGN_PATTERN.search(text) is not None,
        has_external_contact=EXTERNAL_CONTACT_PATTERN.search(text) is not None,
    )


def score_mock_features(features: MockFeatures) -> float:
    score = 0.08

    if features.urls:
        score += 0.24
    if features.phones:
        score += 0.12
    if features.money:
        score += 0.18
    if features.from_web:
        score += 0.04
    if features.from_foreign:
        score += 0.12
    if features.has_external_contact:
        score += 0.25

    score += min(len(features.keywords) * 0.08, 0.32)
    if len(features.keywords) >= 2:
        score += 0.18
    if len(features.keywords) >= 3:
        score += 0.10

    if features.urls and features.keywords:
        score += 0.12
    if features.money and features.phones:
        score += 0.10
    if features.has_external_contact and features.keywords:
        score += 0.10

    return min(score, 0.96)


def build_mock_evidence(features: MockFeatures) -> list[str]:
    evidence = []
    if features.urls:
        evidence.append(f"외부 링크 포함: {features.urls[0]}")
    if features.phones:
        evidence.append(f"전화번호 포함: {features.phones[0]}")
    if features.money:
        evidence.append(f"금전 관련 표현 포함: {features.money[0]}")
    if features.from_web:
        evidence.append("Web 발신 표현 포함")
    if features.from_foreign:
        evidence.append("해외 발신 표현 포함")
    if features.has_external_contact:
        evidence.append("외부 메신저 연락처 유도")
    if features.keywords:
        evidence.append(f"위험 키워드 감지: {', '.join(features.keywords[:4])}")
    return evidence


def build_mock_reason(label: str, features: MockFeatures) -> str:
    if label == "normal":
        return (
            "피싱으로 의심되는 강한 표현이나 링크 클릭 유도 "
            "패턴이 뚜렷하지 않습니다."
        )

    evidence = build_mock_evidence(features)
    if evidence:
        return (
            f"{', '.join(evidence[:3])} 같은 피싱 의심 요소가 포함되어 "
            "위험도가 높게 분류되었습니다."
        )

    return (
        "계정 정지, 인증 요구, 링크 클릭 유도와 같은 "
        "피싱 의심 표현으로 위험도가 높게 분류되었습니다."
    )


def build_risk_level(score: int) -> str:
    if score >= 70:
        return "위험 높음"
    if score >= 40:
        return "주의"
    return "정상 가능성 높음"


def build_risk_score(label: str, confidence: float, raw_score: Any = None) -> int:
    if raw_score is not None:
        try:
            parsed_score = float(raw_score)
        except (TypeError, ValueError):
            parsed_score = None
        if parsed_score is not None and parsed_score > 1:
            return max(0, min(int(round(parsed_score)), 100))

    risk_probability = confidence if label == "phishing" else 1 - confidence
    return max(0, min(int(round(risk_probability * 100)), 100))


async def mock_analyze(text: str, settings: Settings) -> AnalyzeResponse:
    features = extract_mock_features(text)
    mock_score = score_mock_features(features)
    score = int(round(mock_score * 100))
    is_phishing = mock_score >= 0.4

    if is_phishing:
        confidence = round(max(mock_score, 0.91), 2)
        score = int(round(confidence * 100))
        payload: dict[str, Any] = {
            "success": True,
            "label": "phishing",
            "confidence": confidence,
            "reason": build_mock_reason("phishing", features),
            "features": build_mock_evidence(features),
            "risk_level": build_risk_level(score),
            "score": score,
        }
    else:
        payload = {
            "success": True,
            "label": "normal",
            "confidence": round(max(1 - mock_score, 0.72), 2),
            "reason": build_mock_reason("normal", features),
            "features": build_mock_evidence(features),
            "risk_level": build_risk_level(score),
            "score": score,
        }

    payload.update(base_response(settings))
    return AnalyzeResponse(**payload)


async def post_hf_endpoint(
    client: httpx.AsyncClient,
    url: str,
    token: str,
    payload: dict[str, Any],
    timeout: int,
) -> Any:
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    try:
        response = await client.post(
            url,
            headers=headers,
            json=payload,
            timeout=timeout,
        )
        response.raise_for_status()
        return response.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise UpstreamInferenceError("HF endpoint request failed") from exc


def normalize_feature_lines(raw_features: Any) -> list[str]:
    if raw_features is None:
        return []
    if isinstance(raw_features, list):
        return [
            str(item).strip().lstrip("- ").strip()
            for item in raw_features
            if str(item).strip()
        ]
    if isinstance(raw_features, str):
        if raw_features.strip() == "- 특이 사항 없음":
            return []
        return [
            line.strip().lstrip("- ").strip()
            for line in raw_features.splitlines()
            if line.strip()
        ]
    return [str(raw_features)]


def normalize_encoder_response(
    response_payload: Any,
) -> tuple[str, float, int, str, list[str]]:
    if isinstance(response_payload, list) and response_payload:
        first_item = response_payload[0]
        if isinstance(first_item, list) and first_item:
            best = max(first_item, key=lambda item: item.get("score", 0.0))
            confidence = float(best.get("score", 0.0))
            label = normalize_label(str(best.get("label", "unknown")))
            score = build_risk_score(label, confidence)
            return (
                label,
                confidence,
                score,
                build_risk_level(score),
                [],
            )
        if isinstance(first_item, dict):
            confidence = float(
                first_item.get("score", first_item.get("confidence", 0.0))
            )
            label = normalize_label(str(first_item.get("label", "unknown")))
            score = build_risk_score(label, confidence, first_item.get("risk_score"))
            return (
                label,
                confidence,
                score,
                build_risk_level(score),
                normalize_feature_lines(first_item.get("features")),
            )

    if isinstance(response_payload, dict):
        label = (
            response_payload.get("label")
            or response_payload.get("predicted_label")
            or response_payload.get("label_name")
            or response_payload.get("pred")
        )
        if label is not None:
            normalized_label = normalize_label(str(label))
            confidence = response_payload.get("confidence")
            if confidence is None and normalized_label == "normal":
                confidence = response_payload.get("prob_0_normal")
            if confidence is None:
                confidence = response_payload.get("prob_1_risk")
            if confidence is None:
                confidence = response_payload.get("score")
            if confidence is None:
                raise ResponseNormalizationError(
                    "Encoder endpoint response is missing confidence"
                )

            normalized_confidence = float(confidence)
            if normalized_confidence > 1:
                normalized_confidence = normalized_confidence / 100
            score = build_risk_score(
                normalized_label,
                normalized_confidence,
                response_payload.get("score"),
            )
            return (
                normalized_label,
                normalized_confidence,
                score,
                str(response_payload.get("risk_level") or build_risk_level(score)),
                normalize_feature_lines(response_payload.get("features")),
            )

    raise ResponseNormalizationError("Unsupported encoder endpoint response")


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


async def hf_endpoint_analyze(
    text: str,
    settings: Settings,
    client: httpx.AsyncClient,
) -> AnalyzeResponse:
    if not settings.encoder_endpoint_url or not settings.decoder_endpoint_url:
        raise ConfigurationError("HF endpoint URLs are not configured")

    encoder_payload = await post_hf_endpoint(
        client,
        settings.encoder_endpoint_url,
        settings.hf_token,
        {"inputs": text},
        settings.request_timeout_seconds,
    )
    label, confidence, score, risk_level, features = normalize_encoder_response(
        encoder_payload
    )

    decoder_payload = await post_hf_endpoint(
        client,
        settings.decoder_endpoint_url,
        settings.hf_token,
        {
            "inputs": {
                "text": text,
                "label": label,
                "confidence": confidence,
                "features": features,
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
        "features": features,
        "risk_level": risk_level,
        "score": score,
    }
    payload.update(base_response(settings))
    return AnalyzeResponse(**payload)


@app.get("/health")
async def health() -> dict[str, str]:
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
        502: {"model": ErrorResponse},
    },
)
async def analyze(payload: AnalyzeRequest) -> AnalyzeResponse | JSONResponse:
    settings = load_settings()

    try:
        match settings.serving_mode:
            case "mock":
                return await mock_analyze(payload.text, settings)
            case "hf_endpoint":
                return await hf_endpoint_analyze(
                    payload.text,
                    settings,
                    app.state.http_client,
                )
    except InferenceError as exc:
        logger.warning("%s: %s", exc.error_code, exc, exc_info=True)
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "error_code": exc.error_code,
                "message": exc.public_message,
            },
        )
    except Exception:
        logger.exception("Unexpected deploy wrapper inference failure")
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
