import logging

from langchain_openai import OpenAIEmbeddings

from app.core.config import settings
from app.utils.errors import MissingProviderCredentialError, ProviderRequestError

logger = logging.getLogger(__name__)

EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIMENSIONS = 1536


class OpenAIEmbeddingService:
    def __init__(self) -> None:
        if not settings.OPENAI_API_KEY:
            raise MissingProviderCredentialError("OPENAI_API_KEY is required for embeddings")

        self._client = OpenAIEmbeddings(
            model=EMBEDDING_MODEL,
            dimensions=EMBEDDING_DIMENSIONS,
            api_key=settings.OPENAI_API_KEY,
        )

    async def embed_documents(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []

        try:
            return await self._client.aembed_documents(texts)
        except Exception as exc:
            logger.exception("OpenAI embeddings request failed for %s documents", len(texts))
            raise ProviderRequestError("OpenAI embeddings request failed") from exc

    async def embed_query(self, query: str) -> list[float]:
        try:
            return await self._client.aembed_query(query)
        except Exception as exc:
            logger.exception("OpenAI query embedding request failed")
            raise ProviderRequestError("OpenAI query embedding request failed") from exc
