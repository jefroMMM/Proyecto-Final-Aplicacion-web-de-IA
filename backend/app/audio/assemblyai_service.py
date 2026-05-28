import asyncio
import logging

import httpx
from fastapi import HTTPException, UploadFile, status

from app.core.config import settings

logger = logging.getLogger(__name__)

SUPPORTED_AUDIO_TYPES = {
    "audio/webm",
    "audio/wav",
    "audio/x-wav",
    "audio/mpeg",
    "audio/mp3",
    "audio/mp4",
    "audio/ogg",
    "video/webm",
}


class AssemblyAIService:
    base_url = "https://api.assemblyai.com/v2"

    def __init__(self) -> None:
        if not settings.ASSEMBLYAI_API_KEY:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="ASSEMBLYAI_API_KEY is not configured",
            )
        self._headers = {"authorization": settings.ASSEMBLYAI_API_KEY}

    async def transcribe_upload(self, file: UploadFile) -> str:
        validate_audio_file(file)
        content = await file.read()
        await file.seek(0)

        upload_url = await self._upload_audio(content)
        transcript_id = await self._request_transcript(upload_url)
        return await self._poll_transcript(transcript_id)

    async def _upload_audio(self, content: bytes) -> str:
        logger.info("Uploading audio to AssemblyAI")
        response = await post_with_retry(
            f"{self.base_url}/upload",
            headers=self._headers,
            content=content,
            timeout=60,
        )

        if response.is_error:
            logger.error("AssemblyAI upload failed: %s", response.text)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="AssemblyAI audio upload failed",
            )

        upload_url = response.json().get("upload_url")
        if not upload_url:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="AssemblyAI did not return an upload URL",
            )
        return upload_url

    async def _request_transcript(self, upload_url: str) -> str:
        payload = {
            "audio_url": upload_url,
            "speech_model": settings.ASSEMBLYAI_SPEECH_MODEL,
        }

        if settings.ASSEMBLYAI_LANGUAGE_DETECTION:
            payload["language_detection"] = True
        elif settings.ASSEMBLYAI_LANGUAGE_CODE:
            payload["language_code"] = settings.ASSEMBLYAI_LANGUAGE_CODE

        logger.info(
            "Requesting AssemblyAI transcript speech_model=%s language_detection=%s language_code=%s sample_rate=%s",
            settings.ASSEMBLYAI_SPEECH_MODEL,
            settings.ASSEMBLYAI_LANGUAGE_DETECTION,
            settings.ASSEMBLYAI_LANGUAGE_CODE,
            settings.ASSEMBLYAI_SAMPLE_RATE,
        )
        response = await post_with_retry(
            f"{self.base_url}/transcript",
            headers=self._headers,
            json=payload,
            timeout=30,
        )

        if response.is_error:
            logger.error("AssemblyAI transcript request failed: %s", response.text)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="AssemblyAI transcript request failed",
            )

        transcript_id = response.json().get("id")
        if not transcript_id:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="AssemblyAI did not return a transcript id",
            )
        return transcript_id

    async def _poll_transcript(
        self,
        transcript_id: str,
        *,
        timeout_seconds: int = 120,
        interval_seconds: float = 3.0,
    ) -> str:
        deadline = asyncio.get_running_loop().time() + timeout_seconds

        async with httpx.AsyncClient(timeout=30) as client:
            while True:
                response = await client.get(
                    f"{self.base_url}/transcript/{transcript_id}",
                    headers=self._headers,
                )
                if response.is_error:
                    logger.error("AssemblyAI polling failed: %s", response.text)
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail="AssemblyAI transcript polling failed",
                    )

                payload = response.json()
                transcript_status = payload.get("status")

                if transcript_status == "completed":
                    text = (payload.get("text") or "").strip()
                    if not text:
                        raise HTTPException(
                            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail="AssemblyAI returned an empty transcript",
                        )
                    return text

                if transcript_status == "error":
                    logger.error("AssemblyAI transcription error: %s", payload.get("error"))
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail="AssemblyAI transcription failed",
                    )

                if asyncio.get_running_loop().time() >= deadline:
                    raise HTTPException(
                        status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                        detail="AssemblyAI transcription timed out",
                    )

                await asyncio.sleep(interval_seconds)


def validate_audio_file(file: UploadFile) -> None:
    if file.content_type not in SUPPORTED_AUDIO_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=(
                "Unsupported audio type. Use webm, wav, mp3, mp4, or ogg audio."
            ),
        )


async def post_with_retry(
    url: str,
    *,
    headers: dict[str, str],
    content: bytes | None = None,
    json: dict | None = None,
    timeout: int = 30,
    attempts: int = 3,
) -> httpx.Response:
    last_response: httpx.Response | None = None
    async with httpx.AsyncClient(timeout=timeout) as client:
        for attempt in range(1, attempts + 1):
            response = await client.post(url, headers=headers, content=content, json=json)
            last_response = response
            if response.status_code < 500:
                return response
            logger.warning(
                "AssemblyAI POST attempt %s/%s failed with %s",
                attempt,
                attempts,
                response.status_code,
            )
            await asyncio.sleep(0.8 * attempt)
    return last_response
