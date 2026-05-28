import uuid
from typing import Literal

from pydantic import BaseModel, Field

SourceType = Literal["cv", "job_description"]


class RagSearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=4000)
    source_type: SourceType | None = None
    top_k: int = Field(default=5, ge=1, le=20)


class RagSearchResult(BaseModel):
    chunk_text: str
    source_type: SourceType
    score: float
    metadata: dict


class RagSearchResponse(BaseModel):
    results: list[RagSearchResult]


class RagReindexResponse(BaseModel):
    interview_id: uuid.UUID
    documents_processed: int
    chunks_indexed: int
