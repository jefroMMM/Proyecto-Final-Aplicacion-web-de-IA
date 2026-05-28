import uuid
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db_session
from app.schemas.transcript import TranscriptRead
from app.services import transcript_service

router = APIRouter(prefix="/transcripts", tags=["transcripts"])


@router.get("/{interview_id}", response_model=list[TranscriptRead])
async def get_transcripts(
    interview_id: uuid.UUID,
    session: Annotated[AsyncSession, Depends(get_db_session)],
):
    return await transcript_service.list_transcripts_for_interview(session, interview_id)
