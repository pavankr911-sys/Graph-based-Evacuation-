import logging
from typing import List, Optional, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger("evacuation_twin.config")


class Settings(BaseSettings):
    PROJECT_NAME: str = "Intelligent Emergency Evacuation Digital Twin API"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # CORS Configuration
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8000",
    ]

    # Database Configuration
    DATABASE_URL: Optional[str] = None
    POSTGRES_SERVER: Optional[str] = None
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: Optional[str] = None
    POSTGRES_PASSWORD: Optional[str] = None
    POSTGRES_DB: Optional[str] = None

    # SQLite Local Development Fallback
    SQLITE_DB_PATH: str = "sqlite+aiosqlite:///./evacuation_digital_twin.db"
    SQLITE_SYNC_PATH: str = "sqlite:///./evacuation_digital_twin.db"

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, list):
            return v
        return []

    @property
    def async_database_url(self) -> str:
        """Returns async database connection string.
        Prioritizes explicit DATABASE_URL, then constructed PostgreSQL asyncpg URL,
        falling back to local SQLite aiosqlite if PostgreSQL is unconfigured.
        """
        if self.DATABASE_URL:
            # Ensure async dialect prefix
            if self.DATABASE_URL.startswith("postgresql://"):
                return self.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
            elif self.DATABASE_URL.startswith("sqlite://"):
                return self.DATABASE_URL.replace("sqlite://", "sqlite+aiosqlite://", 1)
            return self.DATABASE_URL

        if self.POSTGRES_SERVER and self.POSTGRES_USER and self.POSTGRES_DB:
            pwd = f":{self.POSTGRES_PASSWORD}" if self.POSTGRES_PASSWORD else ""
            return (
                f"postgresql+asyncpg://{self.POSTGRES_USER}{pwd}@"
                f"{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
            )

        return self.SQLITE_DB_PATH

    @property
    def sync_database_url(self) -> str:
        """Returns synchronous database connection string for Alembic migrations."""
        if self.DATABASE_URL:
            if self.DATABASE_URL.startswith("postgresql+asyncpg://"):
                return self.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://", 1)
            elif self.DATABASE_URL.startswith("sqlite+aiosqlite://"):
                return self.DATABASE_URL.replace("sqlite+aiosqlite://", "sqlite://", 1)
            return self.DATABASE_URL

        if self.POSTGRES_SERVER and self.POSTGRES_USER and self.POSTGRES_DB:
            pwd = f":{self.POSTGRES_PASSWORD}" if self.POSTGRES_PASSWORD else ""
            return (
                f"postgresql://{self.POSTGRES_USER}{pwd}@"
                f"{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
            )

        return self.SQLITE_SYNC_PATH

    @property
    def is_sqlite(self) -> bool:
        return "sqlite" in self.async_database_url

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
