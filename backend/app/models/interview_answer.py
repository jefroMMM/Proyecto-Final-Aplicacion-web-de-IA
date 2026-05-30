import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Numeric, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class InterviewAnswer(Base):
    __tablename__ = "interview_answers"
    __table_args__ = (
        CheckConstraint(
            "evaluation_status IN ('correct', 'partially_correct', 'incorrect', 'unknown')",
            name="ck_interview_answers_evaluation_status",
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
        index=True,
        nullable=False,
    )
    question_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("template_questions.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    transcript_text: Mapped[str] = mapped_column(Text, nullable=False)
    evaluation_status: Mapped[str] = mapped_column(nullable=False)
    base_question_score: Mapped[float] = mapped_column(Numeric(10, 2), default=0, nullable=False)
    bonus_score: Mapped[float] = mapped_column(Numeric(10, 2), default=0, nullable=False)
    final_question_score: Mapped[float] = mapped_column(Numeric(10, 2), default=0, nullable=False)
    feedback: Mapped[str] = mapped_column(Text, default="", nullable=False)
    reason: Mapped[str] = mapped_column(Text, default="", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    interview: Mapped["Interview"] = relationship(back_populates="answers")
    question: Mapped["TemplateQuestion"] = relationship(back_populates="answers")
