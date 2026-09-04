from datetime import datetime, timezone
from typing import Dict, Any
from fastapi import APIRouter

from app.core.config import settings
from app.core.database import check_db_connectivity

router = APIRouter()


@router.get("/health", response_model=Dict[str, Any], summary="Health check endpoint")
async def health_check() -> Dict[str, Any]:
    """Health check endpoint to verify API service status and database connectivity."""
    db_status = await check_db_connectivity()
    return {
        "status": "healthy" if db_status.get("connected") else "degraded",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "database": db_status,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
