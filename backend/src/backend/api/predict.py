from fastapi import APIRouter

from ..schemas.predict_api import PredictRequest, PredictResponse

router = APIRouter(prefix="/predict")


@router.post("", response_model=PredictResponse)
async def predict_sms_message(request: PredictRequest):
    """
    프론트엔드의 predictSmishing() 함수와 호환되는 테스트용 API.
    normalizeApiResult()에서 그대로 병합할 수 있는 형식으로 반환한다.
    TODO: 이제 모델에서 가져와서 결과를 꾸민 후 반환하게 수정
    """

    return {
        "inputText": request.message,
        "riskScore": 82,
        "riskLevel": "위험",
        "impersonationType": "택배 사칭형",
        "suspiciousEvidence": [
            "외부 링크 또는 짧은 주소로 이동을 유도합니다.",
            "빠른 행동을 요구하는 긴급 표현이 포함되어 있습니다.",
            "배송 문제를 이유로 확인 행동을 요구합니다.",
        ],
        "recommendedActions": [
            "문자 안의 링크나 첨부파일을 열지 마세요.",
            "기존에 알고 있던 공식 연락처로 직접 확인하세요.",
            "인증번호나 비밀번호를 입력하지 마세요.",
        ],
        "familyCheckMessage": (
            "확인 부탁해요. 이 문자는 위험 단계의 스미싱 가능성이 높아 보여요. "
            "링크를 열거나 개인정보를 입력하지 않고 공식 연락처로 먼저 확인하겠습니다."
        ),
        "explanation": (
            "스미싱 가능성이 높아요. "
            """택배 관련 표현과 링크 유도, 긴급성이 함께 나타나
            전형적인 택배 사칭형 패턴과 유사합니다."""
        ),
        "highlightedTerms": [
            "택배",
            "오늘",
            "링크",
        ],
        "factorScores": [
            {"label": "링크 유도", "score": 85},
            {"label": "긴급성", "score": 72},
            {"label": "금전 요구", "score": 16},
            {"label": "개인정보 요구", "score": 18},
        ],
    }
