from functools import lru_cache
from pathlib import Path
from typing import Annotated

from pydantic import Field, computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=True,
    )

    PROJECT_NAME: str = "AI Technical Interviewer Voice System"
    API_VERSION: str = "0.1.0"
    ENVIRONMENT: str = "development"

    BACKEND_CORS_ORIGINS: str = "http://localhost:3000,http://frontend:3000"
    DATABASE_URL: Annotated[str, Field(min_length=1)] = (
        "postgresql+asyncpg://postgres:postgres@postgres:5432/interviewer"
    )

    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    ASSEMBLYAI_API_KEY: str = ""
    CARTESIA_API_KEY: str = ""
    CARTESIA_VOICE_ID: str = ""
    CARTESIA_MODEL_ID: str = "sonic-2"
    CARTESIA_VERSION: str = "2026-03-01"
    CARTESIA_OUTPUT_CONTAINER: str = "wav"
    CARTESIA_OUTPUT_ENCODING: str = "pcm_f32le"
    CARTESIA_SAMPLE_RATE: int = 44100

    ASSEMBLYAI_SPEECH_MODEL: str = "best"
    ASSEMBLYAI_LANGUAGE_CODE: str = "es"
    ASSEMBLYAI_LANGUAGE_DETECTION: bool = False
    ASSEMBLYAI_SAMPLE_RATE: int = 16000

    NEXT_PUBLIC_API_URL: str = "http://localhost:8000"
    PUBLIC_BACKEND_URL: str = "http://localhost:8000"
    AUDIO_STORAGE_DIR: str = "storage/audio"
    SEED_DEMO_TEMPLATES: bool = True

    @computed_field
    @property
    def cors_origins(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.BACKEND_CORS_ORIGINS.split(",")
            if origin.strip()
        ]

    @computed_field
    @property
    def audio_storage_path(self) -> Path:
        return Path(self.AUDIO_STORAGE_DIR)


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
