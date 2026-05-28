import uuid

from pydantic import BaseModel, Field


class VoiceStartResponse(BaseModel):
    interview_id: uuid.UUID
    interviewer_response: str
    audio_url: str
    audio_base64: str | None = None
    interview_status: str


class VoiceTurnResponse(BaseModel):
    interview_id: uuid.UUID
    candidate_transcript: str
    interviewer_response: str
    audio_url: str
    audio_base64: str | None = None
    interview_status: str


class VoiceSynthesisOptions(BaseModel):
    voice_id: str | None = Field(default=None, max_length=120)
    speed: str | None = Field(default="normal", max_length=40)
