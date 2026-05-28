import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.interview import Interview


async def create_interview(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    candidate_name: str,
    job_title: str,
) -> Interview:
    interview = Interview(
        user_id=user_id,
        candidate_name=candidate_name,
        job_title=job_title,
        status="created",
    )
    session.add(interview)
    await session.flush()
    return interview


async def list_interviews(session: AsyncSession) -> list[Interview]:
    result = await session.execute(
        select(Interview).order_by(Interview.created_at.desc())
    )
    return list(result.scalars().all())


async def get_interview_by_id(
    session: AsyncSession,
    interview_id: uuid.UUID,
) -> Interview | None:
    return await session.get(Interview, interview_id)


async def get_interview_detail(
    session: AsyncSession,
    interview_id: uuid.UUID,
) -> Interview | None:
    result = await session.execute(
        select(Interview)
        .where(Interview.id == interview_id)
        .options(
            selectinload(Interview.user),
            selectinload(Interview.documents),
            selectinload(Interview.transcripts),
            selectinload(Interview.report),
        )
    )
    return result.scalar_one_or_none()


async def update_interview_status(
    session: AsyncSession,
    interview_id: uuid.UUID,
    status: str,
) -> None:
    interview = await session.get(Interview, interview_id)
    if interview:
        interview.status = status
        await session.flush()
