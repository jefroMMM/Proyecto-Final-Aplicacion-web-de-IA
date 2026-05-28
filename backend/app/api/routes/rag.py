import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db_session
from app.rag.pipeline import build_rag_pipeline, map_rag_provider_error
from app.rag.retrieval import retrieve_context
from app.schemas.rag import RagReindexResponse, RagSearchRequest, RagSearchResponse

router = APIRouter(prefix="/rag", tags=["rag"])


@router.post("/reindex/{interview_id}", response_model=RagReindexResponse)
async def reindex_interview(
    interview_id: uuid.UUID,
    session: Annotated[AsyncSession, Depends(get_db_session)],
):
    try:
        pipeline = build_rag_pipeline()
        documents_processed, chunks_indexed = await pipeline.reindex_interview(
            session,
            interview_id,
        )
    except HTTPException:
        await session.rollback()
        raise
    except Exception as exc:
        await session.rollback()
        raise map_rag_provider_error(exc) from exc

    return RagReindexResponse(
        interview_id=interview_id,
        documents_processed=documents_processed,
        chunks_indexed=chunks_indexed,
    )


@router.post("/search/{interview_id}", response_model=RagSearchResponse)
async def search_interview_context(
    interview_id: uuid.UUID,
    payload: RagSearchRequest,
    session: Annotated[AsyncSession, Depends(get_db_session)],
):
    results = await retrieve_context(
        session,
        interview_id=interview_id,
        query=payload.query,
        source_type=payload.source_type,
        top_k=payload.top_k,
    )
    return RagSearchResponse(results=results)
