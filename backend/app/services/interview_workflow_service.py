import logging
import uuid

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.langgraph.interview_graph import InterviewGraphRunner, InterviewState
from app.repositories import workflow_states as workflow_state_repository
from app.schemas.interview_agent import (
    AnswerEvaluation,
    InterviewReport,
    InterviewStateResponse,
    InterviewTurnResponse,
)
from app.services.interview_service import ensure_interview_exists

logger = logging.getLogger(__name__)


async def start_interview(
    session: AsyncSession,
    interview_id: uuid.UUID,
) -> InterviewTurnResponse:
    await ensure_interview_exists(session, interview_id)
    existing_state = await workflow_state_repository.get_workflow_state(
        session,
        interview_id,
    )

    if existing_state and existing_state.state_json.get("current_question"):
        return build_turn_response(interview_id, existing_state.state_json)

    initial_state: InterviewState = {
        "interview_id": str(interview_id),
        "mode": "start",
        "conversation_history": [],
        "detected_skills": [],
        "difficulty_level": "mid",
        "asked_questions": [],
        "evaluations": [],
        "final_report": None,
        "status": "not_started",
        "generated_question_this_turn": False,
    }
    state = await run_graph(session, initial_state)
    return build_turn_response(interview_id, state)


async def process_candidate_message(
    session: AsyncSession,
    interview_id: uuid.UUID,
    answer: str,
    candidate_audio_url: str | None = None,
) -> InterviewTurnResponse:
    await ensure_interview_exists(session, interview_id)
    existing_state = await workflow_state_repository.get_workflow_state(
        session,
        interview_id,
    )
    if not existing_state:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Interview workflow has not been started",
        )
    if existing_state.state_json.get("status") == "completed":
        return build_turn_response(interview_id, existing_state.state_json)

    state: InterviewState = {
        **existing_state.state_json,
        "interview_id": str(interview_id),
        "mode": "message",
        "candidate_answer": answer,
        "candidate_audio_url": candidate_audio_url,
        "generated_question_this_turn": False,
    }
    result_state = await run_graph(session, state)
    return build_turn_response(interview_id, result_state)


async def finalize_interview(
    session: AsyncSession,
    interview_id: uuid.UUID,
) -> InterviewTurnResponse:
    await ensure_interview_exists(session, interview_id)
    existing_state = await workflow_state_repository.get_workflow_state(
        session,
        interview_id,
    )
    if not existing_state:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Interview workflow has not been started",
        )

    state: InterviewState = {
        **existing_state.state_json,
        "interview_id": str(interview_id),
        "mode": "finalize",
        "generated_question_this_turn": False,
    }
    result_state = await run_graph(session, state)
    return build_turn_response(interview_id, result_state)


async def get_interview_state(
    session: AsyncSession,
    interview_id: uuid.UUID,
) -> InterviewStateResponse:
    await ensure_interview_exists(session, interview_id)
    existing_state = await workflow_state_repository.get_workflow_state(
        session,
        interview_id,
    )
    if not existing_state:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview workflow state not found",
        )
    return InterviewStateResponse(
        interview_id=interview_id,
        state=existing_state.state_json,
    )


async def run_graph(
    session: AsyncSession,
    state: InterviewState,
) -> InterviewState:
    try:
        runner = InterviewGraphRunner(session)
        return await runner.run(state)
    except HTTPException:
        await session.rollback()
        raise
    except Exception as exc:
        await session.rollback()
        logger.exception("Interview workflow failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Interview AI workflow failed",
        ) from exc


def build_turn_response(
    interview_id: uuid.UUID,
    state: dict,
) -> InterviewTurnResponse:
    latest_evaluation = None
    if state.get("evaluations"):
        latest_evaluation = AnswerEvaluation.model_validate(state["evaluations"][-1])

    final_report = None
    if state.get("final_report"):
        final_report = InterviewReport.model_validate(state["final_report"])

    return InterviewTurnResponse(
        interview_id=interview_id,
        status=state.get("status", "not_started"),
        current_question=state.get("current_question"),
        difficulty_level=state.get("difficulty_level"),
        detected_skills=state.get("detected_skills", []),
        latest_evaluation=latest_evaluation,
        final_report=final_report,
    )
