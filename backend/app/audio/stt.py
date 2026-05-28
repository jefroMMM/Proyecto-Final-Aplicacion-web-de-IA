from dataclasses import dataclass

import httpx

from app.core.config import settings
from app.utils.errors import MissingProviderCredentialError, ProviderRequestError


@dataclass(slots=True)
class AssemblyAITranscriber:
    base_url: str = "https://api.assemblyai.com/v2"

    async def transcribe_uploaded_audio(self, upload_url: str) -> str:
        if not settings.ASSEMBLYAI_API_KEY:
            raise MissingProviderCredentialError("ASSEMBLYAI_API_KEY is not configured")

        payload = {
            "audio_url": upload_url,
            "speech_model": settings.ASSEMBLYAI_SPEECH_MODEL,
            "language_code": settings.ASSEMBLYAI_LANGUAGE_CODE,
            "language_detection": settings.ASSEMBLYAI_LANGUAGE_DETECTION,
        }
        headers = {"authorization": settings.ASSEMBLYAI_API_KEY}

        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                f"{self.base_url}/transcript",
                json=payload,
                headers=headers,
            )

        if response.is_error:
            raise ProviderRequestError("AssemblyAI transcript request failed")

        transcript_id = response.json().get("id")
        if not transcript_id:
            raise ProviderRequestError("AssemblyAI did not return a transcript id")
        return transcript_id
