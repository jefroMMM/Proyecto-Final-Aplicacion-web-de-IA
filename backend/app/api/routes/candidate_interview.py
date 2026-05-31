import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, Header, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.audio.assemblyai_service import validate_audio_file
from app.db.session import get_db_session
from app.schemas.candidate_interview import (
    CandidateFinalResultResponse,
    CandidateQuestionsResponse,
    CandidateTokenValidationRequest,
    CandidateTokenValidationResponse,
    CandidateVoiceAnswerResponse,
)
from app.services import candidate_interview_service

router = APIRouter(prefix="/entrevista", tags=["candidate interview"])


@router.post("/validar-token", response_model=CandidateTokenValidationResponse)
async def validate_token(
    payload: CandidateTokenValidationRequest,
    session: Annotated[AsyncSession, Depends(get_db_session)],
):
    return await candidate_interview_service.validate_candidate_token(session, payload.token)


@router.get("/{entrevista_id}/preguntas", response_model=CandidateQuestionsResponse)
async def get_questions(
    entrevista_id: uuid.UUID,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    x_interview_token: Annotated[str, Header(alias="X-Interview-Token")],
):
    return await candidate_interview_service.list_candidate_questions(
        session,
        interview_id=entrevista_id,
        token=x_interview_token,
    )


@router.post("/{entrevista_id}/respuesta-voz", response_model=CandidateVoiceAnswerResponse)
async def submit_voice_answer(
    entrevista_id: uuid.UUID,
    file: Annotated[UploadFile, File(...)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
    x_interview_token: Annotated[str, Header(alias="X-Interview-Token")],
):
    validate_audio_file(file)
    return await candidate_interview_service.submit_voice_answer(
        session,
        interview_id=entrevista_id,
        token=x_interview_token,
        file=file,
    )


@router.post("/{entrevista_id}/finalizar", response_model=CandidateFinalResultResponse)
async def finalize_interview(
    entrevista_id: uuid.UUID,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    x_interview_token: Annotated[str, Header(alias="X-Interview-Token")],
):
    return await candidate_interview_service.finalize_candidate_interview(
        session,
        interview_id=entrevista_id,
        token=x_interview_token,
    )
