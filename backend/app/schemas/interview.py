import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas.document import DocumentRead
from app.schemas.report import ReportRead
from app.schemas.transcript import TranscriptRead
from app.schemas.user import UserCreate, UserRead


class InterviewCreate(BaseModel):
    user_id: uuid.UUID | None = None
    user: UserCreate | None = None
    candidate_name: str = Field(min_length=1, max_length=160)
    job_title: str = Field(min_length=1, max_length=180)

    @model_validator(mode="after")
    def validate_user_source(self) -> "InterviewCreate":
        if self.user_id is None and self.user is None:
            raise ValueError("Provide either user_id or user")
        if self.user_id is not None and self.user is not None:
            raise ValueError("Provide only one of user_id or user")
        return self


class InterviewRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    template_id: uuid.UUID | None = None
    candidate_name: str
    candidate_email: str | None = None
    job_title: str
    status: str
    initial_cv_score: float = 0
    question_score: float = 0
    bonus_score: float = 0
    final_score: float = 0
    max_score: float = 0
    created_at: datetime
    updated_at: datetime


class InterviewDetailRead(InterviewRead):
    user: UserRead
    documents: list[DocumentRead] = Field(default_factory=list)
    transcripts: list[TranscriptRead] = Field(default_factory=list)
    report: ReportRead | None = None
