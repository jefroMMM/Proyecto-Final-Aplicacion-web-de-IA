from langchain_postgres import PGVector
from langchain_openai import OpenAIEmbeddings

from app.core.config import settings
from app.utils.errors import MissingProviderCredentialError


def build_vector_store(collection_name: str = "technical_interview_knowledge") -> PGVector:
    if not settings.OPENAI_API_KEY:
        raise MissingProviderCredentialError("OPENAI_API_KEY is required for embeddings")

    return PGVector(
        embeddings=OpenAIEmbeddings(api_key=settings.OPENAI_API_KEY),
        collection_name=collection_name,
        connection=settings.DATABASE_URL.replace("+asyncpg", ""),
        use_jsonb=True,
    )
