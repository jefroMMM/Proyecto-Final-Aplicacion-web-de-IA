from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.router import api_router
from app.core.config import settings
from app.db.session import close_db_engine, init_db


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    await init_db()
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
