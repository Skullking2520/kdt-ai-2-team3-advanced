import re

url_pattern = re.compile(
    r"(?:https?://\S+|www\.\S+|(?:[a-zA-Z0-9-]+\.)+(?:com|net|org|kr|co\.kr|go\.kr|or\.kr|ne\.kr|io|ai|ly|me|cc|xyz|top|site|shop|info|biz)(?:/\S*)?)",
    re.IGNORECASE,
)
phone_pattern = re.compile(r"(?:\d{2,3}-\d{3,4}-\d{4}|\d{10,11})")

smishing_keywords = [
    "국외발신",
    "국제발신",
    "해외발신",
    "배송",
    "택배",
    "운송장",
    "주소지",
    "주소불명",
    "미배송",
    "반송",
    "통관",
    "관세",
    "과태료",
    "범칙금",
    "미납",
    "체납",
    "연체",
    "결제",
    "승인",
    "출금",
    "입금",
    "환불",
    "보상",
    "지원금",
    "대출",
    "저금리",
    "인증",
    "본인확인",
    "계정",
    "정지",
    "차단",
    "로그인",
    "비밀번호",
    "인증번호",
    "개인정보",
    "보안",
    "검찰",
    "경찰",
    "금감원",
    "금융감독원",
    "국세청",
    "건보",
    "건강보험",
    "청첩장",
    "부고",
    "초대장",
    "모바일",
    "앱설치",
    "설치",
    "확인바랍니다",
    "즉시",
    "긴급",
    "오늘까지",
    "클릭",
    "링크",
]
smishing_keyword_pattern = re.compile(
    "|".join(
        re.escape(keyword)
        for keyword in sorted(smishing_keywords, key=len, reverse=True)
    ),
    re.IGNORECASE,
)


def _dedupe_preserve_order(values):
    seen = set()
    result = []
    for value in values:
        normalized = value.strip()
        if not normalized:
            continue

        key = normalized.lower()
        if key in seen:
            continue

        seen.add(key)
        result.append(normalized)

    return result


def extract_static_patterns(text):
    text = str(text)

    return {
        "urls": _dedupe_preserve_order(url_pattern.findall(text)),
        "phones": _dedupe_preserve_order(phone_pattern.findall(text)),
        "keywords": _dedupe_preserve_order(smishing_keyword_pattern.findall(text)),
    }


def clean_for_model(text):
    # 입력을 문자열로 변환합니다.
    text = str(text)

    # 줄바꿈, 탭 등 공백 문자를 일반 공백(스페이스) 한 칸으로 바꿉니다.
    text = re.sub(r"[\n\r\t]+", " ", text)

    # 연속된 공백을 한 칸으로 줄이고 앞뒤 공백을 제거합니다.
    text = re.sub(r"\s+", " ", text).strip()

    # '[web발신]', 'Web 발신' 등 대소문자 구분 없이 웹 발신 문구를 지웁니다.
    text = re.sub(
        r"\[?\s*(web|WEB|Web)\s*발신\s*\]?",
        " ",
        text,
        flags=re.IGNORECASE,
    )

    # '[국외발신]', '국제 발신' 등 문구를 특정 토큰(<FOREIGN_SEND>)으로 바꿉니다.
    text = re.sub(r"\[?\s*(국외|국제)\s*발신\s*\]?", " <FOREIGN_SEND> ", text)

    # 링크나 웹사이트 주소를 특정 토큰(<URL>)으로 바꿉니다.
    text = url_pattern.sub(" <URL> ", text)

    # 전화번호 형태의 숫자를 특정 토큰(<PHONE>)으로 바꿉니다.
    phone_pattern.sub(" <PHONE> ", text)

    # 숫자 뒤에 원화나 달러 단위가 붙은 금액 표현을 특정 토큰(<MONEY>)으로 바꿉니다.
    text = re.sub(
        r"\d+[,\d]*\s?(만원권|만원|천원|억원|원|KRW|USD|\$)", " <MONEY> ", text
    )

    # '$100'처럼 숫자 앞에 달러 기호가 붙은 금액을 특정 토큰(<MONEY>)으로 바꿉니다.
    text = re.sub(r"\$\s?\d+[,\d]*", " <MONEY> ", text)

    # '100$'처럼 숫자 뒤에 달러 기호가 붙은 금액을 특정 토큰(<MONEY>)으로 바꿉니다.
    text = re.sub(r"\d+[,\d]*\s?\$", " <MONEY> ", text)

    # 계좌번호나 카드번호 형태의 8자리 이상 연속된 숫자를 특정 토큰(<NUM>)으로 바꿉니다.
    text = re.sub(r"\d{8,}", " <NUM> ", text)

    # 느낌표, 물음표, 물결표가 3번 이상 반복되면 2번으로 줄입니다. (예: !!! -> !!)
    text = re.sub(r"([!?~])\1{2,}", r"\1\1", text)

    # 검은 별(★)이 여러 개 연속되면 1개로 줄입니다.
    text = re.sub(r"(★)\1+", r"\1", text)

    # 흰 별(☆)이 여러 개 연속되면 1개로 줄입니다.
    text = re.sub(r"(☆)\1+", r"\1", text)

    # 지정한 문자(한글, 알파벳, 숫자, 특수 기호 등)를 제외한
    # 모든 문자를 공백으로 바꿉니다.
    text = re.sub(r"[^\w\s가-힣<>\[\]\(\)\.\,\!\?\:\-\/~★☆]", " ", text)

    # 정제 과정에서 생긴 연속된 공백을 다시 한 칸으로 줄입니다.
    text = re.sub(r"\s+", " ", text)

    # 최종 텍스트의 앞뒤 공백을 제거하고 반환합니다.
    return text.strip()
