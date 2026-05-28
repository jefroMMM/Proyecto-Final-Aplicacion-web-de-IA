from dataclasses import dataclass

import httpx

from app.core.config import settings
from app.utils.errors import MissingProviderCredentialError, ProviderRequestError


@dataclass(slots=True)
class CartesiaSynthesizer:
    base_url: str = "https://api.cartesia.ai"

    async def synthesize(self, text: str, voice_id: str) -> bytes:
        if not settings.CARTESIA_API_KEY:
            raise MissingProviderCredentialError("CARTESIA_API_KEY is not configured")

        payload = {
            "model_id": "sonic-2",
            "transcript": text,
            "voice": {"mode": "id", "id": voice_id},
            "output_format": {
                "container": "wav",
                "encoding": "pcm_s16le",
                "sample_rate": settings.ASSEMBLYAI_SAMPLE_RATE,
            },
        }
        headers = {
            "Authorization": f"Bearer {settings.CARTESIA_API_KEY}",
            "Cartesia-Version": "2024-06-10",
        }

        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                f"{self.base_url}/tts/bytes",
                json=payload,
                headers=headers,
            )

        if response.is_error:
            raise ProviderRequestError("Cartesia synthesis request failed")
        return response.content
