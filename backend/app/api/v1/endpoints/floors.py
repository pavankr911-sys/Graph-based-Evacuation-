from typing import Any, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.building import FloorRead, FloorCreate, FloorUpdate
from app.services import building as building_service, floor as floor_service

router = APIRouter()


@router.post("/", response_model=FloorRead, status_code=status.HTTP_201_CREATED)
async def create_floor(
    *,
    db: AsyncSession = Depends(get_db),
    floor_in: FloorCreate,
) -> Any:
    """
    Create new floor.
    """
    b = await building_service.get(db, id=floor_in.building_id)
    if not b:
        raise HTTPException(status_code=404, detail="Building not found")
        
    new_floor = await floor_service.create(db, obj_in=floor_in)
    return new_floor


@router.get("/", response_model=List[FloorRead])
async def read_floors(
    db: AsyncSession = Depends(get_db),
    building_id: Optional[UUID] = Query(None, description="Filter by building ID"),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve floors.
    """
    if building_id:
        b = await building_service.get(db, id=building_id)
        if not b:
            raise HTTPException(status_code=404, detail="Building not found")
        floors = await floor_service.get_by_building(db, building_id=building_id)
        return floors
    else:
        floors = await floor_service.get_multi(db, skip=skip, limit=limit)
        return floors


@router.get("/{floor_id}", response_model=FloorRead)
async def read_floor(
    *,
    db: AsyncSession = Depends(get_db),
    floor_id: UUID,
) -> Any:
    """
    Get floor by ID.
    """
    f = await floor_service.get(db, id=floor_id)
    if not f:
        raise HTTPException(status_code=404, detail="Floor not found")
    return f


@router.put("/{floor_id}", response_model=FloorRead)
async def update_floor(
    *,
    db: AsyncSession = Depends(get_db),
    floor_id: UUID,
    floor_in: FloorUpdate,
) -> Any:
    """
    Update a floor.
    """
    f = await floor_service.get(db, id=floor_id)
    if not f:
        raise HTTPException(status_code=404, detail="Floor not found")
    f = await floor_service.update(db, db_obj=f, obj_in=floor_in)
    return f


@router.delete("/{floor_id}", response_model=FloorRead)
async def delete_floor(
    *,
    db: AsyncSession = Depends(get_db),
    floor_id: UUID,
) -> Any:
    """
    Delete a floor.
    """
    f = await floor_service.get(db, id=floor_id)
    if not f:
        raise HTTPException(status_code=404, detail="Floor not found")
    f = await floor_service.remove(db, id=floor_id)
    return f
