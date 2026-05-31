import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.candidate_interview_token import CandidateInterviewToken


async def create_token(
    session: AsyncSession,
    *,
    interview_id: uuid.UUID,
    token_hash: str,
    expires_at: datetime,
) -> CandidateInterviewToken:
    token = CandidateInterviewToken(
        interview_id=interview_id,
        token_hash=token_hash,
        expires_at=expires_at,
    )
    session.add(token)
    await session.flush()
    return token


async def get_active_token_by_hash(
    session: AsyncSession,
    token_hash: str,
) -> CandidateInterviewToken | None:
    now = datetime.now(UTC)
    result = await session.execute(
        select(CandidateInterviewToken).where(
            CandidateInterviewToken.token_hash == token_hash,
            CandidateInterviewToken.used_at.is_(None),
            CandidateInterviewToken.expires_at > now,
        )
    )
    return result.scalar_one_or_none()


async def mark_token_used(session: AsyncSession, token: CandidateInterviewToken) -> None:
    token.used_at = datetime.now(UTC)
    await session.flush()
