import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class CandidateSkillMatch(Base):
    __tablename__ = "candidate_skill_matches"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    interview_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("interviews.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    requirement_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("template_requirements.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    skill_name: Mapped[str] = mapped_column(String(120), nullable=False)
    matched: Mapped[bool] = mapped_column(default=False, nullable=False)
    evidence_text: Mapped[str] = mapped_column(Text, default="", nullable=False)
    score_awarded: Mapped[float] = mapped_column(Numeric(10, 2), default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    interview: Mapped["Interview"] = relationship(back_populates="candidate_skill_matches")
    requirement: Mapped["TemplateRequirement"] = relationship(back_populates="skill_matches")
