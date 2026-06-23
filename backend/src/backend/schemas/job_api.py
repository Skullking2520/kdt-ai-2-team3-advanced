from typing import Literal, Optional

from pydantic import BaseModel


class ApiError(BaseModel):
    code: str
    message: str
    details: Optional[dict[str, object]] = None


class AsyncJob(BaseModel):
    jobId: str
    status: Literal["queued", "processing", "completed", "failed"]
    progress: int
    currentStep: Optional[str] = None
    result: Optional[object] = None
    error: Optional[ApiError] = None
