from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from ..models.url_candidate import UrlCandidateSource, UrlCandidateStatus


class UrlCandidateReviewRequest(BaseModel):
    reviewer: str = Field(min_length=1, max_length=100)
    note: str | None = Field(default=None, max_length=500)


class UrlCandidateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    url: str
    normalized_url: str
    last_source: UrlCandidateSource
    report_count: int
    model_detection_count: int
    max_confidence: float | None
    description: str | None
    vt_malicious_count: int | None
    vt_suspicious_count: int | None
    vt_total_count: int | None
    vt_last_checked_at: datetime | None
    next_check_at: datetime | None
    vt_last_error: str | None
    status: UrlCandidateStatus
    reviewed_at: datetime | None
    reviewer: str | None
    review_note: str | None
    created_at: datetime
    updated_at: datetime
