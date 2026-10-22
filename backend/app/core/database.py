import logging
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy import text
from app.core.config import settings
from app.models.base import Base

logger = logging.getLogger("evacuation_twin.database")

# Build engine arguments
engine_kwargs = {
    "echo": settings.DEBUG,
    "future": True,
}

# SQLite specific settings for concurrency
if settings.is_sqlite:
    engine_kwargs["connect_args"] = {"check_same_thread": False, "timeout": 15}
    logger.info(
        "Using SQLite local fallback database: %s",
        settings.async_database_url,
    )
else:
    logger.info(
        "Using PostgreSQL database: %s (host: %s)",
        settings.POSTGRES_DB,
        settings.POSTGRES_SERVER,
    )

# Create Async Engine
async_engine: AsyncEngine = create_async_engine(
    settings.async_database_url,
    **engine_kwargs,
)

# Async Session Factory
AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

from sqlalchemy import event

@event.listens_for(async_engine.sync_engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if settings.is_sqlite:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA busy_timeout=5000")
        cursor.close()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency for yielding transactional async database sessions."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db() -> None:
    """Initialize database tables (used for SQLite local development & test setup)."""
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database schema initialized successfully.")


async def check_db_connectivity() -> dict:
    """Execute a simple query to verify database connectivity and return metadata."""
    try:
        async with AsyncSessionLocal() as session:
            result = await session.execute(text("SELECT 1"))
            val = result.scalar()
            return {
                "connected": val == 1,
                "dialect": async_engine.dialect.name,
                "is_sqlite_fallback": settings.is_sqlite,
                "url_obscured": settings.async_database_url.split("@")[-1]
                if "@" in settings.async_database_url
                else settings.async_database_url,
            }
    except Exception as exc:
        logger.error("Database connectivity check failed: %s", exc)
        return {
            "connected": False,
            "dialect": async_engine.dialect.name,
            "is_sqlite_fallback": settings.is_sqlite,
            "error": str(exc),
        }
