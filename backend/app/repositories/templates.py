import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload, with_loader_criteria

from app.models.interview_template import InterviewTemplate
from app.models.template_question import TemplateQuestion
from app.models.template_requirement import TemplateRequirement


async def list_templates(session: AsyncSession) -> list[InterviewTemplate]:
    result = await session.execute(
        select(InterviewTemplate)
        .options(
            selectinload(InterviewTemplate.requirements),
            selectinload(InterviewTemplate.questions).selectinload(TemplateQuestion.related_requirements),
            with_loader_criteria(TemplateQuestion, TemplateQuestion.generated_for_interview_id.is_(None)),
        )
        .order_by(InterviewTemplate.created_at.desc())
    )
    return list(result.scalars().unique().all())


async def get_template(
    session: AsyncSession,
    template_id: uuid.UUID,
) -> InterviewTemplate | None:
    result = await session.execute(
        select(InterviewTemplate)
        .where(InterviewTemplate.id == template_id)
        .options(
            selectinload(InterviewTemplate.requirements),
            selectinload(InterviewTemplate.questions).selectinload(TemplateQuestion.related_requirements),
            with_loader_criteria(TemplateQuestion, TemplateQuestion.generated_for_interview_id.is_(None)),
        )
    )
    return result.scalar_one_or_none()


async def create_template(
    session: AsyncSession,
    *,
    title: str,
    description: str,
    role_name: str,
) -> InterviewTemplate:
    template = InterviewTemplate(
        title=title,
        description=description,
        role_name=role_name,
    )
    session.add(template)
    await session.flush()
    return template


async def delete_template(session: AsyncSession, template: InterviewTemplate) -> None:
    await session.delete(template)
    await session.flush()


async def create_requirement(
    session: AsyncSession,
    *,
    template_id: uuid.UUID,
    skill_name: str,
    description: str,
    weight: float,
) -> TemplateRequirement:
    requirement = TemplateRequirement(
        template_id=template_id,
        skill_name=skill_name,
        description=description,
        weight=weight,
    )
    session.add(requirement)
    await session.flush()
    return requirement


async def get_requirement(
    session: AsyncSession,
    requirement_id: uuid.UUID,
) -> TemplateRequirement | None:
    return await session.get(TemplateRequirement, requirement_id)


async def delete_requirement(
    session: AsyncSession,
    requirement: TemplateRequirement,
) -> None:
    await session.delete(requirement)
    await session.flush()


async def create_question(
    session: AsyncSession,
    *,
    template_id: uuid.UUID,
    requirement_id: uuid.UUID | None,
    related_requirements: list[TemplateRequirement] | None = None,
    question_text: str,
    expected_answer: str,
    question_type: str,
    difficulty: str,
    points: float,
    is_required: bool,
    order_index: int,
) -> TemplateQuestion:
    question = TemplateQuestion(
        template_id=template_id,
        requirement_id=requirement_id,
        question_text=question_text,
        expected_answer=expected_answer,
        question_type=question_type,
        difficulty=difficulty,
        points=points,
        is_required=is_required,
        order_index=order_index,
    )
    question.related_requirements = related_requirements or []
    session.add(question)
    await session.flush()
    return question


async def get_question(
    session: AsyncSession,
    question_id: uuid.UUID,
) -> TemplateQuestion | None:
    result = await session.execute(
        select(TemplateQuestion)
        .where(TemplateQuestion.id == question_id)
        .options(selectinload(TemplateQuestion.related_requirements))
    )
    return result.scalar_one_or_none()


async def delete_question(session: AsyncSession, question: TemplateQuestion) -> None:
    await session.delete(question)
    await session.flush()
