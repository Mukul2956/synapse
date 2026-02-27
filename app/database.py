from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.config import settings


# ─── AsyncEngine with connection pooling ────────────────────────────────────
engine = create_async_engine(
    settings.DATABASE_URL,
    pool_size=20,
    max_overflow=10,
    echo=(settings.ENVIRONMENT == "development"),
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


# ─── Base for all ORM models ────────────────────────────────────────────────
class Base(DeclarativeBase):
    pass


# ─── Dependency – use inside FastAPI route handlers ────────────────────────
async def get_db() -> AsyncSession:  # type: ignore[override]
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
