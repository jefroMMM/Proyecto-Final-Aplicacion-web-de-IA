from openai import AsyncOpenAI
from langsmith.wrappers import wrap_openai

from app.core.config import settings
from app.utils.errors import MissingProviderCredentialError


class OpenAIClientFactory:
    def create(self) -> AsyncOpenAI:
        if not settings.OPENAI_API_KEY:
            raise MissingProviderCredentialError("OPENAI_API_KEY is not configured")
        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        if settings.langsmith_tracing_enabled:
            return wrap_openai(client)
        return client
