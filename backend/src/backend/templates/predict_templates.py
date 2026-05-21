from __future__ import annotations

from ..models.static_patterns import PatternType, StaticPattern

SAFE_RECOMMENDED_ACTIONS = [
    "문자 내용이 의심스럽지 않더라도 링크나 연락처는 한 번 더 확인하세요.",
    "개인정보나 인증번호를 요구받으면 공식 채널에서 직접 확인하세요.",
]

RISK_RECOMMENDED_ACTIONS = [
    "문자 안의 링크나 첨부파일을 열지 마세요.",
    "기존에 알고 있던 공식 연락처로 직접 확인하세요.",
    "인증번호나 비밀번호를 입력하지 마세요.",
]

STATIC_PATTERN_REASON_TEMPLATES = {
    PatternType.URL: "악성 URL이 탐지되었습니다: {value}",
    PatternType.PHONE: "악성 전화번호가 탐지되었습니다: {value}",
    PatternType.KEYWORD: "스미싱 의심 키워드가 탐지되었습니다: {value}",
}

STATIC_PATTERN_FACTOR_LABELS = {
    PatternType.URL: "링크 유도",
    PatternType.PHONE: "연락처 유도",
    PatternType.KEYWORD: "의심 키워드",
}


def build_static_pattern_reason(pattern: StaticPattern) -> str:
    template = STATIC_PATTERN_REASON_TEMPLATES.get(
        pattern.pattern_type,
        "위험 패턴이 탐지되었습니다: {value}",
    )
    return template.format(value=pattern.pattern_value)


def build_static_pattern_response(
    input_text: str,
    matched_patterns: list[StaticPattern],
) -> dict:
    evidence = [build_static_pattern_reason(pattern) for pattern in matched_patterns]
    highlighted_terms = [pattern.pattern_value for pattern in matched_patterns]
    factor_scores = [
        {
            "label": STATIC_PATTERN_FACTOR_LABELS.get(
                pattern.pattern_type,
                "정적 패턴",
            ),
            "score": 95,
        }
        for pattern in matched_patterns
    ]

    explanation = " ".join(evidence)

    return {
        "inputText": input_text,
        "riskScore": 95,
        "riskLevel": "위험",
        "impersonationType": "알려진 스미싱 패턴",
        "suspiciousEvidence": evidence,
        "recommendedActions": RISK_RECOMMENDED_ACTIONS,
        "familyCheckMessage": (
            "확인 부탁해요. 이 문자는 알려진 악성 패턴과 일치해 위험해 보여요. "
            "링크를 열거나 개인정보를 입력하지 않고 공식 연락처로 먼저 확인하겠습니다."
        ),
        "explanation": explanation,
        "highlightedTerms": highlighted_terms,
        "factorScores": factor_scores,
    }


def build_safe_response(input_text: str, score: int) -> dict:
    return {
        "inputText": input_text,
        "riskScore": score,
        "riskLevel": "안전",
        "impersonationType": "해당 없음",
        "suspiciousEvidence": ["모델 분석 결과 스미싱 가능성이 낮게 판단되었습니다."],
        "recommendedActions": SAFE_RECOMMENDED_ACTIONS,
        "familyCheckMessage": (
            "확인해보니 현재 문자에서는 스미싱 가능성이 낮게 보여요. "
            "그래도 링크나 개인정보 입력 요청은 공식 채널에서 한 번 더 확인하겠습니다."
        ),
        "explanation": "스미싱으로 분류되지 않았습니다.",
        "highlightedTerms": [],
        "factorScores": [
            {"label": "모델 위험도", "score": score},
            {"label": "정적 패턴", "score": 0},
        ],
    }


def build_model_smishing_response(
    input_text: str,
    score: int,
    reason: str,
    highlighted_terms: list[str],
) -> dict:
    evidence = [reason] if reason else ["모델 분석 결과 스미싱으로 판단되었습니다."]

    return {
        "inputText": input_text,
        "riskScore": score,
        "riskLevel": "위험",
        "impersonationType": "AI 모델 탐지",
        "suspiciousEvidence": evidence,
        "recommendedActions": RISK_RECOMMENDED_ACTIONS,
        "familyCheckMessage": (
            "확인 부탁해요. 이 문자는 AI 분석 결과 스미싱 가능성이 높아 보여요. "
            "링크를 열거나 개인정보를 입력하지 않고 공식 연락처로 먼저 확인하겠습니다."
        ),
        "explanation": reason or "스미싱 가능성이 높게 탐지되었습니다.",
        "highlightedTerms": highlighted_terms,
        "factorScores": [
            {"label": "모델 위험도", "score": score},
            {"label": "정적 패턴", "score": 0},
        ],
    }
