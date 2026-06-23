from __future__ import annotations

from urllib.parse import urlparse

from ..models.static_patterns import PatternType, StaticPattern


def _extract_domain(url: str) -> str:
    try:
        return urlparse(url if url.startswith("http") else f"http://{url}").hostname or url
    except Exception:
        return url

# ─── 정적 가이드 데이터 ───────────────────────────────────────

SAFE_ACTION_GUIDE = [
    {"priority": "normal", "action": "의심스러운 링크나 연락처는 공식 채널에서 한 번 더 확인하세요."},
    {"priority": "normal", "action": "개인정보나 인증번호를 요구받으면 공식 채널에서 직접 확인하세요."},
]

RISK_ACTION_GUIDE = [
    {"priority": "critical", "action": "문자 안의 링크나 첨부파일을 열지 마세요."},
    {"priority": "high", "action": "기존에 알고 있던 공식 연락처로 직접 확인하세요."},
    {"priority": "normal", "action": "인증번호나 비밀번호를 입력하지 마세요."},
]

_GOVERNMENT_CRITERIA_BASE = [
    {"id": "url_included",          "label": "의심 URL 포함"},
    {"id": "impersonation",         "label": "기관 또는 지인 사칭"},
    {"id": "payment_request",       "label": "금전 또는 결제 요구"},
    {"id": "personal_info_request", "label": "개인정보 입력 유도"},
]

_IMPERSONATION_KEYWORDS = {
    "검찰", "경찰", "금감원", "금융감독원", "국세청",
    "건강보험", "국민건강보험", "법원", "은행",
}
_PAYMENT_KEYWORDS = {"결제", "입금", "환불", "송금", "납부", "대출", "저금리"}
_PERSONAL_INFO_KEYWORDS = {"본인확인", "인증번호", "개인정보", "비밀번호", "주민번호", "계좌번호"}

_SMISHING_TYPE_RULES: list[tuple[str, set[str]]] = [
    ("가족/지인 사칭",  {"엄마", "아빠", "아들", "딸", "폰 고장", "번호 바뀌"}),
    ("공공기관 사칭",  _IMPERSONATION_KEYWORDS),
    ("택배 사칭",      {"배송", "택배", "운송장", "통관"}),
    ("대출 사기",      {"대출", "저금리", "무직자", "사채"}),
    ("이벤트 사기",    {"이벤트", "당첨", "쿠폰"}),
]

# ─── 헬퍼 ────────────────────────────────────────────────────

def _build_government_criteria(content: str, extracted: dict) -> list[dict]:
    matched = {
        "url_included":          bool(extracted.get("urls")),
        "impersonation":         any(kw in content for kw in _IMPERSONATION_KEYWORDS),
        "payment_request":       any(kw in content for kw in _PAYMENT_KEYWORDS),
        "personal_info_request": any(kw in content for kw in _PERSONAL_INFO_KEYWORDS),
    }
    return [{**base, "matched": matched[base["id"]]} for base in _GOVERNMENT_CRITERIA_BASE]


def _classify_smishing_type(content: str) -> str:
    for label, keywords in _SMISHING_TYPE_RULES:
        if any(kw in content for kw in keywords):
            return label
    return "기타 사기"


# ─── 응답 빌더 ────────────────────────────────────────────────

def build_static_pattern_response(
    content: str,
    matched_patterns: list[StaticPattern],
) -> dict:
    reasons = []
    extracted_url = None
    url_values = []

    for pattern in matched_patterns:
        if pattern.pattern_type == PatternType.URL:
            reasons.append({
                "code": "blacklisted_url",
                "label": f"악성 URL이 탐지되었습니다: {pattern.pattern_value}",
                "severity": "high",
                "matched": True,
            })
            url_values.append(pattern.pattern_value)
            extracted_url = extracted_url or pattern.pattern_value
        elif pattern.pattern_type == PatternType.PHONE:
            reasons.append({
                "code": "blacklisted_phone",
                "label": f"악성 전화번호가 탐지되었습니다: {pattern.pattern_value}",
                "severity": "high",
                "matched": True,
            })

    flags = [
        {
            "type": "블랙리스트 등록",
            "desc": f"악성 URL로 신고된 주소입니다: {extracted_url or content}",
            "severity": "high",
        }
    ]

    return {
        "riskLevel": "high",
        "riskScore": 95,
        "smishingType": _classify_smishing_type(content),
        "reasons": reasons,
        "actionGuide": RISK_ACTION_GUIDE,
        "governmentCriteria": _build_government_criteria(content, {"urls": url_values}),
        "extractedUrl": extracted_url,
        "urlDetails": {
            "domain": _extract_domain(content),
            "ssl": {"valid": False, "issuer": "알 수 없음", "expiry": "알 수 없음"},
            "domainAge": 0,
            "redirects": [],
            "ipCountry": "알 수 없음",
            "similarDomains": [],
            "flags": flags,
        },
    }


def build_safe_response(content: str, score: int) -> dict:
    return {
        "riskLevel": "low",
        "riskScore": score,
        "smishingType": "정상 문자",
        "reasons": [
            {
                "code": "no_threat",
                "label": "스미싱 의심 요소가 발견되지 않았습니다.",
                "severity": "low",
                "matched": False,
            },
        ],
        "actionGuide": SAFE_ACTION_GUIDE,
        "governmentCriteria": _build_government_criteria(content, {"urls": []}),
        "extractedUrl": None,
        "urlDetails": {
            "domain": _extract_domain(content),
            "ssl": {"valid": True, "issuer": "알 수 없음", "expiry": "알 수 없음"},
            "domainAge": 0,
            "redirects": [],
            "ipCountry": "알 수 없음",
            "similarDomains": [],
            "flags": [
                {
                    "type": "이상 없음",
                    "desc": "블랙리스트에 등록되지 않은 주소입니다.",
                    "severity": "low",
                }
            ],
        },
    }


def build_model_smishing_response(
    content: str,
    score: int,
    reason: str,
    extracted: dict,
) -> dict:
    risk_level = "high" if score >= 70 else "medium"

    reasons = []
    if extracted.get("urls"):
        reasons.append({
            "code": "suspicious_url",
            "label": "의심스러운 URL이 포함되어 있습니다.",
            "severity": "high",
            "matched": True,
        })
    if extracted.get("phones"):
        reasons.append({
            "code": "suspicious_phone",
            "label": "의심스러운 전화번호가 포함되어 있습니다.",
            "severity": "medium",
            "matched": True,
        })
    reasons.append({
        "code": "ai_detection",
        "label": reason or "AI 모델이 스미싱 가능성을 탐지했습니다.",
        "severity": risk_level,
        "matched": True,
    })

    extracted_url = extracted["urls"][0] if extracted.get("urls") else None

    return {
        "riskLevel": risk_level,
        "riskScore": score,
        "smishingType": _classify_smishing_type(content),
        "reasons": reasons,
        "actionGuide": RISK_ACTION_GUIDE,
        "governmentCriteria": _build_government_criteria(content, extracted),
        "extractedUrl": extracted_url,
    }
