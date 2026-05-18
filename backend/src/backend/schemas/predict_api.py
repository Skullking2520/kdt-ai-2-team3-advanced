# POST predict api에 대한 스키마
from typing import List, Optional

from pydantic import BaseModel


# 요청 바디 스키마 (프론트엔드에서 { message, allowTrainingUse } 전송)
class PredictRequest(BaseModel):
    message: str
    allowTrainingUse: Optional[bool] = False


# 응답 스키마 (normalizeApiResult()가 기대하는 구조)
class FactorScore(BaseModel):
    label: str
    score: int


class PredictResponse(BaseModel):
    inputText: str
    riskScore: int
    riskLevel: str
    impersonationType: str
    suspiciousEvidence: List[str]
    recommendedActions: List[str]
    familyCheckMessage: str
    explanation: str
    highlightedTerms: List[str]
    factorScores: List[FactorScore]
