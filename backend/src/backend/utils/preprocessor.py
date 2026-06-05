import re

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
SPECIAL_KEYWORDS = [
    "카지노",
    "놀이터",
    "노리터",
    "토토",
    "환급",
    "잭팟",
    "수수료",
    "프로토",
    "긴급",
    "오늘만",
    "코인",
    "에볼",
    "MGM",
    "바카라",
    "슬롯",
    "먹튀",
    "파워볼",
    "스포츠베팅",
    "성인방송",
    "만남사이트",
    "조건만남",
    "헤라",
    "쩜컴",
    "쩜넷",
    "VIP",
    "이벤트 당첨",
    "무료체험",
    "무료 체험",
    "한정수량",
    "한정 수량",
    "특가",
    "할인",
    "쿠폰",
    "사은품",
    "증정",
    "무료배송",
    "무료 배송",
    "이벤트",
    "당첨",
    "선착순",
    "마감임박",
    "기간한정",
    "기간 한정",
    "최저가",
    "혜택",
    "포인트 지급",
    "저금리",
    "무직자대출",
    "무직자 대출",
    "당일입금",
    "당일 입금",
    "사채",
    "작업대출",
    "작업 대출",
    "신용불량",
    "신용 불량",
    "대환대출",
    "대환 대출",
    "소액대출",
    "소액 대출",
    "급전",
    "비상금대출",
    "비상금 대출",
    "무서류",
    "무방문",
    "연체자",
    "개인돈",
    "월변",
    "일수",
    "대출승인",
    "대출 승인",
]


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
    # 이메일 도메인이 URL로 잘못 추출되는 것을 방지
    text_without_emails = _email_pattern.sub(" ", text)

    return {
        "urls": _dedupe_preserve_order(url_pattern.findall(text_without_emails)),
        "phones": _dedupe_preserve_order(phone_pattern.findall(text)),
        "keywords": _dedupe_preserve_order(smishing_keyword_pattern.findall(text)),
    }


url_pattern = re.compile(
    r"(?:https?://\S+|www\.\S+|(?<!@)(?:[a-zA-Z0-9가-힣-]+\.)+(?:com|net|org|kr|co\.kr|go\.kr|or\.kr|ne\.kr|io|ai|ly|me|cc|xyz|top|site|shop|info|biz)(?:/\S*)?)",
    re.IGNORECASE,
)
phone_pattern = re.compile(r"(?<!\d)(?:\d{2,3}-\d{3,4}-\d{4}|\d{4}-\d{4}|\d{10,11})(?!\d)")
_ssn_pattern = re.compile(r"(?<!\d)\d{6}-\d{7}(?!\d)")
_account_pattern = re.compile(r"(?<!\d)\d{3,6}-\d{2,6}-\d{5,8}(?!\d)")
_card_pattern = re.compile(r"(?<!\d)\d{4}-\d{4}-\d{4}-\d{4}(?!\d)")
_email_pattern = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")

money_pattern = re.compile(
    r"\d+[,\d]*\s?(?:만원권|만원|천원|억원|원|KRW|USD|\$)|\$\s?\d+[,\d]*|\d+[,\d]*\s?\$",
    re.IGNORECASE,
)
foreign_pattern = re.compile(r"\[?\s*(국외|국제)\s*발신\s*\]?")
external_contact_pattern = re.compile(
    r"(?:카톡|카카오|텔레그램|telegram|whatsapp|라인|line|위챗|wechat|인스타|instagram|페이스북|facebook)\s*(?:ID|id|아이디)?\s*[:：]\s*\S+(?:\s+\w+\.(?:net|com|org|kr))?",
    re.IGNORECASE,
)
kw_pattern = re.compile("|".join(re.escape(k) for k in set(SPECIAL_KEYWORDS)))


def clean_for_model(text):
    text = str(text)
    text = re.sub(r"[\n\r\t]+", " ", text)
    text = re.sub(r"\s+", " ", text).strip()

    text = re.sub(
        r"\[?\s*(web|WEB|Web)\s*발신\s*\]?",
        " ",
        text,
        flags=re.IGNORECASE,
    )

    text = re.sub(r"\[?\s*(국외|국제)\s*발신\s*\]?", " <FOREIGN_SEND> ", text)

    # 개인정보 마스킹: 이메일 → SSN → 카드번호 → 계좌번호 → URL → 전화번호 순 (패턴 겹침 방지)
    text = _email_pattern.sub(" <EMAIL> ", text)
    text = _ssn_pattern.sub(" <SSN> ", text)
    text = _card_pattern.sub(" <CARD> ", text)
    text = _account_pattern.sub(" <ACCOUNT> ", text)
    text = url_pattern.sub(" <URL> ", text)
    text = phone_pattern.sub(" <PHONE> ", text)

    text = re.sub(
        r"\d+[,\d]*\s?(만원권|만원|천원|억원|원|KRW|USD|\$)", " <MONEY> ", text
    )
    text = re.sub(r"\$\s?\d+[,\d]*", " <MONEY> ", text)
    text = re.sub(r"\d+[,\d]*\s?\$", " <MONEY> ", text)

    text = re.sub(r"\d{8,}", " <NUM> ", text)

    text = re.sub(r"([!?~])\1{2,}", r"\1\1", text)
    text = re.sub(r"(★)\1+", r"\1", text)
    text = re.sub(r"(☆)\1+", r"\1", text)

    text = re.sub(r"[^\w\s가-힣<>\[\]\(\)\.\,\!\?\:\-\/~★☆]", " ", text)

    text = re.sub(r"\s+", " ", text)

    return text.strip()
