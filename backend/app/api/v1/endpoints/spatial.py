from typing import Any, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.spatial import (
    RoomRead, RoomCreate, RoomUpdate,
    WallRead, WallCreate, WallUpdate,
    DoorRead, DoorCreate, DoorUpdate,
    StairRead, StairCreate, StairUpdate,
    ExitRead, ExitCreate, ExitUpdate,
)
from app.services import (
    floor as floor_service,
    room as room_service,
    wall as wall_service,
    door as door_service,
    stair as stair_service,
    exit as exit_service,
)

router = APIRouter()

# --- Rooms ---

@router.post("/rooms/", response_model=RoomRead, status_code=status.HTTP_201_CREATED, tags=["Rooms"])
async def create_room(*, db: AsyncSession = Depends(get_db), obj_in: RoomCreate) -> Any:
    f = await floor_service.get(db, id=obj_in.floor_id)
    if not f:
        raise HTTPException(status_code=404, detail="Floor not found")
    return await room_service.create(db, obj_in=obj_in)

@router.get("/rooms/", response_model=List[RoomRead], tags=["Rooms"])
async def read_rooms(
    db: AsyncSession = Depends(get_db),
    floor_id: Optional[UUID] = Query(None, description="Filter by floor ID"),
    skip: int = 0, limit: int = 100
) -> Any:
    if floor_id:
        f = await floor_service.get(db, id=floor_id)
        if not f:
            raise HTTPException(status_code=404, detail="Floor not found")
        return await room_service.get_by_floor(db, floor_id=floor_id)
    return await room_service.get_multi(db, skip=skip, limit=limit)

@router.get("/rooms/{id}", response_model=RoomRead, tags=["Rooms"])
async def read_room(*, db: AsyncSession = Depends(get_db), id: UUID) -> Any:
    obj = await room_service.get(db, id=id)
    if not obj:
        raise HTTPException(status_code=404, detail="Room not found")
    return obj

@router.put("/rooms/{id}", response_model=RoomRead, tags=["Rooms"])
async def update_room(*, db: AsyncSession = Depends(get_db), id: UUID, obj_in: RoomUpdate) -> Any:
    obj = await room_service.get(db, id=id)
    if not obj:
        raise HTTPException(status_code=404, detail="Room not found")
    return await room_service.update(db, db_obj=obj, obj_in=obj_in)

@router.delete("/rooms/{id}", response_model=RoomRead, tags=["Rooms"])
async def delete_room(*, db: AsyncSession = Depends(get_db), id: UUID) -> Any:
    obj = await room_service.get(db, id=id)
    if not obj:
        raise HTTPException(status_code=404, detail="Room not found")
    return await room_service.remove(db, id=id)

# --- Walls ---

@router.post("/walls/", response_model=WallRead, status_code=status.HTTP_201_CREATED, tags=["Walls"])
async def create_wall(*, db: AsyncSession = Depends(get_db), obj_in: WallCreate) -> Any:
    f = await floor_service.get(db, id=obj_in.floor_id)
    if not f:
        raise HTTPException(status_code=404, detail="Floor not found")
    return await wall_service.create(db, obj_in=obj_in)

@router.get("/walls/", response_model=List[WallRead], tags=["Walls"])
async def read_walls(
    db: AsyncSession = Depends(get_db),
    floor_id: Optional[UUID] = Query(None, description="Filter by floor ID"),
    skip: int = 0, limit: int = 100
) -> Any:
    if floor_id:
        f = await floor_service.get(db, id=floor_id)
        if not f:
            raise HTTPException(status_code=404, detail="Floor not found")
        return await wall_service.get_by_floor(db, floor_id=floor_id)
    return await wall_service.get_multi(db, skip=skip, limit=limit)

@router.get("/walls/{id}", response_model=WallRead, tags=["Walls"])
async def read_wall(*, db: AsyncSession = Depends(get_db), id: UUID) -> Any:
    obj = await wall_service.get(db, id=id)
    if not obj:
        raise HTTPException(status_code=404, detail="Wall not found")
    return obj

@router.put("/walls/{id}", response_model=WallRead, tags=["Walls"])
async def update_wall(*, db: AsyncSession = Depends(get_db), id: UUID, obj_in: WallUpdate) -> Any:
    obj = await wall_service.get(db, id=id)
    if not obj:
        raise HTTPException(status_code=404, detail="Wall not found")
    return await wall_service.update(db, db_obj=obj, obj_in=obj_in)

@router.delete("/walls/{id}", response_model=WallRead, tags=["Walls"])
async def delete_wall(*, db: AsyncSession = Depends(get_db), id: UUID) -> Any:
    obj = await wall_service.get(db, id=id)
    if not obj:
        raise HTTPException(status_code=404, detail="Wall not found")
    return await wall_service.remove(db, id=id)

# --- Doors ---

@router.post("/doors/", response_model=DoorRead, status_code=status.HTTP_201_CREATED, tags=["Doors"])
async def create_door(*, db: AsyncSession = Depends(get_db), obj_in: DoorCreate) -> Any:
    f = await floor_service.get(db, id=obj_in.floor_id)
    if not f:
        raise HTTPException(status_code=404, detail="Floor not found")
    if obj_in.room_a_id:
        r = await room_service.get(db, id=obj_in.room_a_id)
        if not r:
            raise HTTPException(status_code=404, detail="Room A not found")
    if obj_in.room_b_id:
        r = await room_service.get(db, id=obj_in.room_b_id)
        if not r:
            raise HTTPException(status_code=404, detail="Room B not found")
    return await door_service.create(db, obj_in=obj_in)

@router.get("/doors/", response_model=List[DoorRead], tags=["Doors"])
async def read_doors(
    db: AsyncSession = Depends(get_db),
    floor_id: Optional[UUID] = Query(None, description="Filter by floor ID"),
    skip: int = 0, limit: int = 100
) -> Any:
    if floor_id:
        f = await floor_service.get(db, id=floor_id)
        if not f:
            raise HTTPException(status_code=404, detail="Floor not found")
        return await door_service.get_by_floor(db, floor_id=floor_id)
    return await door_service.get_multi(db, skip=skip, limit=limit)

@router.get("/doors/{id}", response_model=DoorRead, tags=["Doors"])
async def read_door(*, db: AsyncSession = Depends(get_db), id: UUID) -> Any:
    obj = await door_service.get(db, id=id)
    if not obj:
        raise HTTPException(status_code=404, detail="Door not found")
    return obj

@router.put("/doors/{id}", response_model=DoorRead, tags=["Doors"])
async def update_door(*, db: AsyncSession = Depends(get_db), id: UUID, obj_in: DoorUpdate) -> Any:
    obj = await door_service.get(db, id=id)
    if not obj:
        raise HTTPException(status_code=404, detail="Door not found")
    return await door_service.update(db, db_obj=obj, obj_in=obj_in)

@router.delete("/doors/{id}", response_model=DoorRead, tags=["Doors"])
async def delete_door(*, db: AsyncSession = Depends(get_db), id: UUID) -> Any:
    obj = await door_service.get(db, id=id)
    if not obj:
        raise HTTPException(status_code=404, detail="Door not found")
    return await door_service.remove(db, id=id)

# --- Stairs ---

@router.post("/stairs/", response_model=StairRead, status_code=status.HTTP_201_CREATED, tags=["Stairs"])
async def create_stair(*, db: AsyncSession = Depends(get_db), obj_in: StairCreate) -> Any:
    f = await floor_service.get(db, id=obj_in.floor_id)
    if not f:
        raise HTTPException(status_code=404, detail="Floor not found")
    if obj_in.target_floor_id:
        tf = await floor_service.get(db, id=obj_in.target_floor_id)
        if not tf:
            raise HTTPException(status_code=404, detail="Target floor not found")
    return await stair_service.create(db, obj_in=obj_in)

@router.get("/stairs/", response_model=List[StairRead], tags=["Stairs"])
async def read_stairs(
    db: AsyncSession = Depends(get_db),
    floor_id: Optional[UUID] = Query(None, description="Filter by floor ID"),
    skip: int = 0, limit: int = 100
) -> Any:
    if floor_id:
        f = await floor_service.get(db, id=floor_id)
        if not f:
            raise HTTPException(status_code=404, detail="Floor not found")
        return await stair_service.get_by_floor(db, floor_id=floor_id)
    return await stair_service.get_multi(db, skip=skip, limit=limit)

@router.get("/stairs/{id}", response_model=StairRead, tags=["Stairs"])
async def read_stair(*, db: AsyncSession = Depends(get_db), id: UUID) -> Any:
    obj = await stair_service.get(db, id=id)
    if not obj:
        raise HTTPException(status_code=404, detail="Stair not found")
    return obj

@router.put("/stairs/{id}", response_model=StairRead, tags=["Stairs"])
async def update_stair(*, db: AsyncSession = Depends(get_db), id: UUID, obj_in: StairUpdate) -> Any:
    obj = await stair_service.get(db, id=id)
    if not obj:
        raise HTTPException(status_code=404, detail="Stair not found")
    return await stair_service.update(db, db_obj=obj, obj_in=obj_in)

@router.delete("/stairs/{id}", response_model=StairRead, tags=["Stairs"])
async def delete_stair(*, db: AsyncSession = Depends(get_db), id: UUID) -> Any:
    obj = await stair_service.get(db, id=id)
    if not obj:
        raise HTTPException(status_code=404, detail="Stair not found")
    return await stair_service.remove(db, id=id)

# --- Exits ---

@router.post("/exits/", response_model=ExitRead, status_code=status.HTTP_201_CREATED, tags=["Exits"])
async def create_exit(*, db: AsyncSession = Depends(get_db), obj_in: ExitCreate) -> Any:
    f = await floor_service.get(db, id=obj_in.floor_id)
    if not f:
        raise HTTPException(status_code=404, detail="Floor not found")
    return await exit_service.create(db, obj_in=obj_in)

@router.get("/exits/", response_model=List[ExitRead], tags=["Exits"])
async def read_exits(
    db: AsyncSession = Depends(get_db),
    floor_id: Optional[UUID] = Query(None, description="Filter by floor ID"),
    skip: int = 0, limit: int = 100
) -> Any:
    if floor_id:
        f = await floor_service.get(db, id=floor_id)
        if not f:
            raise HTTPException(status_code=404, detail="Floor not found")
        return await exit_service.get_by_floor(db, floor_id=floor_id)
    return await exit_service.get_multi(db, skip=skip, limit=limit)

@router.get("/exits/{id}", response_model=ExitRead, tags=["Exits"])
async def read_exit(*, db: AsyncSession = Depends(get_db), id: UUID) -> Any:
    obj = await exit_service.get(db, id=id)
    if not obj:
        raise HTTPException(status_code=404, detail="Exit not found")
    return obj

@router.put("/exits/{id}", response_model=ExitRead, tags=["Exits"])
async def update_exit(*, db: AsyncSession = Depends(get_db), id: UUID, obj_in: ExitUpdate) -> Any:
    obj = await exit_service.get(db, id=id)
    if not obj:
        raise HTTPException(status_code=404, detail="Exit not found")
    return await exit_service.update(db, db_obj=obj, obj_in=obj_in)

@router.delete("/exits/{id}", response_model=ExitRead, tags=["Exits"])
async def delete_exit(*, db: AsyncSession = Depends(get_db), id: UUID) -> Any:
    obj = await exit_service.get(db, id=id)
    if not obj:
        raise HTTPException(status_code=404, detail="Exit not found")
    return await exit_service.remove(db, id=id)
