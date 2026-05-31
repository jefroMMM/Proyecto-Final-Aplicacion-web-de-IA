import uuid
import logging

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

logger = logging.getLogger(__name__)


async def list_templates(session: AsyncSession):
    return await template_repository.list_templates(session)


async def create_template(
    session: AsyncSession,
    payload: InterviewTemplateCreate,
):
    _log_required_questions(payload.questions, context="create_template")
    if not payload.questions or not any(question.is_required for question in payload.questions):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Template must include at least one required question",
        )
    template = await template_repository.create_template(
        session,
        title=payload.title,
        description=payload.description,
        role_name=payload.role_name,
    )
    created_requirements = []
    for requirement in payload.requirements:
        created = await template_repository.create_requirement(
            session,
            template_id=template.id,
            skill_name=requirement.skill_name,
            description=requirement.description,
            weight=requirement.weight,
        )
        created_requirements.append(created)
    for question in payload.questions:
        related_requirements = await _resolve_question_requirements(
            session,
            template_id=template.id,
            requirement_ids=question.requirement_ids,
            requirement_indexes=question.requirement_indexes,
            created_requirements=created_requirements,
        )
        primary_requirement_id = (
            related_requirements[0].id
            if related_requirements
            else question.requirement_id
        )
        await template_repository.create_question(
            session,
            template_id=template.id,
            requirement_id=primary_requirement_id,
            related_requirements=related_requirements,
            question_text=question.question_text,
            expected_answer=question.expected_answer,
            question_type=question.question_type,
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
    if not payload.is_required and not await _template_has_required_question(session, template_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Template must include at least one required question",
        )
    related_requirements = await _resolve_question_requirements(
        session,
        template_id=template_id,
        requirement_ids=payload.requirement_ids or ([payload.requirement_id] if payload.requirement_id else []),
    )
    primary_requirement_id = related_requirements[0].id if related_requirements else payload.requirement_id
    question = await template_repository.create_question(
        session,
        template_id=template_id,
        requirement_id=primary_requirement_id,
        related_requirements=related_requirements,
        question_text=payload.question_text,
        expected_answer=payload.expected_answer,
        question_type=payload.question_type,
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
    if payload.requirement_ids is not None:
        question.related_requirements = await _resolve_question_requirements(
            session,
            template_id=question.template_id,
            requirement_ids=payload.requirement_ids,
        )
        question.requirement_id = question.related_requirements[0].id if question.related_requirements else None
    elif payload.requirement_id:
        question.related_requirements = await _resolve_question_requirements(
            session,
            template_id=question.template_id,
            requirement_ids=[payload.requirement_id],
        )
        question.requirement_id = question.related_requirements[0].id if question.related_requirements else None
    for field in (
        "requirement_id",
        "question_text",
        "expected_answer",
        "question_type",
        "difficulty",
        "points",
        "is_required",
        "order_index",
    ):
        value = getattr(payload, field)
        if value is not None:
            if field == "is_required" and value is False:
                siblings = await ensure_template(session, question.template_id)
                required_others = [
                    item for item in siblings.questions
                    if item.id != question.id and item.is_required
                ]
                if not required_others:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Template must include at least one required question",
                    )
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


async def _resolve_question_requirements(
    session: AsyncSession,
    *,
    template_id: uuid.UUID,
    requirement_ids: list[uuid.UUID] | None = None,
    requirement_indexes: list[int] | None = None,
    created_requirements: list | None = None,
):
    requirements = []
    seen: set[uuid.UUID] = set()
    for index in requirement_indexes or []:
        if created_requirements and 0 <= index < len(created_requirements):
            requirement = created_requirements[index]
            if requirement.id not in seen:
                requirements.append(requirement)
                seen.add(requirement.id)
    for requirement_id in requirement_ids or []:
        requirement = await template_repository.get_requirement(session, requirement_id)
        if not requirement or requirement.template_id != template_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Requirement does not belong to template",
            )
        if requirement.id not in seen:
            requirements.append(requirement)
            seen.add(requirement.id)
    return requirements


async def _template_has_required_question(session: AsyncSession, template_id: uuid.UUID) -> bool:
    template = await ensure_template(session, template_id)
    _log_required_questions(template.questions, context="template_has_required_question")
    return any(question.is_required for question in template.questions)


def _log_required_questions(questions, *, context: str) -> None:
    logger.warning(
        "Template required question validation context=%s questions=%s",
        context,
        [
            {
                "question_text": getattr(question, "question_text", ""),
                "is_required": getattr(question, "is_required", None),
            }
            for question in questions
        ],
    )
