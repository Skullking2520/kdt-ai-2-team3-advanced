from typing import List, Optional

from pydantic import BaseModel

from .predict_api import AnalysisType, PredictResponse, RiskLevel


class HistoryItem(BaseModel):
    id: str
    type: AnalysisType
    content: str
    riskLevel: RiskLevel
    riskScore: int
    smishingType: str
    sender: Optional[str] = None
    createdAt: str


class PaginatedHistoryResponse(BaseModel):
    items: List[HistoryItem]
    total: int
    page: int
    pageSize: int
    hasMore: bool
