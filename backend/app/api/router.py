from fastapi import APIRouter

from app.audio import audio_routes
from app.api.routes import (
    health,
    interview_workflow,
    interviews,
    rag,
    reports,
    transcripts,
    upload,
)

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(interviews.router)
api_router.include_router(upload.router)
api_router.include_router(reports.router)
api_router.include_router(transcripts.router)
api_router.include_router(rag.router)
api_router.include_router(interview_workflow.router)
api_router.include_router(audio_routes.router)
