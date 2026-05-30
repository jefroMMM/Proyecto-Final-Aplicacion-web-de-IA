import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db_session
from app.schemas.template import (
    InterviewTemplateCreate,
    InterviewTemplateRead,
    InterviewTemplateUpdate,
    TemplateQuestionCreate,
    TemplateQuestionRead,
    TemplateQuestionUpdate,
    TemplateRequirementCreate,
    TemplateRequirementRead,
    TemplateRequirementUpdate,
)
from app.services import template_service

router = APIRouter(prefix="/templates", tags=["templates"])


@router.get("", response_model=list[InterviewTemplateRead])
async def list_templates(
    session: Annotated[AsyncSession, Depends(get_db_session)],
):
    return await template_service.list_templates(session)


@router.post("", response_model=InterviewTemplateRead, status_code=status.HTTP_201_CREATED)
async def create_template(
    payload: InterviewTemplateCreate,
    session: Annotated[AsyncSession, Depends(get_db_session)],
):
    return await template_service.create_template(session, payload)


@router.get("/{template_id}", response_model=InterviewTemplateRead)
async def get_template(
    template_id: uuid.UUID,
    session: Annotated[AsyncSession, Depends(get_db_session)],
):
    return await template_service.ensure_template(session, template_id)


@router.put("/{template_id}", response_model=InterviewTemplateRead)
async def update_template(
    template_id: uuid.UUID,
    payload: InterviewTemplateUpdate,
    session: Annotated[AsyncSession, Depends(get_db_session)],
):
    return await template_service.update_template(session, template_id, payload)


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(
    template_id: uuid.UUID,
    session: Annotated[AsyncSession, Depends(get_db_session)],
):
    await template_service.delete_template(session, template_id)


@router.post("/{template_id}/requirements", response_model=TemplateRequirementRead, status_code=status.HTTP_201_CREATED)
async def add_requirement(
    template_id: uuid.UUID,
    payload: TemplateRequirementCreate,
    session: Annotated[AsyncSession, Depends(get_db_session)],
):
    return await template_service.add_requirement(session, template_id, payload)


@router.put("/requirements/{requirement_id}", response_model=TemplateRequirementRead)
async def update_requirement(
    requirement_id: uuid.UUID,
    payload: TemplateRequirementUpdate,
    session: Annotated[AsyncSession, Depends(get_db_session)],
):
    return await template_service.update_requirement(session, requirement_id, payload)


@router.delete("/requirements/{requirement_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_requirement(
    requirement_id: uuid.UUID,
    session: Annotated[AsyncSession, Depends(get_db_session)],
):
    await template_service.delete_requirement(session, requirement_id)


@router.post("/{template_id}/questions", response_model=TemplateQuestionRead, status_code=status.HTTP_201_CREATED)
async def add_question(
    template_id: uuid.UUID,
    payload: TemplateQuestionCreate,
    session: Annotated[AsyncSession, Depends(get_db_session)],
):
    return await template_service.add_question(session, template_id, payload)


@router.put("/questions/{question_id}", response_model=TemplateQuestionRead)
async def update_question(
    question_id: uuid.UUID,
    payload: TemplateQuestionUpdate,
    session: Annotated[AsyncSession, Depends(get_db_session)],
):
    return await template_service.update_question(session, question_id, payload)


@router.delete("/questions/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_question(
    question_id: uuid.UUID,
    session: Annotated[AsyncSession, Depends(get_db_session)],
):
    await template_service.delete_question(session, question_id)
