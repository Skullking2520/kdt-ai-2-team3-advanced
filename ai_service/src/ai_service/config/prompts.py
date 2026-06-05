# 프롬프트를 템플릿 객체로 변환해서 다른 노드에서 불러올 수 있게 한다.

from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

# 디코더에서 썼던 few shot 그대로 가져옴
_FEW_SHOT_EXAMPLES = [
    {
        "text": "해외선물 Al인공지능신호 하루 만원씩 실현 잠시후 kakao.opne.s.톡방.com(참여코드: ) 클릭",  # noqa: E501
        "features": "- 특이 사항 없음",
        "answer": (
            "이 문자는 스미싱일 가능성이 높습니다. "
            "의심스러운 링크(kakao.opne.s.톡방.com)를 통해 개인 정보를 요구하거나 "
            "금전적 손실을 초래할 수 있는 위험한 사이트로 유도하려 하기 때문입니다."
        ),
    },
    {
        "text": (
            "Please append margin for your short position of the KAVAUSDT Contracts "
            "to avoid liquidation risks. <URL>"
        ),
        "features": "- 외부 링크 포함: ['https://go.bybit.com/hNXhXxFdmb']",
        "answer": (
            "이 문자가 스미싱일 가능성이 높은 이유는 외부 링크를 통해 "
            "자금 관리 결정을 서두르게 유도하기 때문입니다. "
            "신뢰할 수 없는 링크를 클릭하면 개인 정보나 자산이 위험에 처할 수 있습니다."
        ),
    },
    {
        "text": "[대법원] 귀하의 민사소송 접수 완료. 신속한 대응 필요! 확인 → http://supcourt-kr.com/case",
        "features": "- 외부 링크 포함: ['http://supcourt-kr.com/case']",
        "answer": (
            "이 문자는 공식 기관인 대법원을 사칭하면서 의심스러운 URL로 "
            "개인 정보를 입력하도록 유도하기 때문에 스미싱입니다. "
            "공식 기관은 일반적으로 문자 링크로 정보 확인을 요청하지 않습니다."
        ),
    },
]

# 1. 시스템 프롬프트 원본 텍스트 정의
_ROUTER_SYSTEM_PROMPT = """
당신은 신종 스미싱 패턴에 대한 판단이 필요한지, 아니면 단순히 스미싱 패턴이라면 그 이유를 출력하는 스미싱 탐지 전문가입니다.
반드시 아래의 두 가지 키워드 중 하나로만 답변하세요:
- "ZERODAY_SMISHING_PATTERN": 새로운 스미싱인지 알아보기 위해 최근 스미싱 패턴에 관한 문서 검색이 필요한 경우
- "GENERAL_SMISHING_REASON:: 현재 사용자 질문 내용이 스미싱인 것이 확정이라면, 그 이유만 출력해야 하는 경우
"""

_RAG_ANSWER_SYSTEM_PROMPT = """
당신은 아래에 제공된 [Context]를 바탕으로 사용자의 질문에 대답하는 비서입니다.
반드시 제공된 지식 베이스 정보만을 근거로 답변하고, 알 수 없는 정보라면 솔직하게 모른다고 답변하세요.\

[Context]
{context}"""

# 다른 파일에서 바로 import해서 .invoke()할 수 있는 템플릿 추상화 객체

# 입력 변수가 없는 고정형 판단 프롬프트
ROUTER_PROMPT = ChatPromptTemplate.from_messages([
    ("system", _ROUTER_SYSTEM_PROMPT),
    MessagesPlaceholder(variable_name="messages")
    # 지금까지 대화 내역 통째로 주입
])

# Context와 대화 내역이 동적으로 들어가는 RAG 전용 프롬프트
RAG_ANSWER_PROMPT = ChatPromptTemplate.from_messages([
    ("system", _RAG_ANSWER_SYSTEM_PROMPT),
    MessagesPlaceholder(variable_name="messages")
    # 지금까지 대화 내역 통째로 주입
])

# 간단하게 스미싱 이유만 출력하는 input 변수 하나만 받는 기본 프롬프트
SIMPLE_SMISHING_REASON_PROMPT = ChatPromptTemplate.from_template(
    "당신은 스미싱 이유 분석 전문가입니다. 다음 텍스트의 스미싱 이유를 알려주세요:\n스미싱 텍스트: ${smishing_text}"
)