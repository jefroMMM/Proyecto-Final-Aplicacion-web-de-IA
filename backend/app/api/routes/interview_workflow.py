import uuid
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db_session
from app.schemas.interview_agent import (
    InterviewMessageRequest,
    InterviewStateResponse,
    InterviewTurnResponse,
)
from app.services import interview_workflow_service

router = APIRouter(prefix="/interview", tags=["interview workflow"])


@router.post("/start/{interview_id}", response_model=InterviewTurnResponse)
async def start_interview(
    interview_id: uuid.UUID,
    session: Annotated[AsyncSession, Depends(get_db_session)],
):
    return await interview_workflow_service.start_interview(session, interview_id)


@router.post("/message/{interview_id}", response_model=InterviewTurnResponse)
async def send_interview_message(
    interview_id: uuid.UUID,
    payload: InterviewMessageRequest,
    session: Annotated[AsyncSession, Depends(get_db_session)],
):
    return await interview_workflow_service.process_candidate_message(
        session,
        interview_id,
        payload.answer,
        None,
    )


@router.post("/finalize/{interview_id}", response_model=InterviewTurnResponse)
async def finalize_interview(
    interview_id: uuid.UUID,
    session: Annotated[AsyncSession, Depends(get_db_session)],
):
    return await interview_workflow_service.finalize_interview(session, interview_id)


@router.get("/state/{interview_id}", response_model=InterviewStateResponse)
async def get_interview_state(
    interview_id: uuid.UUID,
    session: Annotated[AsyncSession, Depends(get_db_session)],
):
    return await interview_workflow_service.get_interview_state(session, interview_id)
