import hashlib
from urllib.parse import urlsplit, urlunsplit

TRAILING_URL_PUNCTUATION = ".,;:!?\"'"
TRAILING_BRACKETS = {")": "(", "]": "[", "}": "{"}


def hash_value(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _strip_trailing_message_punctuation(value: str) -> str:
    normalized = value.rstrip(TRAILING_URL_PUNCTUATION)
    while normalized and normalized[-1] in TRAILING_BRACKETS:
        closing = normalized[-1]
        opening = TRAILING_BRACKETS[closing]
        if normalized.count(closing) <= normalized.count(opening):
            break
        normalized = normalized[:-1].rstrip(TRAILING_URL_PUNCTUATION)
    return normalized


def normalize_url(url: str) -> str:
    value = _strip_trailing_message_punctuation(url.strip())
    if not value:
        return ""

    has_scheme = "://" in value
    parsed = urlsplit(value if has_scheme else f"https://{value}")
    normalized = urlunsplit(
        (
            parsed.scheme.lower(),
            parsed.netloc.lower(),
            parsed.path,
            parsed.query,
            "",
        )
    )
    return normalized
