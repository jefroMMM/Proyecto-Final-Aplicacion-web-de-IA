import io
import base64
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status
import fitz
from pypdf import PdfReader
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.repositories import documents as document_repository
from app.rag.pipeline import build_rag_pipeline, map_rag_provider_error
from app.schemas.document import DocumentType
from app.schemas.upload import UploadDocumentResponse
from app.services.openai_client import OpenAIClientFactory
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
    text = await extract_text_from_upload(
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


async def extract_text_from_upload(
    *,
    content: bytes,
    filename: str,
    content_type: str | None,
    allow_txt: bool,
) -> str:
    extension = Path(filename).suffix.lower()

    if extension == ".pdf" or content_type in PDF_CONTENT_TYPES:
        text = extract_text_from_pdf(content)
        if not _normalize_text(text):
            text = await extract_text_from_scanned_pdf(content, filename=filename)
    elif allow_txt and (extension == ".txt" or content_type in TXT_CONTENT_TYPES):
        text = decode_text_file(content)
    else:
        allowed = "PDF or TXT" if allow_txt else "PDF"
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type. Upload {allowed}.",
        )

    normalized_text = _normalize_text(text)
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


async def extract_text_from_scanned_pdf(content: bytes, *, filename: str) -> str:
    if not settings.OPENAI_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "No readable text could be extracted from the uploaded PDF. "
                "This looks like a scanned PDF and OPENAI_API_KEY is required for OCR."
            ),
        )

    images = render_pdf_pages_for_ocr(content, max_pages=6)
    if not images:
        return ""

    client = OpenAIClientFactory().create()
    content_parts: list[dict] = [
        {
            "type": "text",
            "text": (
                "Extrae todo el texto legible de este CV escaneado. "
                "Devuelve solo texto plano, manteniendo secciones como experiencia, estudios, habilidades y contacto. "
                f"Archivo: {filename}"
            ),
        }
    ]
    for image_bytes in images:
        encoded = base64.b64encode(image_bytes).decode("ascii")
        content_parts.append(
            {
                "type": "image_url",
                "image_url": {"url": f"data:image/jpeg;base64,{encoded}"},
            }
        )

    response = await client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        temperature=0,
        messages=[
            {
                "role": "system",
                "content": "Eres un OCR para CVs escaneados. No inventes información.",
            },
            {"role": "user", "content": content_parts},
        ],
    )
    return response.choices[0].message.content or ""


def render_pdf_pages_for_ocr(content: bytes, *, max_pages: int) -> list[bytes]:
    try:
        document = fitz.open(stream=content, filetype="pdf")
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Could not read scanned PDF for OCR",
        ) from exc

    images: list[bytes] = []
    with document:
        for page_index in range(min(max_pages, document.page_count)):
            page = document.load_page(page_index)
            pixmap = page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5), alpha=False)
            images.append(pixmap.tobytes("jpeg"))
    return images


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


def _normalize_text(text: str) -> str:
    return "\n".join(line.strip() for line in text.splitlines() if line.strip())
