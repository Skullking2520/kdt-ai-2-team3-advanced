from __future__ import annotations

import re
from typing import Any

from fastapi import HTTPException
from pydantic import TypeAdapter, ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.pydantic_settings import settings
from ..models.smishing_log import DetectionType
from ..models.static_patterns import PatternType, StaticPattern
from ..repository.smishing_log_repository import create_smishing_log
from ..repository.static_pattern_repository import (
    find_matching_static_patterns,
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
from .url_candidate_service import register_model_url_candidates

SMISHING_LABELS = {"phishing", "smishing", "scam", "spam", "fraud"}
NORMAL_EXPLANATION = (
    "정상적인 일반 문자메시지입니다. "
    "스미싱 의심 요소가 발견되지 않는 안전한 메시지입니다."
)
EXPLAINER_UNAVAILABLE_EXPLANATION = (
    "스미싱으로 탐지되었지만 설명 생성 모델이 준비 중입니다. "
    "링크나 개인정보 입력 요청에 응하지 마세요."
)

_think_pattern = re.compile(r"<think>.*?</think>", re.DOTALL)
_encoder_output_adapter = TypeAdapter(list[EncoderClassificationOutput])
_encoder_client = None
_explainer_client = None

_SYSTEM_PROMPT = (
    "/no_think\n"
    "당신은 스미싱(SMS 피싱) 탐지 전문가입니다."
    "주어진 문자 내용과 감지된 특징을 근거로, "
    "해당 문자가 스미싱으로 의심되는 이유를 한글로 설명하세요."
    "70자 미만의 한문장으로 설명해야되며 인사말과 추가 질문이 들어가서는 안됩니다."
)

_FEW_SHOT_EXAMPLES = [
    {
        "text": "[국민건강보험] 건강보험료 환급금 32만원 발생. 당일 신청 마감.",
        "features": "- 위험 키워드 감지: 환급, 당일입금",
        "answer": (
            "공공기관을 사칭해 환급금을 미끼로 긴급 신청을 유도하므로 "
            "스미싱 가능성이 높습니다."
        ),
    },
    {
        "text": "[대법원] 귀하의 민사소송 접수 완료. 확인 → http://supcourt-kr.com",
        "features": "- 외부 링크 포함: http://supcourt-kr.com",
        "answer": (
            "공식 기관을 사칭하며 의심스러운 URL 접속을 유도하므로 "
            "스미싱 가능성이 높습니다."
        ),
    },
    {
        "text": "토론토에서 온 작가입니다. whatsapp: bookworm_jim canada.net",
        "features": "- 외부 연락처 유도: whatsapp: bookworm_jim canada.net",
        "answer": (
            "외국인을 사칭해 외부 메신저 접촉을 유도하므로 스미싱 가능성이 높습니다."
        ),
    },
    {
        "text": (
            "[국민은행] 고객님 계좌가 이상거래로 정지되었습니다. 고객센터: 1588-0000"
        ),
        "features": "- 전화번호 포함: 1588-0000",
        "answer": (
            "금융기관을 사칭해 전화 연결과 개인정보 제공을 유도하므로 "
            "스미싱 가능성이 높습니다."
        ),
    },
    {
        "text": "네 딸 지금 우리가 데리고 있다. 2시간 안에 500만원 송금해라.",
        "features": "- 금전 관련 내용: 500만원",
        "answer": (
            "납치를 빙자한 협박으로 긴급 송금을 요구하므로 스미싱 가능성이 높습니다."
        ),
    },
    {
        "text": (
            "[국외발신] 귀하의 소포가 세관에 보류되었습니다. "
            "통관료 결제 후 수령 가능합니다."
        ),
        "features": "- 해외 발신 문자",
        "answer": (
            "해외 발신 문자로 세관 통관료 결제를 요구하므로 스미싱 가능성이 높습니다."
        ),
    },
]


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


def _get_explainer_client():
    global _explainer_client
    if _explainer_client is None:
        try:
            from huggingface_hub import AsyncInferenceClient
        except ImportError as exc:
            raise HTTPException(
                status_code=500,
                detail="huggingface_hub 패키지가 설치되어 있지 않습니다.",
            ) from exc

        kwargs: dict[str, Any] = {
            "api_key": settings.HF_TOKEN,
            "timeout": settings.HF_TIMEOUT_SECONDS,
        }
        if settings.DECODER_ENDPOINT_URL:
            kwargs["base_url"] = settings.DECODER_ENDPOINT_URL

        _explainer_client = AsyncInferenceClient(**kwargs)

    return _explainer_client


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
        return EncoderClassificationOutput(label="smishing", score=0.85)

    response = await _get_encoder_client().text_classification(text=text)

    return _validate_encoder_response(response)


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


def _build_raw_prompt(text: str, features: str) -> str:
    prompt = f"<|im_start|>system\n{_SYSTEM_PROMPT}<|im_end|>\n"

    for example in _FEW_SHOT_EXAMPLES:
        prompt += (
            "<|im_start|>user\n"
            f"문자 내용: {example['text']}\n"
            f"감지된 특징:\n{example['features']}\n"
            "이유:<|im_end|>\n"
            "<|im_start|>assistant\n"
            f"{example['answer']}<|im_end|>\n"
        )

    prompt += (
        "<|im_start|>user\n"
        f"문자 내용: {text[:300]}\n"
        f"감지된 특징:\n{features}\n"
        "이유:<|im_end|>\n"
        "<|im_start|>assistant\n"
    )

    return prompt


def _normalize_generation_output(raw_output: Any) -> str:
    if not isinstance(raw_output, str):
        raw_output = getattr(raw_output, "generated_text", str(raw_output))

    if "이유:" in raw_output:
        raw_output = raw_output.split("이유:")[-1].strip()

    raw_output = _think_pattern.sub("", raw_output).strip()
    raw_output = raw_output.replace("<think>", "").replace("</think>", "").strip()

    for remove_word in ["<|im_start|>", "assistant", "<|im_end|>"]:
        raw_output = raw_output.replace(remove_word, "")

    lines = [line.strip() for line in raw_output.split("\n") if line.strip()]

    return lines[0] if lines else ""


def _extract_status_code(exc: Exception) -> int | None:
    response = getattr(exc, "response", None)
    status_code = getattr(response, "status_code", None)
    if isinstance(status_code, int):
        return status_code

    status_code = getattr(exc, "status_code", None)
    if isinstance(status_code, int):
        return status_code

    return None


def _is_explainer_unavailable(exc: Exception) -> bool:
    status_code = _extract_status_code(exc)
    if status_code in {400, 404, 422, 503, 504, 529}:
        return True

    message = str(exc).lower()
    return (
        "timeout" in message
        or "timed out" in message
        or "service unavailable" in message
        or "not supported" in message
        or "unsupported" in message
        or "provider" in message
    )


async def generate_explanation(
    text: str,
    label_name: str,
    features: str,
) -> str:
    if label_name != "스미싱":
        return NORMAL_EXPLANATION

    if settings.USE_MOCK_MODEL:
        return (
            "테스트 모드: 스미싱 의심 문자로 탐지되었습니다. "
            "링크나 개인정보 입력 요청에 응하지 마세요."
        )

    try:
        model = None if settings.DECODER_ENDPOINT_URL else settings.EXPLAINER_MODEL
        raw_output = await _get_explainer_client().text_generation(
            prompt=_build_raw_prompt(text, features),
            model=model,
            max_new_tokens=settings.HF_DECODER_MAX_NEW_TOKENS,
            temperature=0.01,
            return_full_text=False,
        )
        explanation = _normalize_generation_output(raw_output)

        return explanation or EXPLAINER_UNAVAILABLE_EXPLANATION
    except Exception as exc:
        if _is_explainer_unavailable(exc):
            return EXPLAINER_UNAVAILABLE_EXPLANATION

        return f"설명을 생성할 수 없습니다. ({exc})"


async def predict_smishing(
    db: AsyncSession,
    request: PredictRequest,
) -> dict:
    message = request.message
    extracted, matches = await _find_static_pattern_matches(db, message)

    masked_message = clean_for_model(message)

    if matches:
        await create_smishing_log(
            db,
            masked_message,
            is_smishing=True,
            detection_type=DetectionType.STATIC_PATTERN,
        )
        return build_static_pattern_response(message, matches)

    encoder_output = await request_encoder_prediction(masked_message)
    is_smishing = _is_smishing_label(encoder_output.label)
    risk_score = _confidence_to_risk_score(
        encoder_output.label,
        encoder_output.score,
    )

    if not is_smishing:
        await create_smishing_log(
            db, masked_message, is_smishing=False,
            detection_type=DetectionType.ENCODER, ai_score=encoder_output.score
        )
        return build_safe_response(message, risk_score)

    features = _build_features(masked_message, extracted)
    reason = await generate_explanation(masked_message, "스미싱", features)
    await register_model_url_candidates(
        db,
        urls=extracted["urls"],
        confidence=encoder_output.score,
        reason=reason,
    )
    await create_smishing_log(
        db,
        masked_message,
        is_smishing=True,
        detection_type=DetectionType.RAG_DECODER,
        ai_score=encoder_output.score,
        reasoning=reason,
    )

    highlighted_terms = [
        *extracted["urls"],
        *extracted["phones"],
        *extracted["keywords"],
    ]

    return build_model_smishing_response(
        input_text=message,
        score=risk_score,
        reason=reason,
        highlighted_terms=highlighted_terms,
    )
