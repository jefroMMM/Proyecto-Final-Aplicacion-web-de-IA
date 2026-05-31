import uuid

from sqlalchemy import or_, select
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
        ai_question_score=final_question_score,
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


async def get_answer(
    session: AsyncSession,
    answer_id: uuid.UUID,
) -> InterviewAnswer | None:
    result = await session.execute(
        select(InterviewAnswer)
        .where(InterviewAnswer.id == answer_id)
        .options(selectinload(InterviewAnswer.question))
    )
    return result.scalar_one_or_none()


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
    interview_id: uuid.UUID | None = None,
) -> TemplateQuestion | None:
    interview_filter = (
        TemplateQuestion.generated_for_interview_id.is_(None)
        if interview_id is None
        else or_(
            TemplateQuestion.generated_for_interview_id.is_(None),
            TemplateQuestion.generated_for_interview_id == interview_id,
        )
    )
    result = await session.execute(
        select(TemplateQuestion)
        .where(TemplateQuestion.template_id == template_id)
        .where(interview_filter)
        .options(selectinload(TemplateQuestion.requirement))
        .order_by(TemplateQuestion.order_index.asc(), TemplateQuestion.created_at.asc())
    )
    for question in result.scalars().all():
        if question.id not in already_answered_question_ids:
            return question
    return None


async def create_agent_question(
    session: AsyncSession,
    *,
    template_id: uuid.UUID,
    interview_id: uuid.UUID,
    requirement_id: uuid.UUID | None,
    question_text: str,
    expected_answer: str,
    points: float,
    order_index: int,
) -> TemplateQuestion:
    question = TemplateQuestion(
        template_id=template_id,
        generated_for_interview_id=interview_id,
        requirement_id=requirement_id,
        question_text=question_text,
        expected_answer=expected_answer,
        source="agent",
        difficulty="medium",
        points=points,
        is_required=True,
        order_index=order_index,
    )
    session.add(question)
    await session.flush()
    return question
