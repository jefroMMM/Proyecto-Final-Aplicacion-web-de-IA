import uuid

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories import reports as report_repository
from app.services.interview_service import ensure_interview_exists


async def get_report_for_interview(session: AsyncSession, interview_id: uuid.UUID):
    await ensure_interview_exists(session, interview_id)
    report = await report_repository.get_report_by_interview_id(session, interview_id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found for this interview",
        )
    return report
