import uuid

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.candidate_skill_match import CandidateSkillMatch


async def replace_skill_matches(
    session: AsyncSession,
    *,
    interview_id: uuid.UUID,
    matches: list[CandidateSkillMatch],
) -> list[CandidateSkillMatch]:
    await session.execute(
        delete(CandidateSkillMatch).where(CandidateSkillMatch.interview_id == interview_id)
    )
    session.add_all(matches)
    await session.flush()
    return matches


async def list_skill_matches(
    session: AsyncSession,
    interview_id: uuid.UUID,
) -> list[CandidateSkillMatch]:
    result = await session.execute(
        select(CandidateSkillMatch)
        .where(CandidateSkillMatch.interview_id == interview_id)
        .order_by(CandidateSkillMatch.created_at.asc())
    )
    return list(result.scalars().all())


async def get_match_for_requirement(
    session: AsyncSession,
    *,
    interview_id: uuid.UUID,
    requirement_id: uuid.UUID,
) -> CandidateSkillMatch | None:
    result = await session.execute(
        select(CandidateSkillMatch).where(
            CandidateSkillMatch.interview_id == interview_id,
            CandidateSkillMatch.requirement_id == requirement_id,
        )
    )
    return result.scalar_one_or_none()
