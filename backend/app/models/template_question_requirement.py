import uuid

from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class TemplateQuestionRequirement(Base):
    __tablename__ = "template_question_requirements"
    __table_args__ = (
        UniqueConstraint(
            "question_id",
            "requirement_id",
            name="uq_template_question_requirement",
        ),
    )

    question_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("template_questions.id", ondelete="CASCADE"),
        primary_key=True,
    )
    requirement_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("template_requirements.id", ondelete="CASCADE"),
        primary_key=True,
    )
template_question_requirements_table = TemplateQuestionRequirement.__table__
