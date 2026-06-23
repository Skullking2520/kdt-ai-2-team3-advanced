from typing import List

from pydantic import BaseModel


class OcrBlock(BaseModel):
    text: str
    bbox: list[int]


class OcrRequest(BaseModel):
    image: str


class OcrResponse(BaseModel):
    imageId: str
    text: str
    confidence: float
    blocks: List[OcrBlock]
