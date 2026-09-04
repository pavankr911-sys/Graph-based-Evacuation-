from datetime import datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict
from app.schemas.building import BuildingBase, FloorBase
from app.schemas.spatial import RoomBase, WallBase, DoorBase, StairBase, ExitBase
from app.schemas.graph import GraphTopologyRead

class RoomExport(RoomBase):
    id: Optional[UUID] = None
    floor_id: Optional[UUID] = None
    model_config = ConfigDict(from_attributes=True)

class WallExport(WallBase):
    id: Optional[UUID] = None
    floor_id: Optional[UUID] = None
    model_config = ConfigDict(from_attributes=True)

class DoorExport(DoorBase):
    id: Optional[UUID] = None
    floor_id: Optional[UUID] = None
    model_config = ConfigDict(from_attributes=True)

class StairExport(StairBase):
    id: Optional[UUID] = None
    floor_id: Optional[UUID] = None
    model_config = ConfigDict(from_attributes=True)

class ExitExport(ExitBase):
    id: Optional[UUID] = None
    floor_id: Optional[UUID] = None
    model_config = ConfigDict(from_attributes=True)

class FloorExport(FloorBase):
    id: Optional[UUID] = None
    building_id: Optional[UUID] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    rooms: List[RoomExport] = []
    walls: List[WallExport] = []
    doors: List[DoorExport] = []
    stairs: List[StairExport] = []
    exits: List[ExitExport] = []

    model_config = ConfigDict(from_attributes=True)

class BuildingExport(BuildingBase):
    id: Optional[UUID] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    floors: List[FloorExport] = []
    topologies: List[GraphTopologyRead] = []

    model_config = ConfigDict(from_attributes=True)
