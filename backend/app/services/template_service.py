import uuid

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories import templates as template_repository
from app.schemas.template import (
    InterviewTemplateCreate,
    InterviewTemplateUpdate,
    TemplateQuestionCreate,
    TemplateQuestionUpdate,
    TemplateRequirementCreate,
    TemplateRequirementUpdate,
)


async def list_templates(session: AsyncSession):
    return await template_repository.list_templates(session)


async def create_template(
    session: AsyncSession,
    payload: InterviewTemplateCreate,
):
    template = await template_repository.create_template(
        session,
        title=payload.title,
        description=payload.description,
        role_name=payload.role_name,
    )
    for requirement in payload.requirements:
        await template_repository.create_requirement(
            session,
            template_id=template.id,
            skill_name=requirement.skill_name,
            description=requirement.description,
            weight=requirement.weight,
        )
    for question in payload.questions:
        await template_repository.create_question(
            session,
            template_id=template.id,
            requirement_id=question.requirement_id,
            question_text=question.question_text,
            expected_answer=question.expected_answer,
            difficulty=question.difficulty,
            points=question.points,
            is_required=question.is_required,
            order_index=question.order_index,
        )
    await session.commit()
    return await ensure_template(session, template.id)


async def ensure_template(
    session: AsyncSession,
    template_id: uuid.UUID,
):
    template = await template_repository.get_template(session, template_id)
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found",
        )
    return template


async def update_template(
    session: AsyncSession,
    template_id: uuid.UUID,
    payload: InterviewTemplateUpdate,
):
    template = await ensure_template(session, template_id)
    for field in ("title", "description", "role_name"):
        value = getattr(payload, field)
        if value is not None:
            setattr(template, field, value)
    await session.commit()
    return await ensure_template(session, template_id)


async def delete_template(session: AsyncSession, template_id: uuid.UUID) -> None:
    template = await ensure_template(session, template_id)
    await template_repository.delete_template(session, template)
    await session.commit()


async def add_requirement(
    session: AsyncSession,
    template_id: uuid.UUID,
    payload: TemplateRequirementCreate,
):
    await ensure_template(session, template_id)
    requirement = await template_repository.create_requirement(
        session,
        template_id=template_id,
        skill_name=payload.skill_name,
        description=payload.description,
        weight=payload.weight,
    )
    await session.commit()
    return requirement


async def update_requirement(
    session: AsyncSession,
    requirement_id: uuid.UUID,
    payload: TemplateRequirementUpdate,
):
    requirement = await template_repository.get_requirement(session, requirement_id)
    if not requirement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Requirement not found",
        )
    for field in ("skill_name", "description", "weight"):
        value = getattr(payload, field)
        if value is not None:
            setattr(requirement, field, value)
    await session.commit()
    return requirement


async def delete_requirement(session: AsyncSession, requirement_id: uuid.UUID) -> None:
    requirement = await template_repository.get_requirement(session, requirement_id)
    if not requirement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Requirement not found",
        )
    await template_repository.delete_requirement(session, requirement)
    await session.commit()


async def add_question(
    session: AsyncSession,
    template_id: uuid.UUID,
    payload: TemplateQuestionCreate,
):
    await ensure_template(session, template_id)
    if payload.requirement_id:
        requirement = await template_repository.get_requirement(
            session,
            payload.requirement_id,
        )
        if not requirement or requirement.template_id != template_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Requirement does not belong to template",
            )
    question = await template_repository.create_question(
        session,
        template_id=template_id,
        requirement_id=payload.requirement_id,
        question_text=payload.question_text,
        expected_answer=payload.expected_answer,
        difficulty=payload.difficulty,
        points=payload.points,
        is_required=payload.is_required,
        order_index=payload.order_index,
    )
    await session.commit()
    return question


async def update_question(
    session: AsyncSession,
    question_id: uuid.UUID,
    payload: TemplateQuestionUpdate,
):
    question = await template_repository.get_question(session, question_id)
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found",
        )
    if payload.requirement_id:
        requirement = await template_repository.get_requirement(session, payload.requirement_id)
        if not requirement or requirement.template_id != question.template_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Requirement does not belong to question template",
            )
    for field in (
        "requirement_id",
        "question_text",
        "expected_answer",
        "difficulty",
        "points",
        "is_required",
        "order_index",
    ):
        value = getattr(payload, field)
        if value is not None:
            setattr(question, field, value)
    await session.commit()
    return question


async def delete_question(session: AsyncSession, question_id: uuid.UUID) -> None:
    question = await template_repository.get_question(session, question_id)
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found",
        )
    await template_repository.delete_question(session, question)
    await session.commit()
