import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db_session
from app.schemas.interview import InterviewCreate, InterviewDetailRead, InterviewRead
from app.services import interview_service

router = APIRouter(prefix="/interviews", tags=["interviews"])


@router.post(
    "",
    response_model=InterviewRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_interview(
    payload: InterviewCreate,
    session: Annotated[AsyncSession, Depends(get_db_session)],
):
    return await interview_service.create_interview(session, payload)


@router.get("", response_model=list[InterviewRead])
async def list_interviews(
    session: Annotated[AsyncSession, Depends(get_db_session)],
):
    return await interview_service.list_interviews(session)


@router.get("/{interview_id}", response_model=InterviewDetailRead)
async def get_interview(
    interview_id: uuid.UUID,
    session: Annotated[AsyncSession, Depends(get_db_session)],
):
    return await interview_service.get_interview_detail(session, interview_id)
