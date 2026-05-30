import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.report import Report
async def get_report_by_interview_id(
    session: AsyncSession,
    interview_id: uuid.UUID,
) -> Report | None:
    result = await session.execute(
        select(Report).where(Report.interview_id == interview_id)
    )
    return result.scalar_one_or_none()


async def upsert_report(
    session: AsyncSession,
    *,
    interview_id: uuid.UUID,
    report_json: dict,
    technical_score: int,
    communication_score: int,
    seniority_estimation: str,
    recommendation: str,
    final_score: float = 0,
    max_score: float = 0,
    percentage: float = 0,
) -> Report:
    existing_report = await get_report_by_interview_id(session, interview_id)
    payload = report_json

    if existing_report:
        existing_report.report_json = payload
        existing_report.technical_score = technical_score
        existing_report.communication_score = communication_score
        existing_report.seniority_estimation = seniority_estimation
        existing_report.recommendation = recommendation
        existing_report.final_score = final_score
        existing_report.max_score = max_score
        existing_report.percentage = percentage
        await session.flush()
        return existing_report

    db_report = Report(
        interview_id=interview_id,
        report_json=payload,
        technical_score=technical_score,
        communication_score=communication_score,
        seniority_estimation=seniority_estimation,
        recommendation=recommendation,
        final_score=final_score,
        max_score=max_score,
        percentage=percentage,
    )
    session.add(db_report)
    await session.flush()
    return db_report
