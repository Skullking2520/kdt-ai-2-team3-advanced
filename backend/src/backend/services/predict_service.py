from __future__ import annotations

import logging
import time
from typing import Any

from fastapi import HTTPException
from pydantic import TypeAdapter, ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.pydantic_settings import settings
from ..models.smishing_log import DetectionType, InputType
from ..models.static_patterns import PatternType, StaticPattern
from ..repository.smishing_log_repository import create_smishing_log
from ..repository.static_pattern_repository import (
    find_matching_static_patterns,
    increment_pattern_counts,
)
from ..schemas.predict_api import EncoderClassificationOutput, PredictRequest
from ..templates.predict_templates import (
    build_model_smishing_response,
    build_safe_response,
    build_static_pattern_response,
)
from ..utils.preprocessor import (
    clean_for_model,
    external_contact_pattern,
    extract_static_patterns,
    foreign_pattern,
    kw_pattern,
    money_pattern,
)
from .url_candidate_service import (
    register_model_url_candidates,
    register_reported_url_candidates,
)
from .virustotal_service import fetch_vt_verdict_full

logger = logging.getLogger(__name__)

SMISHING_LABELS = {"phishing", "smishing", "scam", "spam", "fraud"}

# 인코더 단독 판정 임계값: 이 이상이면 인코더가 확실히 스미싱으로 판단한 것으로 기록
# 미만이면 디코더가 판정에도 참여한 것으로 기록 (DetectionType.RAG_DECODER)
SMISHING_HIGH_CONFIDENCE = 0.90
NORMAL_EXPLANATION = (
    "정상적인 일반 문자메시지입니다. "
    "스미싱 의심 요소가 발견되지 않는 안전한 메시지입니다."
)
EXPLAINER_UNAVAILABLE_EXPLANATION = (
    "스미싱으로 탐지되었지만 설명 생성 모델이 준비 중입니다. "
    "링크나 개인정보 입력 요청에 응하지 마세요."
)

_encoder_output_adapter = TypeAdapter(list[EncoderClassificationOutput])
_encoder_client = None


def _to_pattern_lookup(extracted: dict[str, list[str]]) -> dict[PatternType, list[str]]:
    return {
        PatternType.URL: extracted["urls"],
        PatternType.PHONE: extracted["phones"],
        # 키워드 매칭은 URL, 전화번호보다 단조로우므로 그냥 기록만 함
    }


async def _find_static_pattern_matches(
    db: AsyncSession,
    message: str,
) -> tuple[dict[str, list[str]], list[StaticPattern]]:
    extracted = extract_static_patterns(message)
    matches = await find_matching_static_patterns(db, _to_pattern_lookup(extracted))

    return extracted, matches


def _require_encoder_settings() -> tuple[str, str]:
    api_key = settings.ENCODER_API_KEY
    endpoint = settings.ENCODER_INFERENCE_ENDPOINT or settings.HF_SMISHING_ENCODER_URL

    if not api_key or not endpoint:
        raise HTTPException(
            status_code=500,
            detail="ENCODER_API_KEY, ENCODER_INFERENCE_ENDPOINT 환경변수가 필요합니다.",
        )

    return api_key, endpoint


def _get_encoder_client():
    global _encoder_client
    if _encoder_client is None:
        api_key, endpoint = _require_encoder_settings()
        try:
            from huggingface_hub import AsyncInferenceClient
        except ImportError as exc:
            raise HTTPException(
                status_code=500,
                detail="huggingface_hub 패키지가 설치되어 있지 않습니다.",
            ) from exc

        _encoder_client = AsyncInferenceClient(
            api_key=api_key,
            model=endpoint,
            timeout=settings.HF_TIMEOUT_SECONDS,
        )

    return _encoder_client



def _normalize_encoder_response(response: Any) -> list[Any]:
    if isinstance(response, list):
        if response and isinstance(response[0], list):
            return response[0]
        return response

    return [response]


def _validate_encoder_response(response: Any) -> EncoderClassificationOutput:
    try:
        outputs = _encoder_output_adapter.validate_python(
            _normalize_encoder_response(response)
        )
    except ValidationError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"인코더 응답 형식이 올바르지 않습니다. {exc.errors()}",
        ) from exc

    if not outputs:
        raise HTTPException(
            status_code=502,
            detail="인코더 응답이 비어 있습니다.",
        )

    return max(outputs, key=lambda output: output.score)


def _score_to_percent(score: float) -> int:
    return max(0, min(100, round(score * 100)))


def _is_smishing_label(label: str) -> bool:
    return label.strip().lower() in SMISHING_LABELS


def _confidence_to_risk_score(label: str, confidence: float) -> int:
    confidence_score = _score_to_percent(confidence)
    if _is_smishing_label(label):
        return confidence_score

    return 100 - confidence_score


async def request_encoder_prediction(text: str) -> EncoderClassificationOutput:
    if settings.USE_MOCK_MODEL:
        logger.info("[encoder] MOCK 모드 — label=smishing score=0.85")
        return EncoderClassificationOutput(label="smishing", score=0.85)

    api_key = settings.ENCODER_API_KEY
    endpoint = settings.ENCODER_INFERENCE_ENDPOINT or settings.HF_SMISHING_ENCODER_URL
    if not api_key or not endpoint:
        logger.warning("[encoder] API 키 또는 엔드포인트 미설정 → mock fallback")
        return EncoderClassificationOutput(label="smishing", score=0.85)

    logger.info("[encoder] 호출 시작 | endpoint=%s | text=%r", endpoint, text[:60])
    try:
        response = await _get_encoder_client().text_classification(text=text)
    except Exception as exc:
        logger.error("[encoder] 호출 실패 | %s: %s", type(exc).__name__, exc)
        raise HTTPException(
            status_code=502,
            detail=f"인코더 서비스 응답 오류: {type(exc).__name__}",
        ) from exc
    result = _validate_encoder_response(response)
    logger.info(
        "[encoder] 응답 완료 | label=%s | score=%.4f",
        result.label,
        result.score,
    )
    return result


def _build_features(text: str, extracted: dict[str, list[str]]) -> str:
    items = []
    external = external_contact_pattern.findall(text)

    if extracted["urls"]:
        tokens = " ".join(["<URL>"] * min(len(extracted["urls"]), 3))
        items.append(f"- 외부 링크 포함: {tokens}")

    if extracted["phones"]:
        tokens = " ".join(["<PHONE>"] * min(len(extracted["phones"]), 3))
        items.append(f"- 전화번호 포함: {tokens}")

    money = money_pattern.findall(text)
    if money:
        items.append(f"- 금전 관련 내용: {money[0]}")

    if foreign_pattern.search(text):
        items.append("- 해외 발신 문자")

    keywords = extracted["keywords"] or list(dict.fromkeys(kw_pattern.findall(text)))
    if keywords:
        items.append(f"- 위험 키워드 감지: {', '.join(keywords[:8])}")

    if external:
        items.append(f"- 외부 연락처 유도: {external[0][:60]}")

    return "\n".join(items) if items else "- 특이 사항 없음"


async def generate_explanation(
    text: str,
    label_name: str,
    features: str,  # noqa: ARG001
    ocr_text: str = "",
) -> str:
    """
    디코더(LangGraph Inference Endpoint)를 호출하여 스미싱 판단 근거 및 설명을 생성합니다.
    서버리스(Modal) 기반으로 작동하므로 타임아웃 및 예외 처리를 엄격하게 적용합니다.
    """
    if label_name != "스미싱":
        return NORMAL_EXPLANATION

    if settings.USE_MOCK_MODEL:
        return (
            "테스트 모드: 스미싱 의심 문자로 탐지되었습니다. "
            "링크나 개인정보 입력 요청에 응하지 마세요."
        )

    decoder_url = settings.DECODER_ENDPOINT_URL
    if not decoder_url:
        logger.warning("[decoder] DECODER_ENDPOINT_URL 환경변수가 설정되지 않았습니다.")
        return EXPLAINER_UNAVAILABLE_EXPLANATION

    # 1. 요구사항에 따른 라우팅 조건 분기 (ocr_text 존재 여부에 따라 결정)
    route_override = "zero_day" if ocr_text else "general"
    
    # URL 엔드포인트 빌드 및 로그 출력
    invoke_url = f"{decoder_url.rstrip('/')}/api/v1/graph/invoke"
    logger.info("[decoder] 호출 시작 | endpoint=%s | route_override=%s", invoke_url, route_override)
    
    payload = {
        "text": text,
        "ocr_text": ocr_text,
        "route_override": route_override
    }

    try:
        import httpx
        # 서버리스 특성상 Cold Start 지연이 있을 수 있으므로 충분한 timeout(60초)을 부여합니다.
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                invoke_url,
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            response.raise_for_status()
            data = response.json()
            
            # 2. 예상 답변 구조에 맞춰 parsed_output -> reason 추출
            reason = data.get("parsed_output", {}).get("reason")
            if reason:
                logger.info("[decoder] 응답 성공 및 추론 이유 추출 완료")
                return reason
                
            logger.warning("[decoder] 응답은 성공했으나 parsed_output.reason 필드가 없습니다: %s", data)
            
    except httpx.HTTPStatusError as exc:
        logger.error("[decoder] HTTP 오류 발생 | 상태 코드: %d | 내용: %s", exc.response.status_code, exc.response.text)
    except httpx.TimeoutException:
        logger.error("[decoder] 호출 타임아웃 발생 (서버리스 Cold Start 가능성)")
    except Exception as exc:
        logger.error("[decoder] 알 수 없는 호출 실패: %s: %s", type(exc).__name__, exc)

    # 실패 시 시스템이 다운되지 않도록 사용자 안전 안내 폴백 메시지 반환
    return EXPLAINER_UNAVAILABLE_EXPLANATION


async def _ocr_extract(image_data: str) -> str:
    # image_data: base64 data URI ("data:image/jpeg;base64,...")
    if settings.USE_MOCK_OCR:
        return "[국외발신] 귀하의 계좌가 정지되었습니다. 확인 → http://fake-ocr-test.com"

    try:
        from ..ocr.ocr_service import extract_text_from_image
        return await extract_text_from_image(image_data)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


async def _predict_url(
    db: AsyncSession,
    request: PredictRequest,
    start_time: float,
) -> dict:
    # URL 직접 분석: 인코더는 URL 단독으로 적합하지 않아 블랙리스트 매칭만 수행
    # 블랙리스트에 없으면 안전으로 판정 (정적 패턴 외 판단 근거 없음)
    url = request.content.strip()
    url_matches = await find_matching_static_patterns(db, {PatternType.URL: [url]})

    if url_matches:
        await increment_pattern_counts(db, url_matches)
        log = await create_smishing_log(
            db, url, is_smishing=True, detection_type=DetectionType.STATIC_PATTERN,
            input_type=InputType.URL,
        )
        result = build_static_pattern_response(url, url_matches)
    else:
        # 블랙리스트 미등록 신규 URL도 VirusTotal 검증 큐에 등록한다.
        await register_reported_url_candidates(
            db, urls=[url], report_type="URL 직접 분석",
        )
        log = await create_smishing_log(
            db, url, is_smishing=False, detection_type=DetectionType.STATIC_PATTERN,
            input_type=InputType.URL,
        )
        result = build_safe_response(url, 10)

    # VirusTotal 실제 API 호출 — vtVerdict + metaDetails 채움
    # VT_API_KEY 없거나 실패 시 None으로 두어 프론트의 vt_connection_error 분기 작동
    vt_payload = await fetch_vt_verdict_full(url)
    if vt_payload:
        result["urlDetails"]["vtVerdict"] = vt_payload["vtVerdict"]
        result["urlDetails"]["metaDetails"] = vt_payload["metaDetails"]
    else:
        result["urlDetails"]["vtVerdict"] = None
        result["urlDetails"]["metaDetails"] = None

    result.update({
        "id": str(log.id),
        "type": request.type,
        "content": request.content,
        "modelVersion": settings.MODEL_VERSION,
        "processingTime": int((time.monotonic() - start_time) * 1000),
        "cacheHit": False,
        "createdAt": log.created_at.isoformat(),
    })
    return result


async def predict_smishing(
    db: AsyncSession,
    request: PredictRequest,
) -> dict:
    if request.type not in ("sms", "url", "image"):
        raise HTTPException(
            status_code=501,
            detail=f"'{request.type}' 분석은 아직 지원하지 않습니다.",
        )

    start_time = time.monotonic()

    if request.type == "url":
        return await _predict_url(db, request, start_time)

    # 이미지 입력이면 OCR로 텍스트 추출 후 SMS 파이프라인으로 진입
    if request.type == "image":
        content = await _ocr_extract(request.content)
    else:
        content = request.content
    extracted, matches = await _find_static_pattern_matches(db, content)
    masked_content = clean_for_model(content)

    input_type = InputType(request.type.upper())

    if matches:
        await increment_pattern_counts(db, matches)
        has_static_url_match = any(
            pattern.pattern_type == PatternType.URL for pattern in matches
        )
        log = await create_smishing_log(
            db,
            masked_content,
            is_smishing=True,
            detection_type=DetectionType.STATIC_PATTERN,
            input_type=input_type,
            consent_for_training=bool(request.allowTrainingUse),
            static_url_match=has_static_url_match,
        )
        result = build_static_pattern_response(content, matches)

    else:
        encoder_output = await request_encoder_prediction(masked_content)
        is_smishing = _is_smishing_label(encoder_output.label)
        risk_score = _confidence_to_risk_score(
            encoder_output.label,
            encoder_output.score,
        )

        if not is_smishing:
            log = await create_smishing_log(
                db, masked_content, is_smishing=False,
                detection_type=DetectionType.ENCODER, ai_score=encoder_output.score,
                input_type=input_type,
                consent_for_training=bool(request.allowTrainingUse),
            )
            result = build_safe_response(content, risk_score)

        else:
            features = _build_features(masked_content, extracted)
            ocr_text = content if request.type == "image" else ""
            reason = await generate_explanation(masked_content, "스미싱", features, ocr_text=ocr_text)
            await register_model_url_candidates(
                db,
                urls=extracted["urls"],
                confidence=encoder_output.score,
                reason=reason,
            )
            # 고신뢰도: 인코더가 판정, 디코더는 설명 생성만 담당
            # 애매한 신뢰도: 디코더가 판정에도 참여
            det_type = (
                DetectionType.ENCODER
                if encoder_output.score >= SMISHING_HIGH_CONFIDENCE
                else DetectionType.RAG_DECODER
            )
            log = await create_smishing_log(
                db,
                masked_content,
                is_smishing=True,
                detection_type=det_type,
                ai_score=encoder_output.score,
                reasoning=reason,
                input_type=input_type,
                consent_for_training=bool(request.allowTrainingUse),
            )
            result = build_model_smishing_response(
                content=content,
                score=risk_score,
                reason=reason,
                extracted=extracted,
            )

    result.update({
        "id": str(log.id),
        "type": request.type,
        "content": content,
        "modelVersion": settings.MODEL_VERSION,
        "processingTime": int((time.monotonic() - start_time) * 1000),
        "cacheHit": False,
        "createdAt": log.created_at.isoformat(),
    })
    return result
