import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload, with_loader_criteria

from app.models.interview_answer import InterviewAnswer
from app.models.interview import Interview
from app.models.interview_template import InterviewTemplate
from app.models.template_question import TemplateQuestion
from app.models.user import User


async def create_interview(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    candidate_name: str,
    job_title: str,
    template_id: uuid.UUID | None = None,
    candidate_email: str | None = None,
) -> Interview:
    interview = Interview(
        user_id=user_id,
        template_id=template_id,
        candidate_name=candidate_name,
        candidate_email=candidate_email,
        job_title=job_title,
        status="created",
    )
    session.add(interview)
    await session.flush()
    return interview


async def list_interviews(session: AsyncSession, *, archived: bool = False) -> list[Interview]:
    query = (
        select(Interview)
        .options(
            selectinload(Interview.template).selectinload(InterviewTemplate.requirements),
            selectinload(Interview.template).selectinload(InterviewTemplate.questions),
            with_loader_criteria(TemplateQuestion, TemplateQuestion.generated_for_interview_id.is_(None)),
        )
    )
    if archived:
        query = query.where(Interview.archived_at.is_not(None))
    else:
        query = query.where(Interview.archived_at.is_(None))

    result = await session.execute(
        query
        .order_by(Interview.created_at.desc())
    )
    return list(result.scalars().all())


async def get_interview_by_id(
    session: AsyncSession,
    interview_id: uuid.UUID,
) -> Interview | None:
    return await session.get(Interview, interview_id)


async def get_interview_detail(
    session: AsyncSession,
    interview_id: uuid.UUID,
) -> Interview | None:
    result = await session.execute(
        select(Interview)
        .where(Interview.id == interview_id)
        .options(
            selectinload(Interview.user),
            selectinload(Interview.template).selectinload(InterviewTemplate.requirements),
            selectinload(Interview.template)
            .selectinload(InterviewTemplate.questions)
            .selectinload(TemplateQuestion.requirement),
            selectinload(Interview.documents),
            selectinload(Interview.transcripts),
            selectinload(Interview.report),
            selectinload(Interview.answers).options(joinedload(InterviewAnswer.question)),
            selectinload(Interview.candidate_skill_matches),
            with_loader_criteria(
                TemplateQuestion,
                (TemplateQuestion.generated_for_interview_id.is_(None))
                | (TemplateQuestion.generated_for_interview_id == interview_id),
            ),
        )
    )
    return result.scalar_one_or_none()


async def update_interview_status(
    session: AsyncSession,
    interview_id: uuid.UUID,
    status: str,
) -> None:
    interview = await session.get(Interview, interview_id)
    if interview:
        interview.status = status
        await session.flush()


async def set_interview_archived(
    session: AsyncSession,
    *,
    interview_id: uuid.UUID,
    archived: bool,
) -> Interview | None:
    interview = await session.get(Interview, interview_id)
    if not interview:
        return None
    interview.archived_at = datetime.now(UTC) if archived else None
    await session.flush()
    return interview


async def get_default_user_id(session: AsyncSession) -> uuid.UUID:
    result = await session.execute(select(User).order_by(User.created_at.asc()))
    user = result.scalars().first()
    if user:
        return user.id
    default_user = User(name="System Recruiter", email="recruiter@local.demo")
    session.add(default_user)
    await session.flush()
    return default_user.id
