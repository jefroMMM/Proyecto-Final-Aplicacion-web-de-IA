from openai import AsyncOpenAI

from app.core.config import settings
from app.utils.errors import MissingProviderCredentialError


class OpenAIClientFactory:
    def create(self) -> AsyncOpenAI:
        if not settings.OPENAI_API_KEY:
            raise MissingProviderCredentialError("OPENAI_API_KEY is not configured")
        return AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
