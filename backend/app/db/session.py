from collections.abc import AsyncGenerator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.db.base import Base
import app.models  # noqa: F401

engine = create_async_engine(settings.DATABASE_URL, pool_pre_ping=True)
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    autoflush=False,
    expire_on_commit=False,
)


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session


async def init_db() -> None:
    async with engine.begin() as connection:
        await connection.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        await connection.run_sync(Base.metadata.create_all)
        await connection.execute(
            text(
                "ALTER TABLE IF EXISTS interviews "
                "ADD COLUMN IF NOT EXISTS template_id uuid, "
                "ADD COLUMN IF NOT EXISTS candidate_email varchar(320), "
                "ADD COLUMN IF NOT EXISTS cv_document_id uuid, "
                "ADD COLUMN IF NOT EXISTS initial_cv_score numeric(10,2) DEFAULT 0 NOT NULL, "
                "ADD COLUMN IF NOT EXISTS question_score numeric(10,2) DEFAULT 0 NOT NULL, "
                "ADD COLUMN IF NOT EXISTS bonus_score numeric(10,2) DEFAULT 0 NOT NULL, "
                "ADD COLUMN IF NOT EXISTS final_score numeric(10,2) DEFAULT 0 NOT NULL, "
                "ADD COLUMN IF NOT EXISTS max_score numeric(10,2) DEFAULT 0 NOT NULL"
            )
        )
        await connection.execute(
            text(
                "ALTER TABLE IF EXISTS reports "
                "ADD COLUMN IF NOT EXISTS final_score numeric(10,2) DEFAULT 0 NOT NULL, "
                "ADD COLUMN IF NOT EXISTS max_score numeric(10,2) DEFAULT 0 NOT NULL, "
                "ADD COLUMN IF NOT EXISTS percentage numeric(10,2) DEFAULT 0 NOT NULL"
            )
        )
        await connection.execute(
            text(
                "ALTER TABLE IF EXISTS interview_answers "
                "ADD COLUMN IF NOT EXISTS ai_question_score numeric(10,2), "
                "ADD COLUMN IF NOT EXISTS manual_question_score numeric(10,2)"
            )
        )
        await connection.execute(
            text(
                "UPDATE interview_answers "
                "SET ai_question_score = final_question_score "
                "WHERE ai_question_score IS NULL"
            )
        )
        await connection.execute(
            text(
                "ALTER TABLE IF EXISTS interview_answers "
                "ALTER COLUMN ai_question_score SET DEFAULT 0, "
                "ALTER COLUMN ai_question_score SET NOT NULL"
            )
        )
        await connection.execute(
            text(
                "ALTER TABLE IF EXISTS template_questions "
                "ADD COLUMN IF NOT EXISTS source varchar(20) DEFAULT 'template' NOT NULL, "
                "ADD COLUMN IF NOT EXISTS generated_for_interview_id uuid"
            )
        )
        await connection.execute(
            text(
                "ALTER TABLE IF EXISTS embeddings_metadata "
                "ADD COLUMN IF NOT EXISTS embedding vector(1536)"
            )
        )
        await connection.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_embeddings_metadata_embedding_hnsw "
                "ON embeddings_metadata USING hnsw (embedding vector_cosine_ops)"
            )
        )


async def close_db_engine() -> None:
    await engine.dispose()
