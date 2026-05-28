import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories import transcripts as transcript_repository
from app.services.interview_service import ensure_interview_exists


async def list_transcripts_for_interview(
    session: AsyncSession,
    interview_id: uuid.UUID,
):
    await ensure_interview_exists(session, interview_id)
    return await transcript_repository.list_transcripts_by_interview_id(
        session,
        interview_id,
    )
