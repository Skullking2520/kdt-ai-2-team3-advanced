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


class GovernmentCriterion(BaseModel):
    id: str
    label: str
    matched: bool


class SslInfo(BaseModel):
    valid: bool
    issuer: str
    expiry: str


class UrlFlag(BaseModel):
    type: str
    desc: str
    severity: RiskLevel


class VtVerdict(BaseModel):
    """VirusTotal last_analysis_stats + 상태 — 사용자 URL 응답에 동기로 채움"""
    malicious: int
    suspicious: int
    harmless: int
    undetected: int
    timeout: int = 0
    total: int
    status: Literal["pending", "completed", "failed", "not_checked"]
    lastCheckedAt: Optional[str] = None


class UrlMetaDetails(BaseModel):
    """VirusTotal 응답의 부가 메타 — categories / tags / http / server / dates"""
    categories: dict = Field(default_factory=dict)
    tags: List[str] = Field(default_factory=list)
    lastHttpStatus: Optional[int] = None
    lastHttpContentType: Optional[str] = None
    lastHttpServer: Optional[str] = None
    ipCountry: Optional[str] = None
    lastAnalysisDate: Optional[str] = None
    firstSubmissionDate: Optional[str] = None


class UrlDetails(BaseModel):
    domain: str
    ssl: SslInfo
    domainAge: int
    redirects: List[dict]
    ipCountry: str
    similarDomains: List[str]
    flags: List[UrlFlag]
    vtVerdict: Optional[VtVerdict] = None
    metaDetails: Optional[UrlMetaDetails] = None


class PredictResponse(BaseModel):
    id: str
    type: AnalysisType
    content: str
    riskLevel: RiskLevel
    riskScore: int
    smishingType: str
    reasons: List[DetectionReason]
    actionGuide: List[ActionGuideItem]
    governmentCriteria: List[GovernmentCriterion]
    modelVersion: str
    processingTime: int
    cacheHit: bool
    createdAt: str
    extractedUrl: Optional[str] = None
    urlDetails: Optional[UrlDetails] = None


class EncoderClassificationOutput(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    label: str = Field(min_length=1)
    score: float = Field(ge=0, le=1)
