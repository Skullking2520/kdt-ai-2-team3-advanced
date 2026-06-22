# POST predict api에 대한 스키마
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator

AnalysisType = Literal["sms", "url", "image"]
RiskLevel = Literal["high", "medium", "low"]
ActionPriority = Literal["critical", "high", "normal"]

# 입력 길이 상한 (남용·대용량 페이로드 방어)
MAX_CONTENT_BYTES = 7_000_000  # image base64 절대 상한 (~5MB 이미지)
MAX_TEXT_LEN = 2000            # sms/url 텍스트 상한


class PredictRequest(BaseModel):
    type: AnalysisType = "sms"
    content: str = Field(max_length=MAX_CONTENT_BYTES)
    sender: Optional[str] = Field(default=None, max_length=50)
    receivedAt: Optional[str] = Field(default=None, max_length=50)
    imageId: Optional[str] = Field(default=None, max_length=100)
    allowTrainingUse: Optional[bool] = False

    @model_validator(mode="after")
    def _limit_text_content(self):
        # image는 base64라 길지만, sms/url은 텍스트이므로 짧게 제한
        if self.type in ("sms", "url") and len(self.content) > MAX_TEXT_LEN:
            raise ValueError(f"sms/url content는 최대 {MAX_TEXT_LEN}자입니다.")
        return self


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
