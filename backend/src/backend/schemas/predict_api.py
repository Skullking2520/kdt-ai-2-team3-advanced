# POST predict api에 대한 스키마
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

AnalysisType = Literal["sms", "url", "image"]
RiskLevel = Literal["high", "medium", "low"]
ActionPriority = Literal["critical", "high", "normal"]


class PredictRequest(BaseModel):
    type: AnalysisType = "sms"
    content: str
    sender: Optional[str] = None
    receivedAt: Optional[str] = None
    allowTrainingUse: Optional[bool] = False


class DetectionReason(BaseModel):
    code: str
    label: str
    severity: RiskLevel
    matched: bool


class ActionGuideItem(BaseModel):
    priority: ActionPriority
    action: str
    detail: Optional[str] = None


class SimilarCase(BaseModel):
    id: str
    title: str
    similarity: int
    year: str
    category: str


class GovernmentCriterion(BaseModel):
    id: str
    label: str
    matched: bool


class PredictResponse(BaseModel):
    id: str
    type: AnalysisType
    content: str
    riskLevel: RiskLevel
    riskScore: int
    smishingType: str
    reasons: List[DetectionReason]
    actionGuide: List[ActionGuideItem]
    similarCases: List[SimilarCase]
    governmentCriteria: List[GovernmentCriterion]
    modelVersion: str
    processingTime: int
    cacheHit: bool
    createdAt: str
    extractedUrl: Optional[str] = None


class EncoderClassificationOutput(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    label: str = Field(min_length=1)
    score: float = Field(ge=0, le=1)
