import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    interview_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("interviews.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False,
    )
    report_json: Mapped[dict] = mapped_column(JSONB, nullable=False)
    technical_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    communication_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    seniority_estimation: Mapped[str] = mapped_column(String(80), default="unknown", nullable=False)
    recommendation: Mapped[str] = mapped_column(Text, default="needs_review", nullable=False)
    final_score: Mapped[float] = mapped_column(Numeric(10, 2), default=0, nullable=False)
    max_score: Mapped[float] = mapped_column(Numeric(10, 2), default=0, nullable=False)
    percentage: Mapped[float] = mapped_column(Numeric(10, 2), default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    interview: Mapped["Interview"] = relationship(back_populates="report")
