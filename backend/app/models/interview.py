import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Interview(Base):
    __tablename__ = "interviews"
    __table_args__ = (
        CheckConstraint(
            "status IN ('created', 'in_progress', 'completed', 'cancelled')",
            name="ck_interviews_status",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    template_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("interview_templates.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    candidate_name: Mapped[str] = mapped_column(String(160), nullable=False)
    candidate_email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    job_title: Mapped[str] = mapped_column(String(180), nullable=False)
    cv_document_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("documents.id", ondelete="SET NULL"),
        nullable=True,
    )
    status: Mapped[str] = mapped_column(String(40), default="created", nullable=False)
    initial_cv_score: Mapped[float] = mapped_column(Numeric(10, 2), default=0, nullable=False)
    question_score: Mapped[float] = mapped_column(Numeric(10, 2), default=0, nullable=False)
    bonus_score: Mapped[float] = mapped_column(Numeric(10, 2), default=0, nullable=False)
    final_score: Mapped[float] = mapped_column(Numeric(10, 2), default=0, nullable=False)
    max_score: Mapped[float] = mapped_column(Numeric(10, 2), default=0, nullable=False)
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
    archived_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    user: Mapped["User"] = relationship(back_populates="interviews")
    template: Mapped["InterviewTemplate | None"] = relationship(back_populates="interviews")
    documents: Mapped[list["Document"]] = relationship(
        back_populates="interview",
        cascade="all, delete-orphan",
        order_by="Document.created_at",
        foreign_keys="Document.interview_id",
    )
    transcripts: Mapped[list["Transcript"]] = relationship(
        back_populates="interview",
        cascade="all, delete-orphan",
        order_by="Transcript.created_at",
    )
    report: Mapped["Report | None"] = relationship(
        back_populates="interview",
        cascade="all, delete-orphan",
        uselist=False,
    )
    embeddings_metadata: Mapped[list["EmbeddingMetadata"]] = relationship(
        back_populates="interview",
        cascade="all, delete-orphan",
    )
    candidate_skill_matches: Mapped[list["CandidateSkillMatch"]] = relationship(
        back_populates="interview",
        cascade="all, delete-orphan",
    )
    answers: Mapped[list["InterviewAnswer"]] = relationship(
        back_populates="interview",
        cascade="all, delete-orphan",
        order_by="InterviewAnswer.created_at",
    )

    @property
    def is_archived(self) -> bool:
        return self.archived_at is not None
