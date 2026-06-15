from pydantic import BaseModel, Field
from typing import List
from chromadb.api.types import Metadata

class VectorUpsertRequest(BaseModel):
    documents: list[str] = Field(..., min_length=1)
    metadatas: List[Metadata] | None = None
    ids: list[str] | None = None


class VectorRetrieveRequest(BaseModel):
    query: str = Field(..., min_length=1)
    k: int = Field(default=3, ge=1, le=20)