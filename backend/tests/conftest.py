import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import AsyncSessionLocal, init_db


@pytest_asyncio.fixture(autouse=True, loop_scope="function")
async def setup_db():
    await init_db()

@pytest.fixture
def client():
    """Synchronous test client fixture for FastAPI endpoints."""
    with TestClient(app) as test_client:
        yield test_client


@pytest_asyncio.fixture
async def session():
    await init_db()
    async with AsyncSessionLocal() as session:
        yield session
