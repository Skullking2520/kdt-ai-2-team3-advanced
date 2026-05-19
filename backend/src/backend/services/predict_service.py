from __future__ import annotations

import re
from typing import Any

from fastapi import HTTPException
from pydantic import TypeAdapter, ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.pydantic_settings import settings
from ..models.static_patterns import PatternType, StaticPattern
from ..repository.static_pattern_repository import (
    create_static_patterns_if_new,
    find_matching_static_patterns,
)
from ..schemas.predict_api import EncoderClassificationOutput, PredictRequest
from ..templates.predict_templates import (
    build_model_smishing_response,
    build_safe_response,
    build_static_pattern_response,
)
from ..utils.preprocessor import (
    external_contact_pattern,
    extract_static_patterns,
    foreign_pattern,
    kw_pattern,
    money_pattern,
    phone_pattern,
    url_pattern,
)

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
        PatternType.KEYWORD: extracted["keywords"],
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
        if settings.EXPLAINER_PROVIDER:
            kwargs["provider"] = settings.EXPLAINER_PROVIDER

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


async def request_encoder_prediction(text: str) -> EncoderClassificationOutput:
    response = await _get_encoder_client().text_classification(text=text)

    return _validate_encoder_response(response)


def _build_features(text: str, extracted: dict[str, list[str]]) -> str:
    items = []
    external = external_contact_pattern.findall(text)
    external_joined = " ".join(external)

    urls = [url for url in extracted["urls"] if url not in external_joined]
    if not urls:
        urls = [url for url in url_pattern.findall(text) if url not in external_joined]
    if urls:
        items.append(f"- 외부 링크 포함: {', '.join(url[:60] for url in urls[:3])}")

    phones = extracted["phones"] or phone_pattern.findall(text)
    if phones:
        items.append(f"- 전화번호 포함: {phones[0]}")

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


def _build_messages(text: str, features: str) -> list[dict[str, str]]:
    messages = [{"role": "system", "content": _SYSTEM_PROMPT}]
    for example in _FEW_SHOT_EXAMPLES:
        messages.append(
            {
                "role": "user",
                "content": (
                    f"문자 내용: {example['text']}\n"
                    f"감지된 특징:\n{example['features']}\n"
                    "이유:"
                ),
            }
        )
        messages.append({"role": "assistant", "content": example["answer"]})

    messages.append(
        {
            "role": "user",
            "content": f"문자 내용: {text[:300]}\n감지된 특징:\n{features}\n이유:",
        }
    )

    return messages


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
    if status_code in {503, 504, 529}:
        return True

    message = str(exc).lower()
    return (
        "timeout" in message
        or "timed out" in message
        or "service unavailable" in message
    )


async def generate_explanation(
    text: str,
    label_name: str,
    features: str,
) -> str:
    if label_name != "스미싱":
        return NORMAL_EXPLANATION

    try:
        response = await _get_explainer_client().chat.completions.create(
            model=settings.EXPLAINER_MODEL,
            messages=_build_messages(text, features),
            max_tokens=settings.HF_DECODER_MAX_NEW_TOKENS,
            temperature=0,
        )
        raw = response.choices[0].message.content or ""
        explanation = _think_pattern.sub("", raw).strip()

        return explanation or EXPLAINER_UNAVAILABLE_EXPLANATION
    except Exception as exc:
        if _is_explainer_unavailable(exc):
            return EXPLAINER_UNAVAILABLE_EXPLANATION

        return f"설명을 생성할 수 없습니다. ({exc})"


def _to_static_pattern_rows(
    extracted: dict[str, list[str]],
    reason: str,
) -> list[dict]:
    description = reason[:255] if reason else "AI 모델 스미싱 탐지"
    rows = []
    rows.extend(
        {
            "pattern_type": PatternType.URL,
            "pattern_value": url,
            "description": description,
        }
        for url in extracted["urls"]
    )
    rows.extend(
        {
            "pattern_type": PatternType.PHONE,
            "pattern_value": phone,
            "description": description,
        }
        for phone in extracted["phones"]
    )
    rows.extend(
        {
            "pattern_type": PatternType.KEYWORD,
            "pattern_value": keyword,
            "description": description,
        }
        for keyword in extracted["keywords"]
    )

    return rows


async def predict_smishing(
    db: AsyncSession,
    request: PredictRequest,
) -> dict:
    message = request.message
    extracted, matches = await _find_static_pattern_matches(db, message)

    if matches:
        return build_static_pattern_response(message, matches)

    encoder_output = await request_encoder_prediction(message)
    score = _score_to_percent(encoder_output.score)

    if not _is_smishing_label(encoder_output.label):
        return build_safe_response(message, score)

    features = _build_features(message, extracted)
    reason = await generate_explanation(message, "스미싱", features)
    await create_static_patterns_if_new(db, _to_static_pattern_rows(extracted, reason))

    highlighted_terms = [
        *extracted["urls"],
        *extracted["phones"],
        *extracted["keywords"],
    ]

    return build_model_smishing_response(
        input_text=message,
        score=score,
        reason=reason,
        highlighted_terms=highlighted_terms,
    )
