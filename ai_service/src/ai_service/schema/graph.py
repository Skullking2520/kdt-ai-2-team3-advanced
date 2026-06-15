from pydantic import BaseModel, Field
from typing import Any, Literal

class GraphInvokeRequest(BaseModel):
    text: str = Field(..., min_length=1, description="SMS 본문 텍스트")
    ocr_text: str | None = Field(default=None, description="이미지 OCR 추출 텍스트")
    route_override: Literal["zero_day", "general"] | None = Field(
        default=None,
        description="로직 테스트용 강제 라우팅 값",
    )


class GraphInvokeResponse(BaseModel):
    final_output: str
    parsed_output: dict[str, Any] | None = None
    context: str | None = None
    route_override: str | None = None


