import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db_session
from app.schemas.upload import UploadDocumentResponse
from app.services import document_service

router = APIRouter(prefix="/upload", tags=["uploads"])


@router.post("/cv/{interview_id}", response_model=UploadDocumentResponse)
async def upload_cv(
    interview_id: uuid.UUID,
    file: Annotated[UploadFile, File(...)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
):
    return await document_service.save_interview_document(
        session,
        interview_id=interview_id,
        document_type="cv",
        file=file,
    )


@router.post("/job/{interview_id}", response_model=UploadDocumentResponse)
async def upload_job_description(
    interview_id: uuid.UUID,
    file: Annotated[UploadFile, File(...)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
):
    return await document_service.save_interview_document(
        session,
        interview_id=interview_id,
        document_type="job_description",
        file=file,
    )
