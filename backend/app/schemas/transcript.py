import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict


TranscriptRole = Literal["interviewer", "candidate"]


class TranscriptRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    interview_id: uuid.UUID
    role: TranscriptRole
    content: str
    audio_url: str | None = None
    created_at: datetime
