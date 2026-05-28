import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, func
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
    candidate_name: Mapped[str] = mapped_column(String(160), nullable=False)
    job_title: Mapped[str] = mapped_column(String(180), nullable=False)
    status: Mapped[str] = mapped_column(String(40), default="created", nullable=False)
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

    user: Mapped["User"] = relationship(back_populates="interviews")
    documents: Mapped[list["Document"]] = relationship(
        back_populates="interview",
        cascade="all, delete-orphan",
        order_by="Document.created_at",
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
