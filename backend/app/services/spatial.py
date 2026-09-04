from typing import List
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.spatial import Room, Wall, Door, Stair, Exit
from app.schemas.spatial import (
    RoomCreate, RoomUpdate,
    WallCreate, WallUpdate,
    DoorCreate, DoorUpdate,
    StairCreate, StairUpdate,
    ExitCreate, ExitUpdate,
)
from app.services.base import CRUDBase


class CRUDRoom(CRUDBase[Room, RoomCreate, RoomUpdate]):
    async def get_by_floor(self, db: AsyncSession, floor_id: UUID) -> List[Room]:
        result = await db.execute(select(Room).where(Room.floor_id == floor_id))
        return list(result.scalars().all())


class CRUDWall(CRUDBase[Wall, WallCreate, WallUpdate]):
    async def get_by_floor(self, db: AsyncSession, floor_id: UUID) -> List[Wall]:
        result = await db.execute(select(Wall).where(Wall.floor_id == floor_id))
        return list(result.scalars().all())


class CRUDDoor(CRUDBase[Door, DoorCreate, DoorUpdate]):
    async def get_by_floor(self, db: AsyncSession, floor_id: UUID) -> List[Door]:
        result = await db.execute(select(Door).where(Door.floor_id == floor_id))
        return list(result.scalars().all())


class CRUDStair(CRUDBase[Stair, StairCreate, StairUpdate]):
    async def get_by_floor(self, db: AsyncSession, floor_id: UUID) -> List[Stair]:
        result = await db.execute(select(Stair).where(Stair.floor_id == floor_id))
        return list(result.scalars().all())


class CRUDExit(CRUDBase[Exit, ExitCreate, ExitUpdate]):
    async def get_by_floor(self, db: AsyncSession, floor_id: UUID) -> List[Exit]:
        result = await db.execute(select(Exit).where(Exit.floor_id == floor_id))
        return list(result.scalars().all())


room = CRUDRoom(Room)
wall = CRUDWall(Wall)
door = CRUDDoor(Door)
stair = CRUDStair(Stair)
exit = CRUDExit(Exit)
