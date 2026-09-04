from typing import List, Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.building import Building, Floor
from app.schemas.building import (
    BuildingCreate,
    BuildingUpdate,
    FloorCreate,
    FloorUpdate,
)
from app.services.base import CRUDBase


class CRUDBuilding(CRUDBase[Building, BuildingCreate, BuildingUpdate]):
    async def get_with_floors(
        self, db: AsyncSession, id: UUID
    ) -> Optional[Building]:
        result = await db.execute(
            select(Building)
            .options(selectinload(Building.floors))
            .where(Building.id == id)
        )
        return result.scalars().first()


class CRUDFloor(CRUDBase[Floor, FloorCreate, FloorUpdate]):
    async def get_by_building(
        self, db: AsyncSession, building_id: UUID
    ) -> List[Floor]:
        result = await db.execute(
            select(Floor)
            .where(Floor.building_id == building_id)
            .order_by(Floor.floor_number)
        )
        return list(result.scalars().all())


building = CRUDBuilding(Building)
floor = CRUDFloor(Floor)
