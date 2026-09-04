from fastapi import APIRouter
from app.api.v1.endpoints import health, buildings, floors, spatial, simulations

api_router = APIRouter()
api_router.include_router(health.router, tags=["Health"])
api_router.include_router(buildings.router, prefix="/buildings", tags=["Buildings"])
api_router.include_router(floors.router, prefix="/floors", tags=["Floors"])
api_router.include_router(spatial.router, prefix="/spatial", tags=["spatial"])
api_router.include_router(simulations.router, prefix="/buildings", tags=["simulations"])
