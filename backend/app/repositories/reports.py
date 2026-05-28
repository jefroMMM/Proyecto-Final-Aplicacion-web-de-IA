import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.report import Report
from app.schemas.interview_agent import InterviewReport


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
    report: InterviewReport,
) -> Report:
    existing_report = await get_report_by_interview_id(session, interview_id)
    payload = report.model_dump()

    if existing_report:
        existing_report.report_json = payload
        existing_report.technical_score = report.technical_score
        existing_report.communication_score = report.communication_score
        existing_report.seniority_estimation = report.seniority_estimation
        existing_report.recommendation = report.recommendation
        await session.flush()
        return existing_report

    db_report = Report(
        interview_id=interview_id,
        report_json=payload,
        technical_score=report.technical_score,
        communication_score=report.communication_score,
        seniority_estimation=report.seniority_estimation,
        recommendation=report.recommendation,
    )
    session.add(db_report)
    await session.flush()
    return db_report
