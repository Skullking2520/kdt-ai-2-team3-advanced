from typing import Optional

from pydantic import BaseModel, Field


class ReportRequest(BaseModel):
    # 입력 길이 제한 (남용·대용량 페이로드 방어)
    type: str = Field(max_length=10)                          # "sms" | "url" | "image"
    content: str = Field(max_length=2000)                     # 신고할 문자 내용
    category: Optional[str] = Field(default=None, max_length=50)   # 사용자가 선택한 스미싱 유형
    sender: Optional[str] = Field(default=None, max_length=50)     # 발신번호
    url: Optional[str] = Field(default=None, max_length=2000)      # 포함된 URL
    notes: Optional[str] = Field(default=None, max_length=1000)    # 추가 메모
    agreeShare: Optional[bool] = False                        # 학습 데이터 공유 동의


class ReportResponse(BaseModel):
    receiptId: str    # 접수 번호 (예: NB20260608-001234)
    status: str       # "received"
    createdAt: str    # ISO8601
