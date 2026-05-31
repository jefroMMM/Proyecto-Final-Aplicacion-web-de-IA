import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.audio.assemblyai_service import AssemblyAIService, validate_audio_file
from app.db.session import get_db_session
from app.schemas.interview import InterviewCreate, InterviewDetailRead, InterviewRead
from app.schemas.template import (
    AnalyzeCVResponse,
    AudioAnswerResponse,
    AnswerRequest,
    AnswerTurnResponse,
    InterviewCreateV2,
    InterviewFinalReport,
    InterviewScoreResponse,
    StartInterviewResponse,
)
from app.services import interview_service, template_interview_service

router = APIRouter(prefix="/interviews", tags=["interviews"])


@router.post(
    "",
    response_model=InterviewRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_interview(
    payload: InterviewCreate | InterviewCreateV2,
    session: Annotated[AsyncSession, Depends(get_db_session)],
):
    if isinstance(payload, InterviewCreateV2):
        return await template_interview_service.create_interview_from_template(session, payload)
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


@router.post("/{interview_id}/upload-cv")
async def upload_cv_for_interview(
    interview_id: uuid.UUID,
    file: Annotated[UploadFile, File(...)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
):
    return await template_interview_service.upload_cv(session, interview_id, file)


@router.post("/{interview_id}/analyze-cv", response_model=AnalyzeCVResponse)
async def analyze_cv_for_interview(
    interview_id: uuid.UUID,
    session: Annotated[AsyncSession, Depends(get_db_session)],
):
    return await template_interview_service.analyze_cv_against_template(session, interview_id)


@router.post("/{interview_id}/send-candidate-invite", response_model=InterviewRead)
async def send_candidate_invite(
    interview_id: uuid.UUID,
    session: Annotated[AsyncSession, Depends(get_db_session)],
):
    return await template_interview_service.send_candidate_invite(session, interview_id)


@router.post("/{interview_id}/start", response_model=StartInterviewResponse)
async def start_template_interview(
    interview_id: uuid.UUID,
    session: Annotated[AsyncSession, Depends(get_db_session)],
):
    return await template_interview_service.start_template_interview(session, interview_id)


@router.post("/{interview_id}/answer", response_model=AnswerTurnResponse)
async def answer_template_interview(
    interview_id: uuid.UUID,
    payload: AnswerRequest,
    session: Annotated[AsyncSession, Depends(get_db_session)],
):
    result = await template_interview_service.submit_text_answer(
        session,
        interview_id,
        payload.answer,
    )
    return AnswerTurnResponse(interview_id=interview_id, **result)


@router.post("/{interview_id}/audio-answer", response_model=AudioAnswerResponse)
async def answer_template_interview_with_audio(
    interview_id: uuid.UUID,
    file: Annotated[UploadFile, File(...)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
):
    validate_audio_file(file)
    transcript = await AssemblyAIService().transcribe_upload(file)
    result = await template_interview_service.submit_text_answer(
        session,
        interview_id,
        transcript,
    )
    score = await template_interview_service.get_score(session, interview_id)
    return AudioAnswerResponse(
        candidate_transcript=result["candidate_transcript"],
        evaluation=result["evaluation"],
        current_score={
            "initial_cv_score": score["initial_cv_score"],
            "question_score": score["question_score"],
            "bonus_score": score["bonus_score"],
            "final_score": score["final_score"],
            "max_score": score["max_score"],
            "percentage": score["percentage"],
        },
        next_question={
            "id": result.get("next_question_id"),
            "question_text": result.get("next_question"),
        },
        interview_status=result["status"],
    )


@router.post("/{interview_id}/finalize", response_model=InterviewFinalReport)
async def finalize_template_interview(
    interview_id: uuid.UUID,
    session: Annotated[AsyncSession, Depends(get_db_session)],
):
    return await template_interview_service.finalize_interview(session, interview_id)


@router.get("/{interview_id}/score", response_model=InterviewScoreResponse)
async def get_template_interview_score(
    interview_id: uuid.UUID,
    session: Annotated[AsyncSession, Depends(get_db_session)],
):
    return await template_interview_service.get_score(session, interview_id)


@router.get("/{interview_id}/report", response_model=InterviewFinalReport)
async def get_template_interview_report(
    interview_id: uuid.UUID,
    session: Annotated[AsyncSession, Depends(get_db_session)],
):
    return await template_interview_service.get_final_report(session, interview_id)
