import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.schemas.user import UserCreate


async def get_user_by_id(session: AsyncSession, user_id: uuid.UUID) -> User | None:
    return await session.get(User, user_id)


async def get_user_by_email(session: AsyncSession, email: str) -> User | None:
    result = await session.execute(select(User).where(User.email == email.lower()))
    return result.scalar_one_or_none()


async def get_or_create_user(session: AsyncSession, payload: UserCreate) -> User:
    existing_user = await get_user_by_email(session, str(payload.email))
    if existing_user:
        return existing_user

    user = User(name=payload.name, email=str(payload.email).lower())
    session.add(user)
    await session.flush()
    return user
