import uuid

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories import interviews as interview_repository
from app.repositories import users as user_repository
from app.schemas.interview import InterviewCreate
from app.services.scoring import calculate_max_score_for_template


async def create_interview(
    session: AsyncSession,
    payload: InterviewCreate,
):
    if payload.user_id:
        user = await user_repository.get_user_by_id(session, payload.user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
    elif payload.user:
        user = await user_repository.get_or_create_user(session, payload.user)
    else:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Provide either user_id or user",
        )

    interview = await interview_repository.create_interview(
        session,
        user_id=user.id,
        candidate_name=payload.candidate_name,
        job_title=payload.job_title,
    )
    await session.commit()
    await session.refresh(interview)
    return interview


async def ensure_interview_exists(session: AsyncSession, interview_id: uuid.UUID):
    interview = await interview_repository.get_interview_by_id(session, interview_id)
    if not interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview not found",
        )
    return interview


async def list_interviews(session: AsyncSession):
    interviews = await interview_repository.list_interviews(session)
    for interview in interviews:
        if interview.template:
            interview.max_score = calculate_max_score_for_template(interview.template)
    return interviews


async def get_interview_detail(session: AsyncSession, interview_id: uuid.UUID):
    interview = await interview_repository.get_interview_detail(session, interview_id)
    if not interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview not found",
        )
    return interview
