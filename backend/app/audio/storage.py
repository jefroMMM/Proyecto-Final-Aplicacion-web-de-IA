import base64
import uuid
from pathlib import Path

from fastapi import UploadFile

from app.core.config import settings


def build_public_audio_url(filename: str) -> str:
    return f"{settings.PUBLIC_BACKEND_URL.rstrip('/')}/storage/audio/{filename}"


async def save_uploaded_audio(file: UploadFile, suffix: str) -> str:
    extension = Path(file.filename or "").suffix.lower() or ".webm"
    filename = f"{uuid.uuid4()}-{suffix}{extension}"
    target = settings.audio_storage_path / filename
    target.parent.mkdir(parents=True, exist_ok=True)

    content = await file.read()
    target.write_bytes(content)
    await file.seek(0)
    return build_public_audio_url(filename)


def save_generated_audio(content: bytes, suffix: str, extension: str = ".wav") -> str:
    filename = f"{uuid.uuid4()}-{suffix}{extension}"
    target = settings.audio_storage_path / filename
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(content)
    return build_public_audio_url(filename)


def encode_audio_base64(content: bytes) -> str:
    return base64.b64encode(content).decode("ascii")
