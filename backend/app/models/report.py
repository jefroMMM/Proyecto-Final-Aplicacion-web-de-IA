import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Report(Base):
    __tablename__ = "reports"
    __table_args__ = (
        CheckConstraint(
            "technical_score >= 0 AND technical_score <= 100",
            name="ck_reports_technical_score",
        ),
        CheckConstraint(
            "communication_score >= 0 AND communication_score <= 100",
            name="ck_reports_communication_score",
        ),
    )

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
    technical_score: Mapped[int] = mapped_column(Integer, nullable=False)
    communication_score: Mapped[int] = mapped_column(Integer, nullable=False)
    seniority_estimation: Mapped[str] = mapped_column(String(80), nullable=False)
    recommendation: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    interview: Mapped["Interview"] = relationship(back_populates="report")
