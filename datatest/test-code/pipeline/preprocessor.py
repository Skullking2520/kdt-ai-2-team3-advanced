"""SMS 텍스트 전처리.

clean_for_model: 토큰 치환된 정제본 생성
extract_*: 메타 정보(URL/전화/금액 등) 추출
"""

import re

URL_PATTERN = r"(?:https?://\S+|www\.\S+|(?:[a-zA-Z0-9-]+\.)+(?:com|net|org|kr|co\.kr|go\.kr|or\.kr|ne\.kr|io|ai|ly|me|cc|xyz|top|site|shop|info|biz)(?:/\S*)?)"
PHONE_PATTERN = r"(?:\d{2,3}-\d{3,4}-\d{4}|\d{10,11})"
MONEY_PATTERN_KRW = r"\d+[,\d]*\s?(?:만원권|만원|천원|억원|원|KRW|USD|\$)"
MONEY_PATTERN_USD_PREFIX = r"\$\s?\d+[,\d]*"
MONEY_PATTERN_USD_SUFFIX = r"\d+[,\d]*\s?\$"
WEB_SEND_PATTERN = r"\[?\s*(?:web|WEB|Web)\s*발신\s*\]?"
FOREIGN_SEND_PATTERN = r"\[?\s*(?:국외|국제)\s*발신\s*\]?"

DEFAULT_KEYWORDS = [
    "당첨", "축하", "무료", "선물", "이벤트", "쿠폰", "할인",
    "긴급", "확인", "클릭", "지급", "수령", "환급", "지원금",
    "택배", "배송", "반송", "통관",
    "결제", "승인", "취소", "정지", "차단", "해지",
    "본인인증", "계정", "비밀번호", "보안",
    "vip", "코인", "급등주", "투자", "대출",
]


def extract_urls(text: str) -> list[str]:
    return re.findall(URL_PATTERN, text, flags=re.IGNORECASE)


def extract_phones(text: str) -> list[str]:
    return re.findall(PHONE_PATTERN, text)


def extract_money(text: str) -> list[str]:
    matches = []
    matches.extend(re.findall(MONEY_PATTERN_KRW, text))
    matches.extend(re.findall(MONEY_PATTERN_USD_PREFIX, text))
    matches.extend(re.findall(MONEY_PATTERN_USD_SUFFIX, text))
    return matches


def has_web_sender(text: str) -> bool:
    return bool(re.search(WEB_SEND_PATTERN, text, flags=re.IGNORECASE))


def has_foreign_sender(text: str) -> bool:
    return bool(re.search(FOREIGN_SEND_PATTERN, text))


def count_special_keywords(text: str, keywords: list[str] = None) -> int:
    keywords = keywords or DEFAULT_KEYWORDS
    text_lower = text.lower()
    return sum(1 for kw in keywords if kw.lower() in text_lower)


def clean_for_model(text: str) -> str:
    """텍스트를 모델 입력 형태로 정제."""
    text = str(text)
    text = re.sub(r"\\n", " ", text)
    text = re.sub(r"\\r", " ", text)
    text = re.sub(r"\\t", " ", text)
    text = re.sub(r"[\n\r\t]+", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    text = re.sub(WEB_SEND_PATTERN, " ", text, flags=re.IGNORECASE)
    text = re.sub(FOREIGN_SEND_PATTERN, " <FOREIGN_SEND> ", text)
    text = re.sub(URL_PATTERN, " <URL> ", text, flags=re.IGNORECASE)
    text = re.sub(PHONE_PATTERN, " <PHONE> ", text)
    text = re.sub(MONEY_PATTERN_KRW, " <MONEY> ", text)
    text = re.sub(MONEY_PATTERN_USD_PREFIX, " <MONEY> ", text)
    text = re.sub(MONEY_PATTERN_USD_SUFFIX, " <MONEY> ", text)
    text = re.sub(r"\d{8,}", " <NUM> ", text)
    text = re.sub(r"([!?~])\1{2,}", r"\1\1", text)
    text = re.sub(r"(★)\1+", r"\1", text)
    text = re.sub(r"(☆)\1+", r"\1", text)
    text = re.sub(
        r"[^\w\s가-힣<>\[\]\(\)\.\,\!\?\:\-\/~★☆]",
        " ",
        text,
    )
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def build_labeled_record(record: dict) -> dict:
    """raw 레코드를 labeled 형태로 변환.

    스키마 문서의 Stage 1-B 포맷.
    """
    source_text = record.get("text", "")
    if not isinstance(source_text, str):
        source_text = str(source_text)

    urls = extract_urls(source_text)
    phones = extract_phones(source_text)
    moneys = extract_money(source_text)

    return {
        **record,                                    # id, received_at, source 보존
        "source_text": source_text,
        "text": clean_for_model(source_text),
        "from_web": 1 if has_web_sender(source_text) else 0,
        "from_foreign": 1 if has_foreign_sender(source_text) else 0,
        "has_url": 1 if urls else 0,
        "url": urls,
        "has_phone": 1 if phones else 0,
        "phone": phones,
        "has_money": 1 if moneys else 0,
        "money": moneys,
        "special_keyword_count": count_special_keywords(source_text),
    }
