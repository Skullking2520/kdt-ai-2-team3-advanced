from pydantic import BaseModel


class ReportRequest(BaseModel):
    type: str
    text: str


class ReportResponse(BaseModel):
    success: bool
