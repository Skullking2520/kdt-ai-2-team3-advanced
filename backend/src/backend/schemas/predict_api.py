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
    imageId: Optional[str] = None
    allowTrainingUse: Optional[bool] = False


class DetectionReason(BaseModel):
    code: str
    label: str
    severity: RiskLevel
    matched: bool


class ActionGuideContact(BaseModel):
    name: str
    number: str


class ActionGuideItem(BaseModel):
    priority: ActionPriority
    action: str
    detail: Optional[str] = None
    contact: Optional[ActionGuideContact] = None


class SimilarCase(BaseModel):
    id: str
    title: str
    similarity: int
    year: str
    category: str
    preview: Optional[str] = None


class DamageStep(BaseModel):
    step: int
    icon: Literal["message", "click", "site", "info", "damage"]
    title: str
    description: str


class SslInfo(BaseModel):
    valid: bool
    issuer: str
    expiry: str


class UrlFlag(BaseModel):
    type: str
    desc: str
    severity: RiskLevel


class UrlDetails(BaseModel):
    domain: str
    ssl: SslInfo
    domainAge: int
    redirects: List[dict]
    ipCountry: str
    similarDomains: List[str]
    flags: List[UrlFlag]


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
    damageScenario: Optional[List[DamageStep]] = None
    modelVersion: str
    processingTime: Optional[int] = None
    cacheHit: Optional[bool] = None
    createdAt: str
    senderNumber: Optional[str] = None
    extractedUrl: Optional[str] = None
    urlAnalysis: Optional[UrlDetails] = None
    urlDetails: Optional[UrlDetails] = None
    ocrText: Optional[str] = None
    imageId: Optional[str] = None
    imageUrl: Optional[str] = None


class EncoderClassificationOutput(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    label: str = Field(min_length=1)
    score: float = Field(ge=0, le=1)
