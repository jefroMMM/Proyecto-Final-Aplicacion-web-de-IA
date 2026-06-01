from contextlib import asynccontextmanager
from collections.abc import AsyncIterator
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.router import api_router
from app.core.config import settings
from app.db.session import close_db_engine, init_db
from app.services.demo_seed_service import seed_demo_templates_if_enabled


def configure_langsmith_env() -> None:
    os.environ.setdefault("LANGSMITH_ENDPOINT", settings.LANGSMITH_ENDPOINT)
    os.environ.setdefault("LANGSMITH_PROJECT", settings.effective_langsmith_project)
    os.environ.setdefault(
        "LANGSMITH_TRACING",
        str(settings.langsmith_tracing_enabled).lower(),
    )
    os.environ.setdefault(
        "LANGCHAIN_TRACING_V2",
        str(settings.langsmith_tracing_enabled).lower(),
    )
    os.environ.setdefault("LANGCHAIN_PROJECT", settings.effective_langsmith_project)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    configure_langsmith_env()
    await init_db()
    await seed_demo_templates_if_enabled()
    yield
    await close_db_engine()


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.API_VERSION,
        description="Voice-based AI technical interview platform.",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    settings.audio_storage_path.mkdir(parents=True, exist_ok=True)
    app.mount(
        "/storage/audio",
        StaticFiles(directory=settings.audio_storage_path),
        name="audio-storage",
    )

    app.include_router(api_router)

    @app.get("/", tags=["health"])
    async def root() -> dict[str, str]:
        return {
            "status": "ok",
            "service": settings.PROJECT_NAME,
            "docs": "/docs",
            "health": "/health",
        }

    return app


app = create_app()
