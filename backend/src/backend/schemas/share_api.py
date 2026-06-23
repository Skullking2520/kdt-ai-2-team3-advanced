from typing import Literal

from pydantic import BaseModel


ShareChannel = Literal["link", "kakao", "clipboard"]


class ShareRequest(BaseModel):
    analysisId: str
    channel: ShareChannel


class ShareResponse(BaseModel):
    shareId: str
    shortUrl: str
    expiresAt: str
