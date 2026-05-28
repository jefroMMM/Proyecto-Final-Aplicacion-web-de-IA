import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict


DocumentType = Literal["cv", "job_description"]


class DocumentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    interview_id: uuid.UUID
    document_type: DocumentType
    filename: str
    content_text: str
    created_at: datetime
