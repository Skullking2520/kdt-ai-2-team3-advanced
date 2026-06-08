from pydantic import BaseModel, Field
from typing import Any

class VectorUpsertRequest(BaseModel):
    documents: list[str] = Field(..., min_length=1)
    metadatas: list[dict[str, Any]] | None = None
    ids: list[str] | None = None


class VectorRetrieveRequest(BaseModel):
    query: str = Field(..., min_length=1)
    k: int = Field(default=3, ge=1, le=20)