import asyncio
import logging

import httpx
from fastapi import HTTPException, status

from app.core.config import settings

logger = logging.getLogger(__name__)


class CartesiaService:
    base_url = "https://api.cartesia.ai"

    def __init__(self, voice_id: str | None = None) -> None:
        if not settings.CARTESIA_API_KEY:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="CARTESIA_API_KEY is not configured",
            )

        self._voice_id = voice_id or settings.CARTESIA_VOICE_ID
        if not self._voice_id:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="CARTESIA_VOICE_ID is not configured and no voice_id was provided",
            )

    async def synthesize(
        self,
        text: str,
        *,
        speed: str | None = "normal",
    ) -> bytes:
        payload = {
            "model_id": settings.CARTESIA_MODEL_ID,
            "transcript": text,
            "voice": {"id": self._voice_id},
            "output_format": {
                "container": settings.CARTESIA_OUTPUT_CONTAINER,
                "encoding": settings.CARTESIA_OUTPUT_ENCODING,
                "sample_rate": settings.CARTESIA_SAMPLE_RATE,
            },
            "speed": speed or "normal",
        }
        headers = {
            "Authorization": f"Bearer {settings.CARTESIA_API_KEY}",
            "Cartesia-Version": settings.CARTESIA_VERSION,
            "Content-Type": "application/json",
        }

        logger.info("Requesting Cartesia TTS model=%s", settings.CARTESIA_MODEL_ID)
        response = await post_with_retry(
            f"{self.base_url}/tts/bytes",
            payload=payload,
            headers=headers,
        )

        if response.is_error:
            logger.error("Cartesia TTS failed: %s", response.text)
            detail = "Cartesia text-to-speech request failed"
            if response.status_code in {401, 403}:
                detail = (
                    "Cartesia rejected the API key or access token. "
                    "Check CARTESIA_API_KEY in .env and restart Docker."
                )
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=detail,
            )

        if not response.content:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Cartesia returned empty audio",
            )
        return response.content


async def post_with_retry(
    url: str,
    *,
    payload: dict,
    headers: dict[str, str],
    attempts: int = 3,
) -> httpx.Response:
    last_response: httpx.Response | None = None
    async with httpx.AsyncClient(timeout=60) as client:
        for attempt in range(1, attempts + 1):
            response = await client.post(url, json=payload, headers=headers)
            last_response = response
            if response.status_code < 500:
                return response
            logger.warning(
                "Cartesia request attempt %s/%s failed with %s",
                attempt,
                attempts,
                response.status_code,
            )
            await asyncio.sleep(0.8 * attempt)
    if last_response is None:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Cartesia text-to-speech request did not return a response",
        )
    return last_response
