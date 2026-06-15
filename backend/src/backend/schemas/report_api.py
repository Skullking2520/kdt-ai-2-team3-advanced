from typing import Optional

from pydantic import BaseModel


class ReportRequest(BaseModel):
    type: str                           # "sms" | "url" | "image"
    content: str                        # 신고할 문자 내용
    category: Optional[str] = None     # 사용자가 선택한 스미싱 유형
    sender: Optional[str] = None       # 발신번호
    url: Optional[str] = None          # 포함된 URL
    notes: Optional[str] = None        # 추가 메모
    agreeShare: Optional[bool] = False # 학습 데이터 공유 동의


class ReportResponse(BaseModel):
    receiptId: str    # 접수 번호 (예: NB20260608-001234)
    status: str       # "received"
    createdAt: str    # ISO8601
