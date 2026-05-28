import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document
from app.schemas.document import DocumentType


async def create_document(
    session: AsyncSession,
    *,
    interview_id: uuid.UUID,
    document_type: DocumentType,
    filename: str,
    content_text: str,
) -> Document:
    document = Document(
        interview_id=interview_id,
        document_type=document_type,
        filename=filename,
        content_text=content_text,
    )
    session.add(document)
    await session.flush()
    return document


async def list_documents_by_interview_id(
    session: AsyncSession,
    interview_id: uuid.UUID,
) -> list[Document]:
    result = await session.execute(
        select(Document)
        .where(Document.interview_id == interview_id)
        .order_by(Document.created_at.asc())
    )
    return list(result.scalars().all())
