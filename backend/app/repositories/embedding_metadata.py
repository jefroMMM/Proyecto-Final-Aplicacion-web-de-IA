import uuid

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.embedding_metadata import EmbeddingMetadata


async def delete_embeddings_for_document(
    session: AsyncSession,
    document_id: uuid.UUID,
) -> None:
    await session.execute(
        delete(EmbeddingMetadata).where(EmbeddingMetadata.document_id == document_id)
    )


async def delete_embeddings_for_interview(
    session: AsyncSession,
    interview_id: uuid.UUID,
) -> None:
    await session.execute(
        delete(EmbeddingMetadata).where(EmbeddingMetadata.interview_id == interview_id)
    )


async def create_embedding_metadata_bulk(
    session: AsyncSession,
    rows: list[EmbeddingMetadata],
) -> list[EmbeddingMetadata]:
    session.add_all(rows)
    await session.flush()
    return rows


async def semantic_search(
    session: AsyncSession,
    *,
    interview_id: uuid.UUID,
    query_embedding: list[float],
    source_type: str | None,
    top_k: int,
) -> list[tuple[EmbeddingMetadata, float]]:
    distance = EmbeddingMetadata.embedding.cosine_distance(query_embedding).label("distance")
    statement = (
        select(EmbeddingMetadata, distance)
        .where(
            EmbeddingMetadata.interview_id == interview_id,
            EmbeddingMetadata.embedding.is_not(None),
        )
        .order_by(distance.asc())
        .limit(top_k)
    )

    if source_type:
        statement = statement.where(EmbeddingMetadata.source_type == source_type)

    result = await session.execute(statement)
    return [(row[0], float(row[1])) for row in result.all()]
