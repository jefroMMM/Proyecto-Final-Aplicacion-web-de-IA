import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.interview_answer import InterviewAnswer
from app.models.template_question import TemplateQuestion


async def create_answer(
    session: AsyncSession,
    *,
    interview_id: uuid.UUID,
    question_id: uuid.UUID,
    transcript_text: str,
    evaluation_status: str,
    base_question_score: float,
    bonus_score: float,
    final_question_score: float,
    feedback: str,
    reason: str,
) -> InterviewAnswer:
    answer = InterviewAnswer(
        interview_id=interview_id,
        question_id=question_id,
        transcript_text=transcript_text,
        evaluation_status=evaluation_status,
        base_question_score=base_question_score,
        bonus_score=bonus_score,
        final_question_score=final_question_score,
        feedback=feedback,
        reason=reason,
    )
    session.add(answer)
    await session.flush()
    return answer


async def list_answers(
    session: AsyncSession,
    interview_id: uuid.UUID,
) -> list[InterviewAnswer]:
    result = await session.execute(
        select(InterviewAnswer)
        .where(InterviewAnswer.interview_id == interview_id)
        .options(selectinload(InterviewAnswer.question))
        .order_by(InterviewAnswer.created_at.asc())
    )
    return list(result.scalars().all())


async def count_answers(
    session: AsyncSession,
    interview_id: uuid.UUID,
) -> int:
    result = await session.execute(
        select(InterviewAnswer.id).where(InterviewAnswer.interview_id == interview_id)
    )
    return len(result.scalars().all())


async def get_next_question(
    session: AsyncSession,
    *,
    template_id: uuid.UUID,
    already_answered_question_ids: set[uuid.UUID],
) -> TemplateQuestion | None:
    result = await session.execute(
        select(TemplateQuestion)
        .where(TemplateQuestion.template_id == template_id)
        .options(selectinload(TemplateQuestion.requirement))
        .order_by(TemplateQuestion.order_index.asc(), TemplateQuestion.created_at.asc())
    )
    for question in result.scalars().all():
        if question.id not in already_answered_question_ids:
            return question
    return None
