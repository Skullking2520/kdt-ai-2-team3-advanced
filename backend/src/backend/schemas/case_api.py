from typing import List, Optional

from pydantic import BaseModel

from .predict_api import RiskLevel


class CaseStudy(BaseModel):
    id: str
    year: str
    title: str
    category: str
    damage: str
    victims: str
    method: str
    actualTexts: List[str]
    redFlags: List[str]
    prevention: List[str]
    outcome: str
    severity: RiskLevel
    arrested: bool


class PaginatedCaseStudyResponse(BaseModel):
    items: List[CaseStudy]
    total: int
    page: int
    pageSize: int
    hasMore: bool
