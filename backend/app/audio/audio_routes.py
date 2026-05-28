import logging
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.audio.assemblyai_service import AssemblyAIService, validate_audio_file
from app.audio.cartesia_service import CartesiaService
from app.audio.storage import save_generated_audio, save_uploaded_audio
from app.db.session import get_db_session
from app.repositories import transcripts as transcript_repository
from app.schemas.audio import VoiceStartResponse, VoiceTurnResponse
from app.services import interview_workflow_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/interview/audio", tags=["voice interview"])


@router.post("/start/{interview_id}", response_model=VoiceStartResponse)
async def start_voice_interview(
    interview_id: uuid.UUID,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    voice_id: Annotated[str | None, Form()] = None,
    speed: Annotated[str | None, Form()] = "normal",
):
    turn = await interview_workflow_service.start_interview(session, interview_id)
    response_text = turn.current_question
    if not response_text:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Interview did not generate a first question",
        )

    audio_url = await synthesize_and_store_response(
        text=response_text,
        voice_id=voice_id,
        speed=speed,
        suffix="interviewer-start",
    )
    await transcript_repository.update_latest_transcript_audio_url(
        session,
        interview_id=interview_id,
        role="interviewer",
        audio_url=audio_url,
    )
    await session.commit()

    return VoiceStartResponse(
        interview_id=interview_id,
        interviewer_response=response_text,
        audio_url=audio_url,
        interview_status=map_audio_status(turn.status),
    )


@router.post("/{interview_id}", response_model=VoiceTurnResponse)
async def process_voice_interview_turn(
    interview_id: uuid.UUID,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    file: Annotated[UploadFile, File(...)],
    voice_id: Annotated[str | None, Form()] = None,
    speed: Annotated[str | None, Form()] = "normal",
):
    logger.info("Processing voice interview turn interview_id=%s", interview_id)

    validate_audio_file(file)
    candidate_audio_url = await save_uploaded_audio(file, "candidate")
    candidate_transcript = await AssemblyAIService().transcribe_upload(file)

    turn = await interview_workflow_service.process_candidate_message(
        session,
        interview_id,
        candidate_transcript,
        candidate_audio_url,
    )
    response_text = build_interviewer_response_text(turn)

    audio_url = await synthesize_and_store_response(
        text=response_text,
        voice_id=voice_id,
        speed=speed,
        suffix="interviewer-response",
    )

    if turn.status == "completed":
        await transcript_repository.create_transcript(
            session,
            interview_id=interview_id,
            role="interviewer",
            content=response_text,
            audio_url=audio_url,
        )
    else:
        await transcript_repository.update_latest_transcript_audio_url(
            session,
            interview_id=interview_id,
            role="interviewer",
            audio_url=audio_url,
        )
    await session.commit()

    return VoiceTurnResponse(
        interview_id=interview_id,
        candidate_transcript=candidate_transcript,
        interviewer_response=response_text,
        audio_url=audio_url,
        interview_status=map_audio_status(turn.status),
    )


async def synthesize_and_store_response(
    *,
    text: str,
    voice_id: str | None,
    speed: str | None,
    suffix: str,
) -> str:
    audio_bytes = await CartesiaService(voice_id=voice_id).synthesize(
        text,
        speed=speed,
    )
    return save_generated_audio(audio_bytes, suffix=suffix, extension=".wav")


def build_interviewer_response_text(turn) -> str:
    if turn.status == "completed" and turn.final_report:
        return (
            "La entrevista ha finalizado. "
            f"{turn.final_report.final_summary} "
            f"Recomendacion: {turn.final_report.recommendation}"
        )

    if turn.current_question:
        return turn.current_question

    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail="Interview workflow did not return a next interviewer response",
    )


def map_audio_status(status_value: str) -> str:
    return "finalized" if status_value == "completed" else status_value
