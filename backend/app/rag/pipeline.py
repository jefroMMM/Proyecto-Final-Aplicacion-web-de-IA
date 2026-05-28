import logging
import uuid

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document
from app.models.embedding_metadata import EmbeddingMetadata
from app.repositories import documents as document_repository
from app.repositories import embedding_metadata as embedding_repository
from app.rag.chunking import DocumentChunker
from app.rag.embeddings import OpenAIEmbeddingService
from app.services.interview_service import ensure_interview_exists
from app.utils.errors import MissingProviderCredentialError, ProviderRequestError

logger = logging.getLogger(__name__)


class RagIngestionPipeline:
    def __init__(
        self,
        chunker: DocumentChunker | None = None,
        embedding_service: OpenAIEmbeddingService | None = None,
    ) -> None:
        self._chunker = chunker or DocumentChunker()
        self._embedding_service = embedding_service or OpenAIEmbeddingService()

    async def ingest_document(
        self,
        session: AsyncSession,
        document: Document,
        *,
        delete_existing: bool = True,
    ) -> int:
        logger.info(
            "Starting RAG ingestion for document_id=%s interview_id=%s source_type=%s",
            document.id,
            document.interview_id,
            document.document_type,
        )

        if delete_existing:
            await embedding_repository.delete_embeddings_for_document(session, document.id)

        chunks = self._chunker.split(
            document.content_text,
            source_type=document.document_type,
        )
        if not chunks:
            logger.warning("No chunks generated for document_id=%s", document.id)
            return 0

        embeddings = await self._embedding_service.embed_documents(
            [chunk.chunk_text for chunk in chunks]
        )

        rows = [
            EmbeddingMetadata(
                interview_id=document.interview_id,
                document_id=document.id,
                chunk_index=chunk.chunk_index,
                chunk_text=chunk.chunk_text,
                source_type=chunk.source_type,
                page_number=chunk.page_number,
                embedding=embedding,
            )
            for chunk, embedding in zip(chunks, embeddings, strict=True)
        ]
        await embedding_repository.create_embedding_metadata_bulk(session, rows)

        logger.info(
            "Finished RAG ingestion for document_id=%s chunks_indexed=%s",
            document.id,
            len(rows),
        )
        return len(rows)

    async def reindex_interview(
        self,
        session: AsyncSession,
        interview_id: uuid.UUID,
    ) -> tuple[int, int]:
        await ensure_interview_exists(session, interview_id)
        documents = await document_repository.list_documents_by_interview_id(
            session,
            interview_id,
        )

        await embedding_repository.delete_embeddings_for_interview(session, interview_id)

        chunks_indexed = 0
        for document in documents:
            chunks_indexed += await self.ingest_document(
                session,
                document,
                delete_existing=False,
            )

        await session.commit()
        logger.info(
            "Finished RAG reindex for interview_id=%s documents_processed=%s chunks_indexed=%s",
            interview_id,
            len(documents),
            chunks_indexed,
        )
        return len(documents), chunks_indexed


def build_rag_pipeline() -> RagIngestionPipeline:
    try:
        return RagIngestionPipeline()
    except MissingProviderCredentialError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc


def map_rag_provider_error(exc: Exception) -> HTTPException:
    if isinstance(exc, ProviderRequestError):
        return HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        )
    if isinstance(exc, MissingProviderCredentialError):
        return HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        )
    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="RAG pipeline failed",
    )
