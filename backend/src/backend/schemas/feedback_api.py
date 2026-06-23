from typing import Optional

from pydantic import BaseModel


class FeedbackRequest(BaseModel):
    analysisId: str
    isCorrect: bool
    userComment: Optional[str] = None
    correctLabel: Optional[str] = None


class FeedbackResponse(BaseModel):
    ok: bool
