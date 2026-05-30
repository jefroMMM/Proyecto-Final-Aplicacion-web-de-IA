import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ReportRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    interview_id: uuid.UUID
    report_json: dict[str, Any]
    technical_score: int = Field(ge=0, le=100)
    communication_score: int = Field(ge=0, le=100)
    seniority_estimation: str
    recommendation: str
    final_score: float = 0
    max_score: float = 0
    percentage: float = 0
    created_at: datetime
