"""Mock-first deployment wrapper for Hugging Face inference APIs."""

from __future__ import annotations

import asyncio
import logging
import os
import re
import uuid
from contextlib import asynccontextmanager
from dataclasses import dataclass
from typing import Annotated, Any
from urllib.parse import quote

import httpx
from fastapi import FastAPI, Header, Request
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
    r"(?:com|net|org|kr|co\.kr|go\.kr|or\.kr|ne\.kr|io|ai|ly|me|"
    r"cc|xyz|top|site|shop|info|biz)(?:/\S*)?)",
    re.IGNORECASE,
)
PHONE_PATTERN = re.compile(r"(?:\d{2,3}-\d{3,4}-\d{4}|\d{10,11})")
PHONE_MASK_PATTERN = re.compile(
    r"(?<!\w)"
    r"(?:\+?\d{1,3}[- ]?)?"
    r"(?:\d{2,4}[- ]\d{3,4}[- ]\d{4}|\d{8,})"
    r"(?!\w)"
)
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
THINK_PATTERN = re.compile(r"<think>.*?</think>", re.DOTALL)

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
    hf_serving_type: str = Field(default="serverless")
    hf_token: str = Field(default="")
    hf_serverless_base_url: str = Field(
        default="https://router.huggingface.co/hf-inference/models"
    )
    encoder_preprocess_enabled: bool = Field(default=True)
    encoder_request_format: str = Field(default="hf_inputs")
    decoder_api_type: str = Field(default="text_generation")
    decoder_provider: str = Field(default="featherless-ai")
    decoder_required: bool = Field(default=True)
    encoder_endpoint_url: str = Field(default="")
    decoder_endpoint_url: str = Field(default="")
    encoder_model_id: str = Field(
        default="kdt-2-team4-newbiz/kcelectra-smishing-classifier"
    )
    encoder_model_version: str = Field(default="v1.0.0")
    decoder_model_id: str = Field(default="Qwen/Qwen3-1.7B")
    decoder_model_version: str = Field(default="v1.0.0")
    request_timeout_seconds: int = Field(default=60)
    hf_max_retries: int = Field(default=2)
    hf_retry_backoff_seconds: float = Field(default=0.5)
    decoder_max_new_tokens: int = Field(default=120)
    decoder_temperature: float = Field(default=0.3)
    decoder_on_normal: bool = Field(default=False)


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
        hf_serving_type=os.getenv("HF_SERVING_TYPE", "serverless"),
        hf_token=os.getenv("HF_TOKEN", ""),
        hf_serverless_base_url=os.getenv(
            "HF_SERVERLESS_BASE_URL",
            "https://router.huggingface.co/hf-inference/models",
        ),
        encoder_preprocess_enabled=parse_bool(
            os.getenv("ENCODER_PREPROCESS_ENABLED"), default=True
        ),
        encoder_request_format=os.getenv("ENCODER_REQUEST_FORMAT", "hf_inputs"),
        decoder_api_type=os.getenv("DECODER_API_TYPE", "text_generation"),
        decoder_provider=os.getenv(
            "DECODER_PROVIDER", os.getenv("EXPLAINER_PROVIDER", "featherless-ai")
        ),
        decoder_required=parse_bool(os.getenv("DECODER_REQUIRED"), default=True),
        encoder_endpoint_url=os.getenv("ENCODER_ENDPOINT_URL", ""),
        decoder_endpoint_url=os.getenv("DECODER_ENDPOINT_URL", ""),
        encoder_model_id=os.getenv(
            "ENCODER_MODEL_ID", "kdt-2-team4-newbiz/kcelectra-smishing-classifier"
        ),
        encoder_model_version=os.getenv("ENCODER_MODEL_VERSION", "v1.0.0"),
        decoder_model_id=os.getenv(
            "DECODER_MODEL_ID",
            os.getenv("EXPLAINER_MODEL", "Qwen/Qwen3-1.7B"),
        ),
        decoder_model_version=os.getenv("DECODER_MODEL_VERSION", "v1.0.0"),
        request_timeout_seconds=timeout_seconds,
        hf_max_retries=parse_non_negative_int(
            os.getenv("HF_MAX_RETRIES"), default=2
        ),
        hf_retry_backoff_seconds=parse_non_negative_float(
            os.getenv("HF_RETRY_BACKOFF_SECONDS"), default=0.5
        ),
        decoder_max_new_tokens=parse_positive_int(
            os.getenv("DECODER_MAX_NEW_TOKENS"), default=120
        ),
        decoder_temperature=parse_non_negative_float(
            os.getenv("DECODER_TEMPERATURE"), default=0.3
        ),
        decoder_on_normal=parse_bool(os.getenv("DECODER_ON_NORMAL"), default=False),
    )


def parse_positive_int(value: str | None, default: int) -> int:
    if value is None or value.strip() == "":
        return default
    try:
        parsed = int(value)
    except ValueError:
        return default
    return parsed if parsed > 0 else default


def parse_non_negative_int(value: str | None, default: int) -> int:
    if value is None or value.strip() == "":
        return default
    try:
        parsed = int(value)
    except ValueError:
        return default
    return parsed if parsed >= 0 else default


def parse_positive_float(value: str | None, default: float) -> float:
    if value is None or value.strip() == "":
        return default
    try:
        parsed = float(value)
    except ValueError:
        return default
    return parsed if parsed > 0 else default


def parse_non_negative_float(value: str | None, default: float) -> float:
    if value is None or value.strip() == "":
        return default
    try:
        parsed = float(value)
    except ValueError:
        return default
    return parsed if parsed >= 0 else default


def parse_bool(value: str | None, default: bool) -> bool:
    if value is None or value.strip() == "":
        return default
    return value.strip().lower() in {"1", "true", "yes", "y", "on"}


def build_request_id(incoming_request_id: str | None) -> str:
    if incoming_request_id and incoming_request_id.strip():
        return incoming_request_id.strip()
    return str(uuid.uuid4())


def normalize_label(raw_label: str) -> str:
    label = raw_label.strip()
    return LABEL_ALIASES.get(label.upper(), label.lower())


def first_present(payload: dict[str, Any], *keys: str) -> Any:
    for key in keys:
        if key in payload and payload[key] is not None:
            return payload[key]
    return None


def parse_normalized_float(value: Any, field_name: str) -> float:
    try:
        parsed = float(value)
    except (TypeError, ValueError) as exc:
        raise ResponseNormalizationError(
            f"Encoder endpoint response has invalid {field_name}"
        ) from exc

    if parsed > 1:
        parsed = parsed / 100
    if parsed < 0 or parsed > 1:
        raise ResponseNormalizationError(
            f"Encoder endpoint response has invalid {field_name}"
        )
    return parsed


def digit_count(value: str) -> int:
    return len(re.sub(r"\D", "", value))


def normalize_spaces(text: str) -> str:
    text = re.sub(r"[\n\r\t]+", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def clean_text_for_encoder(text: str) -> str:
    cleaned = normalize_spaces(str(text))
    cleaned = WEB_PATTERN.sub(" ", cleaned)
    cleaned = FOREIGN_PATTERN.sub(" <FOREIGN_SEND> ", cleaned)
    cleaned = URL_PATTERN.sub(" <URL> ", cleaned)
    cleaned = MONEY_PATTERN.sub(" <MONEY> ", cleaned)

    def mask_phone(match: re.Match[str]) -> str:
        value = match.group(0)
        if digit_count(value) >= 8:
            return " <PHONE> "
        return value

    cleaned = PHONE_MASK_PATTERN.sub(mask_phone, cleaned)
    cleaned = re.sub(r"([!?~])\1{2,}", r"\1\1", cleaned)
    cleaned = re.sub(r"(★)\1+", r"\1", cleaned)
    cleaned = re.sub(r"(☆)\1+", r"\1", cleaned)
    cleaned = re.sub(r"[^\w\s가-힣<>\[\]\(\)\.\,\!\?\:\-\/~★☆]", " ", cleaned)
    return normalize_spaces(cleaned)


def base_response(settings: Settings) -> dict[str, str]:
    return {
        "encoder_model_id": settings.encoder_model_id,
        "encoder_model_version": settings.encoder_model_version,
        "decoder_model_id": settings.decoder_model_id,
        "decoder_model_version": settings.decoder_model_version,
        "serving_mode": settings.serving_mode,
    }


def collect_settings_errors(settings: Settings) -> list[str]:
    errors = []

    if settings.serving_mode not in {"mock", "hf_endpoint"}:
        errors.append("AI_SERVICE_MODE must be mock or hf_endpoint")

    if settings.serving_mode != "hf_endpoint":
        return errors

    if settings.encoder_request_format not in {"hf_inputs", "text_json"}:
        errors.append("ENCODER_REQUEST_FORMAT must be hf_inputs or text_json")

    if settings.decoder_api_type not in {"text_generation", "chat_completion"}:
        errors.append("DECODER_API_TYPE must be text_generation or chat_completion")

    if settings.hf_serving_type not in {"serverless", "endpoint"}:
        errors.append("HF_SERVING_TYPE must be serverless or endpoint")

    if settings.hf_serving_type == "serverless":
        if not settings.hf_token:
            errors.append("HF_TOKEN is required")
        if not settings.encoder_model_id:
            errors.append("ENCODER_MODEL_ID is required")
        if settings.decoder_required and not settings.decoder_model_id:
            errors.append("DECODER_MODEL_ID is required")

    if settings.hf_serving_type == "endpoint":
        if not settings.hf_token:
            errors.append("HF_TOKEN is required")
        if not settings.encoder_endpoint_url:
            errors.append("ENCODER_ENDPOINT_URL is required")
        if (
            settings.decoder_required
            and
            settings.decoder_api_type == "text_generation"
            and not settings.decoder_endpoint_url
        ):
            errors.append("DECODER_ENDPOINT_URL is required")
        if (
            settings.decoder_required
            and settings.decoder_api_type == "chat_completion"
        ):
            if not settings.decoder_model_id:
                errors.append("DECODER_MODEL_ID is required")

    return errors


def validate_runtime_settings(settings: Settings) -> None:
    errors = collect_settings_errors(settings)
    if errors:
        raise ConfigurationError("; ".join(errors))


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
    max_retries: int,
    retry_backoff_seconds: float,
    request_id: str,
) -> Any:
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    headers["X-Request-ID"] = request_id

    attempts = max_retries + 1
    last_error: Exception | None = None

    for attempt in range(1, attempts + 1):
        try:
            response = await client.post(
                url,
                headers=headers,
                json=payload,
                timeout=timeout,
            )
            response.raise_for_status()
            return response.json()
        except ValueError as exc:
            raise UpstreamInferenceError("HF response JSON decode failed") from exc
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code < 500 or attempt == attempts:
                raise UpstreamInferenceError("HF endpoint request failed") from exc
            last_error = exc
        except httpx.HTTPError as exc:
            if attempt == attempts:
                raise UpstreamInferenceError("HF endpoint request failed") from exc
            last_error = exc

        logger.warning(
            "HF request retry %s/%s request_id=%s",
            attempt,
            attempts,
            request_id,
        )
        await asyncio.sleep(retry_backoff_seconds * attempt)

    raise UpstreamInferenceError("HF endpoint request failed") from last_error


def build_serverless_model_url(settings: Settings, model_id: str) -> str:
    model_path = quote(model_id.strip(), safe="/")
    return f"{settings.hf_serverless_base_url.rstrip('/')}/{model_path}"


def resolve_hf_urls(settings: Settings) -> tuple[str, str]:
    match settings.hf_serving_type:
        case "serverless":
            if not settings.hf_token:
                raise ConfigurationError("HF_TOKEN is required for serverless mode")
            if not settings.encoder_model_id:
                raise ConfigurationError("ENCODER_MODEL_ID is not configured")
            decoder_url = (
                ""
                if settings.decoder_api_type == "chat_completion"
                else build_serverless_model_url(settings, settings.decoder_model_id)
            )
            return (
                build_serverless_model_url(settings, settings.encoder_model_id),
                decoder_url,
            )
        case "endpoint":
            if not settings.encoder_endpoint_url:
                raise ConfigurationError("ENCODER_ENDPOINT_URL is not configured")
            if (
                settings.decoder_required
                and settings.decoder_api_type != "chat_completion"
                and not settings.decoder_endpoint_url
            ):
                raise ConfigurationError("DECODER_ENDPOINT_URL is not configured")
            decoder_url = settings.decoder_endpoint_url
            return settings.encoder_endpoint_url, decoder_url

    raise ConfigurationError("HF_SERVING_TYPE must be serverless or endpoint")


def build_encoder_input(settings: Settings, text: str) -> str:
    if settings.encoder_preprocess_enabled:
        return clean_text_for_encoder(text)
    return text


def build_encoder_payload(settings: Settings, text: str) -> dict[str, Any]:
    encoder_text = build_encoder_input(settings, text)
    match settings.encoder_request_format:
        case "hf_inputs":
            return {"inputs": encoder_text}
        case "text_json":
            return {"text": encoder_text}
    raise ConfigurationError("ENCODER_REQUEST_FORMAT must be hf_inputs or text_json")


def build_decoder_payload(
    settings: Settings,
    prompt: str,
) -> dict[str, Any]:
    match settings.decoder_api_type:
        case "text_generation":
            return {
                "inputs": prompt,
                "parameters": {
                    "max_new_tokens": settings.decoder_max_new_tokens,
                    "temperature": settings.decoder_temperature,
                    "return_full_text": False,
                },
            }
        case "chat_completion":
            return {
                "model": settings.decoder_model_id,
                "messages": [
                    {
                        "role": "user",
                        "content": prompt,
                    }
                ],
                "max_tokens": settings.decoder_max_new_tokens,
                "temperature": settings.decoder_temperature,
                "stream": False,
            }
    raise ConfigurationError(
        "DECODER_API_TYPE must be text_generation or chat_completion"
    )


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


def normalize_classifier_items(
    items: list[dict[str, Any]],
) -> tuple[str, float, int, str, list[str]]:
    if not items:
        raise ResponseNormalizationError("Encoder endpoint response is empty")

    best = max(
        items,
        key=lambda item: parse_normalized_float(item.get("score", 0.0), "score"),
    )
    confidence = parse_normalized_float(best.get("score", 0.0), "score")
    raw_label = first_present(best, "label", "label_name", "pred")
    if raw_label is None:
        raise ResponseNormalizationError(
            "Encoder endpoint response is missing label"
        )
    label = normalize_label(str(raw_label))
    score = build_risk_score(label, confidence, best.get("risk_score"))
    return (
        label,
        confidence,
        score,
        str(best.get("risk_level") or build_risk_level(score)),
        normalize_feature_lines(best.get("features")),
    )


def normalize_encoder_response(
    response_payload: Any,
) -> tuple[str, float, int, str, list[str]]:
    if isinstance(response_payload, list) and response_payload:
        first_item = response_payload[0]
        if isinstance(first_item, list) and first_item:
            if not all(isinstance(item, dict) for item in first_item):
                raise ResponseNormalizationError(
                    "Encoder endpoint response contains invalid classifier item"
                )
            return normalize_classifier_items(first_item)
        if all(isinstance(item, dict) for item in response_payload) and all(
            "score" in item for item in response_payload
        ):
            return normalize_classifier_items(response_payload)
        if isinstance(first_item, dict):
            confidence_value = first_present(first_item, "score", "confidence")
            if confidence_value is None:
                raise ResponseNormalizationError(
                    "Encoder endpoint response is missing confidence"
                )
            confidence = parse_normalized_float(
                confidence_value,
                "confidence",
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
        label = first_present(
            response_payload,
            "label",
            "predicted_label",
            "label_name",
            "pred",
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

            normalized_confidence = parse_normalized_float(
                confidence, "confidence"
            )
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
            reason = str(
                first_item.get("generated_text")
                or first_item.get("summary_text")
                or first_item.get("reason")
                or "판단 근거를 생성하지 못했습니다."
            )
            return THINK_PATTERN.sub("", reason).strip()

    if isinstance(response_payload, dict):
        choices = response_payload.get("choices")
        if isinstance(choices, list) and choices:
            first_choice = choices[0]
            if isinstance(first_choice, dict):
                message = first_choice.get("message")
                if isinstance(message, dict) and message.get("content"):
                    reason = str(message["content"])
                    return THINK_PATTERN.sub("", reason).strip()
                if first_choice.get("text"):
                    reason = str(first_choice["text"])
                    return THINK_PATTERN.sub("", reason).strip()

        reason = str(
            response_payload.get("generated_text")
            or response_payload.get("reason")
            or response_payload.get("text")
            or "판단 근거를 생성하지 못했습니다."
        )
        return THINK_PATTERN.sub("", reason).strip()

    return "판단 근거를 생성하지 못했습니다."


def call_hf_inference_client_chat(
    settings: Settings,
    messages: list[dict[str, str]],
) -> str:
    from huggingface_hub import InferenceClient

    try:
        kwargs: dict[str, str | int] = {
            "api_key": settings.hf_token,
            "timeout": settings.request_timeout_seconds,
        }
        if settings.decoder_provider:
            kwargs["provider"] = settings.decoder_provider

        client = InferenceClient(**kwargs)
        response = client.chat.completions.create(
            model=settings.decoder_model_id,
            messages=messages,
            max_tokens=settings.decoder_max_new_tokens,
            temperature=settings.decoder_temperature,
        )
        content = response.choices[0].message.content or ""
        return THINK_PATTERN.sub("", str(content)).strip()
    except Exception as exc:
        raise UpstreamInferenceError("HF decoder provider request failed") from exc


def build_decoder_prompt(
    text: str,
    label: str,
    confidence: float,
    features: list[str],
) -> str:
    feature_text = "\n".join(f"- {feature}" for feature in features)
    if not feature_text:
        feature_text = "- 특이 사항 없음"

    return (
        "당신은 스미싱(SMS 피싱) 탐지 전문가입니다. "
        "주어진 문자 내용, 판별 결과, 감지된 특징을 근거로 "
        "한 문장으로 설명하세요. "
        "인사말이나 추가 질문 없이 판단 이유만 작성하세요.\n\n"
        f"문자 내용: {text[:500]}\n"
        f"판별 결과: {label}\n"
        f"신뢰도: {confidence:.2f}\n"
        f"감지된 특징:\n{feature_text}\n"
        "이유:"
    )


def build_decoder_messages(prompt: str) -> list[dict[str, str]]:
    return [
        {
            "role": "system",
            "content": (
                "/no_think\n"
                "당신은 스미싱(SMS 피싱) 탐지 전문가입니다. "
                "주어진 문자 내용과 감지된 특징을 근거로, "
                "해당 문자가 스미싱으로 의심되는 이유를 "
                "두 문장 이내로 설명하세요."
            ),
        },
        {"role": "user", "content": prompt},
    ]


def build_normal_fallback_reason(features: list[str]) -> str:
    if features:
        return (
            "일부 특징은 감지되었지만 스미싱으로 분류될 만큼의 "
            "위험 신호는 뚜렷하지 않습니다."
        )
    return (
        "피싱으로 의심되는 강한 표현이나 링크 클릭 유도 "
        "패턴이 뚜렷하지 않습니다."
    )


def build_phishing_fallback_reason(features: list[str]) -> str:
    if features:
        return (
            f"{', '.join(features[:3])} 같은 피싱 의심 요소가 포함되어 "
            "위험도가 높게 분류되었습니다."
        )
    return (
        "모델이 스미싱 위험이 높은 문자로 분류했습니다. "
        "링크 접속, 개인정보 입력, 금전 요구 여부를 "
        "주의해야 합니다."
    )


async def hf_endpoint_analyze(
    text: str,
    settings: Settings,
    client: httpx.AsyncClient,
    request_id: str,
) -> AnalyzeResponse:
    validate_runtime_settings(settings)
    encoder_url, decoder_url = resolve_hf_urls(settings)

    encoder_payload = await post_hf_endpoint(
        client,
        encoder_url,
        settings.hf_token,
        build_encoder_payload(settings, text),
        settings.request_timeout_seconds,
        settings.hf_max_retries,
        settings.hf_retry_backoff_seconds,
        request_id,
    )
    label, confidence, score, risk_level, features = normalize_encoder_response(
        encoder_payload
    )

    should_call_decoder = settings.decoder_required or (
        label != "normal" or settings.decoder_on_normal
    )
    if (
        settings.decoder_api_type == "text_generation"
        and not settings.decoder_endpoint_url
    ):
        should_call_decoder = False
    if settings.decoder_api_type == "chat_completion":
        if not settings.decoder_model_id:
            should_call_decoder = False

    if not should_call_decoder:
        reason = (
            build_normal_fallback_reason(features)
            if label == "normal"
            else build_phishing_fallback_reason(features)
        )
    elif label == "normal" and not settings.decoder_on_normal:
        reason = build_normal_fallback_reason(features)
    else:
        prompt = build_decoder_prompt(text, label, confidence, features)
        if settings.decoder_api_type == "chat_completion" and not (
            settings.decoder_endpoint_url
        ):
            reason = await asyncio.to_thread(
                call_hf_inference_client_chat,
                settings,
                build_decoder_messages(prompt),
            )
        else:
            decoder_payload = await post_hf_endpoint(
                client,
                decoder_url,
                settings.hf_token,
                build_decoder_payload(settings, prompt),
                settings.request_timeout_seconds,
                settings.hf_max_retries,
                settings.hf_retry_backoff_seconds,
                request_id,
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


@app.get("/ready")
async def ready() -> JSONResponse:
    settings = load_settings()
    errors = collect_settings_errors(settings)
    status_code = 200 if not errors else 503
    return JSONResponse(
        status_code=status_code,
        content={
            "ready": not errors,
            "service": "deploy_wrapper",
            "serving_mode": settings.serving_mode,
            "hf_serving_type": settings.hf_serving_type,
            "decoder_on_normal": settings.decoder_on_normal,
            "decoder_provider": settings.decoder_provider or None,
            "errors": errors,
        },
    )


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
async def analyze(
    payload: AnalyzeRequest,
    x_request_id: Annotated[str | None, Header()] = None,
) -> AnalyzeResponse | JSONResponse:
    settings = load_settings()
    request_id = build_request_id(x_request_id)

    try:
        logger.info(
            "Analyze request received request_id=%s serving_mode=%s",
            request_id,
            settings.serving_mode,
        )
        match settings.serving_mode:
            case "mock":
                return await mock_analyze(payload.text, settings)
            case "hf_endpoint":
                return await hf_endpoint_analyze(
                    payload.text,
                    settings,
                    app.state.http_client,
                    request_id,
                )
    except InferenceError as exc:
        logger.warning(
            "%s request_id=%s: %s",
            exc.error_code,
            request_id,
            exc,
            exc_info=True,
        )
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "error_code": exc.error_code,
                "message": exc.public_message,
            },
        )
    except Exception:
        logger.exception(
            "Unexpected deploy wrapper inference failure request_id=%s",
            request_id,
        )
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
