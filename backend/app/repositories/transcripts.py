import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.transcript import Transcript


async def create_transcript(
    session: AsyncSession,
    *,
    interview_id: uuid.UUID,
    role: str,
    content: str,
    audio_url: str | None = None,
) -> Transcript:
    transcript = Transcript(
        interview_id=interview_id,
        role=role,
        content=content,
        audio_url=audio_url,
    )
    session.add(transcript)
    await session.flush()
    return transcript


async def list_transcripts_by_interview_id(
    session: AsyncSession,
    interview_id: uuid.UUID,
) -> list[Transcript]:
    result = await session.execute(
        select(Transcript)
        .where(Transcript.interview_id == interview_id)
        .order_by(Transcript.created_at.asc())
    )
    return list(result.scalars().all())


async def update_latest_transcript_audio_url(
    session: AsyncSession,
    *,
    interview_id: uuid.UUID,
    role: str,
    audio_url: str,
) -> Transcript | None:
    result = await session.execute(
        select(Transcript)
        .where(
            Transcript.interview_id == interview_id,
            Transcript.role == role,
        )
        .order_by(Transcript.created_at.desc())
        .limit(1)
    )
    transcript = result.scalar_one_or_none()
    if transcript:
        transcript.audio_url = audio_url
        await session.flush()
    return transcript
