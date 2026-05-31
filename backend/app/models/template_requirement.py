import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.template_question_requirement import template_question_requirements_table


class TemplateRequirement(Base):
    __tablename__ = "template_requirements"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    template_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("interview_templates.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    skill_name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    weight: Mapped[float] = mapped_column(Numeric(10, 2), default=1, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    template: Mapped["InterviewTemplate"] = relationship(back_populates="requirements")
    questions: Mapped[list["TemplateQuestion"]] = relationship(back_populates="requirement")
    related_questions: Mapped[list["TemplateQuestion"]] = relationship(
        secondary=template_question_requirements_table,
        back_populates="related_requirements",
    )
    skill_matches: Mapped[list["CandidateSkillMatch"]] = relationship(
        back_populates="requirement",
        cascade="all, delete-orphan",
    )
