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
