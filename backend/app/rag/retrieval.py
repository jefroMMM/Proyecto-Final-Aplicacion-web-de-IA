import uuid

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories import embedding_metadata as embedding_repository
from app.rag.embeddings import OpenAIEmbeddingService
from app.schemas.rag import RagSearchResult, SourceType
from app.services.interview_service import ensure_interview_exists
from app.utils.errors import MissingProviderCredentialError, ProviderRequestError


async def retrieve_context(
    session: AsyncSession,
    *,
    interview_id: uuid.UUID,
    query: str,
    source_type: SourceType | None = None,
    top_k: int = 5,
) -> list[RagSearchResult]:
    await ensure_interview_exists(session, interview_id)

    try:
        embedding_service = OpenAIEmbeddingService()
        query_embedding = await embedding_service.embed_query(query)
    except MissingProviderCredentialError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc
    except ProviderRequestError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

    matches = await embedding_repository.semantic_search(
        session,
        interview_id=interview_id,
        query_embedding=query_embedding,
        source_type=source_type,
        top_k=top_k,
    )

    return [
        RagSearchResult(
            chunk_text=metadata.chunk_text,
            source_type=metadata.source_type,
            score=cosine_distance_to_score(distance),
            metadata={
                "id": str(metadata.id),
                "interview_id": str(metadata.interview_id),
                "document_id": str(metadata.document_id),
                "chunk_index": metadata.chunk_index,
                "page_number": metadata.page_number,
                "distance": distance,
            },
        )
        for metadata, distance in matches
    ]


def cosine_distance_to_score(distance: float) -> float:
    return round(max(0.0, min(1.0, 1.0 - distance)), 4)


async def retrieve_context_text(
    session: AsyncSession,
    *,
    interview_id: uuid.UUID,
    query: str,
    source_type: SourceType | None = None,
    top_k: int = 5,
) -> str:
    results = await retrieve_context(
        session,
        interview_id=interview_id,
        query=query,
        source_type=source_type,
        top_k=top_k,
    )
    return "\n\n".join(result.chunk_text for result in results)
