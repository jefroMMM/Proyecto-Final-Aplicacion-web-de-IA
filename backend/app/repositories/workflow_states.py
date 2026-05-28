import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.interview_workflow_state import InterviewWorkflowState


async def get_workflow_state(
    session: AsyncSession,
    interview_id: uuid.UUID,
) -> InterviewWorkflowState | None:
    result = await session.execute(
        select(InterviewWorkflowState).where(
            InterviewWorkflowState.interview_id == interview_id
        )
    )
    return result.scalar_one_or_none()


async def upsert_workflow_state(
    session: AsyncSession,
    *,
    interview_id: uuid.UUID,
    state_json: dict,
) -> InterviewWorkflowState:
    existing_state = await get_workflow_state(session, interview_id)
    if existing_state:
        existing_state.state_json = state_json
        await session.flush()
        return existing_state

    workflow_state = InterviewWorkflowState(
        interview_id=interview_id,
        state_json=state_json,
    )
    session.add(workflow_state)
    await session.flush()
    return workflow_state
