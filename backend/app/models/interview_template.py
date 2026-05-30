import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class InterviewTemplate(Base):
    __tablename__ = "interview_templates"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    title: Mapped[str] = mapped_column(String(180), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    role_name: Mapped[str] = mapped_column(String(180), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    requirements: Mapped[list["TemplateRequirement"]] = relationship(
        back_populates="template",
        cascade="all, delete-orphan",
        order_by="TemplateRequirement.created_at",
    )
    questions: Mapped[list["TemplateQuestion"]] = relationship(
        back_populates="template",
        cascade="all, delete-orphan",
        order_by="TemplateQuestion.order_index",
    )
    interviews: Mapped[list["Interview"]] = relationship(back_populates="template")
