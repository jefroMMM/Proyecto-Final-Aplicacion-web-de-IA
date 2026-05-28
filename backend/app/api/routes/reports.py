import uuid
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db_session
from app.schemas.report import ReportRead
from app.services import report_service

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/{interview_id}", response_model=ReportRead)
async def get_report(
    interview_id: uuid.UUID,
    session: Annotated[AsyncSession, Depends(get_db_session)],
):
    return await report_service.get_report_for_interview(session, interview_id)
