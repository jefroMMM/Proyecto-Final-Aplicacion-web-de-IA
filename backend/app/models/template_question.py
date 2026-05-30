import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class TemplateQuestion(Base):
    __tablename__ = "template_questions"
    __table_args__ = (
        CheckConstraint(
            "difficulty IN ('easy', 'medium', 'hard')",
            name="ck_template_questions_difficulty",
        ),
    )

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
    requirement_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("template_requirements.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    expected_answer: Mapped[str] = mapped_column(Text, nullable=False)
    difficulty: Mapped[str] = mapped_column(String(20), default="medium", nullable=False)
    points: Mapped[float] = mapped_column(Numeric(10, 2), default=1, nullable=False)
    is_required: Mapped[bool] = mapped_column(default=True, nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    template: Mapped["InterviewTemplate"] = relationship(back_populates="questions")
    requirement: Mapped["TemplateRequirement | None"] = relationship(back_populates="questions")
    answers: Mapped[list["InterviewAnswer"]] = relationship(back_populates="question")
