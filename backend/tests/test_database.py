import uuid
import pytest
from sqlalchemy import select, text
from sqlalchemy.orm import Mapped, mapped_column
from app.core.config import Settings
from app.core.database import (
    AsyncSessionLocal,
    async_engine,
    check_db_connectivity,
    get_db,
    init_db,
)
from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


# Dummy model for testing Base, UUIDPrimaryKeyMixin, and TimestampMixin
class SampleModel(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "test_sample_models"
    name: Mapped[str] = mapped_column(nullable=False)


def test_settings_database_urls():
    """Verify settings properties for SQLite fallback and PostgreSQL URL generation."""
    # Default without PG credentials -> SQLite fallback
    local_settings = Settings(
        DATABASE_URL=None,
        POSTGRES_SERVER=None,
        POSTGRES_USER=None,
        POSTGRES_DB=None,
    )
    assert local_settings.is_sqlite is True
    assert "sqlite+aiosqlite" in local_settings.async_database_url
    assert "sqlite:///" in local_settings.sync_database_url

    # Configured PostgreSQL credentials
    pg_settings = Settings(
        POSTGRES_SERVER="db.internal",
        POSTGRES_PORT=5432,
        POSTGRES_USER="evac_user",
        POSTGRES_PASSWORD="secret_password",
        POSTGRES_DB="evacuation_db",
    )
    assert pg_settings.is_sqlite is False
    assert (
        pg_settings.async_database_url
        == "postgresql+asyncpg://evac_user:secret_password@db.internal:5432/evacuation_db"
    )
    assert (
        pg_settings.sync_database_url
        == "postgresql://evac_user:secret_password@db.internal:5432/evacuation_db"
    )


@pytest.mark.asyncio
async def test_database_connectivity_check():
    """Verify async database connection and dialect detection."""
    status = await check_db_connectivity()
    assert status["connected"] is True
    assert status["dialect"] == "sqlite"
    assert status["is_sqlite_fallback"] is True


@pytest.mark.asyncio
async def test_init_db_and_session_crud():
    """Verify init_db schema generation and async session transactions with mixins."""
    await init_db()

    # Insert a record using AsyncSessionLocal
    async with AsyncSessionLocal() as session:
        item = SampleModel(name="Fire Exit A1")
        session.add(item)
        await session.commit()
        await session.refresh(item)

        item_id = item.id
        assert isinstance(item_id, uuid.UUID)
        assert item.created_at is not None
        assert item.updated_at is not None
        assert item.name == "Fire Exit A1"

    # Query back using get_db generator
    async for session in get_db():
        result = await session.execute(
            select(SampleModel).where(SampleModel.id == item_id)
        )
        queried = result.scalar_one_or_none()
        assert queried is not None
        assert queried.name == "Fire Exit A1"
        break
