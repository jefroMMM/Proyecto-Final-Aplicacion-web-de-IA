import io
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status
from pypdf import PdfReader
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories import documents as document_repository
from app.rag.pipeline import build_rag_pipeline, map_rag_provider_error
from app.schemas.document import DocumentType
from app.schemas.upload import UploadDocumentResponse
from app.services.interview_service import ensure_interview_exists

PDF_CONTENT_TYPES = {"application/pdf"}
TXT_CONTENT_TYPES = {"text/plain", "application/octet-stream"}


async def save_interview_document(
    session: AsyncSession,
    *,
    interview_id: uuid.UUID,
    document_type: DocumentType,
    file: UploadFile,
) -> UploadDocumentResponse:
    await ensure_interview_exists(session, interview_id)

    filename = Path(file.filename or "").name
    if not filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must have a filename",
        )

    content = await file.read()
    text = extract_text_from_upload(
        content=content,
        filename=filename,
        content_type=file.content_type,
        allow_txt=document_type == "job_description",
    )

    document = await document_repository.create_document(
        session,
        interview_id=interview_id,
        document_type=document_type,
        filename=filename,
        content_text=text,
    )

    try:
        rag_pipeline = build_rag_pipeline()
        await rag_pipeline.ingest_document(session, document)
        await session.commit()
    except HTTPException:
        await session.rollback()
        raise
    except Exception as exc:
        await session.rollback()
        raise map_rag_provider_error(exc) from exc

    await session.refresh(document)
    return UploadDocumentResponse(
        document=document,
        extracted_characters=len(text),
    )


def extract_text_from_upload(
    *,
    content: bytes,
    filename: str,
    content_type: str | None,
    allow_txt: bool,
) -> str:
    extension = Path(filename).suffix.lower()

    if extension == ".pdf" or content_type in PDF_CONTENT_TYPES:
        text = extract_text_from_pdf(content)
    elif allow_txt and (extension == ".txt" or content_type in TXT_CONTENT_TYPES):
        text = decode_text_file(content)
    else:
        allowed = "PDF or TXT" if allow_txt else "PDF"
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type. Upload {allowed}.",
        )

    normalized_text = "\n".join(line.strip() for line in text.splitlines() if line.strip())
    if not normalized_text:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No readable text could be extracted from the uploaded file",
        )
    return normalized_text


def extract_text_from_pdf(content: bytes) -> str:
    try:
        reader = PdfReader(io.BytesIO(content))
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Could not extract text from PDF",
        ) from exc


def decode_text_file(content: bytes) -> str:
    for encoding in ("utf-8", "utf-8-sig", "latin-1"):
        try:
            return content.decode(encoding)
        except UnicodeDecodeError:
            continue
    raise HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail="Could not decode TXT file",
    )
