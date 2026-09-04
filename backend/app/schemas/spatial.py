from datetime import datetime
from typing import Any, Dict, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# Room Schemas
# ---------------------------------------------------------------------------
class RoomBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    room_type: str = Field(default="general", max_length=50)
    geometry: Dict[str, Any] = Field(default_factory=dict)
    is_accessible: bool = Field(default=True)

class RoomCreate(RoomBase):
    floor_id: Optional[UUID] = None

class RoomUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    room_type: Optional[str] = Field(default=None, max_length=50)
    geometry: Optional[Dict[str, Any]] = None
    is_accessible: Optional[bool] = None

class RoomRead(RoomBase):
    id: UUID
    floor_id: UUID
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Wall Schemas
# ---------------------------------------------------------------------------
class WallBase(BaseModel):
    start_x: float
    start_y: float
    end_x: float
    end_y: float
    is_combustible: bool = Field(default=False)

class WallCreate(WallBase):
    floor_id: Optional[UUID] = None

class WallUpdate(BaseModel):
    start_x: Optional[float] = None
    start_y: Optional[float] = None
    end_x: Optional[float] = None
    end_y: Optional[float] = None
    is_combustible: Optional[bool] = None

class WallRead(WallBase):
    id: UUID
    floor_id: UUID
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Door Schemas
# ---------------------------------------------------------------------------
class DoorBase(BaseModel):
    room_a_id: Optional[UUID] = None
    room_b_id: Optional[UUID] = None
    position_x: float
    position_y: float
    width_meters: float = Field(default=1.0, gt=0.0)
    is_open: bool = Field(default=True)

class DoorCreate(DoorBase):
    floor_id: Optional[UUID] = None

class DoorUpdate(BaseModel):
    room_a_id: Optional[UUID] = None
    room_b_id: Optional[UUID] = None
    position_x: Optional[float] = None
    position_y: Optional[float] = None
    width_meters: Optional[float] = Field(default=None, gt=0.0)
    is_open: Optional[bool] = None

class DoorRead(DoorBase):
    id: UUID
    floor_id: UUID
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Stair Schemas
# ---------------------------------------------------------------------------
class StairBase(BaseModel):
    target_floor_id: Optional[UUID] = None
    position_x: float
    position_y: float
    width_meters: float = Field(default=1.5, gt=0.0)
    is_upward: bool = Field(default=False)

class StairCreate(StairBase):
    floor_id: Optional[UUID] = None

class StairUpdate(BaseModel):
    target_floor_id: Optional[UUID] = None
    position_x: Optional[float] = None
    position_y: Optional[float] = None
    width_meters: Optional[float] = Field(default=None, gt=0.0)
    is_upward: Optional[bool] = None

class StairRead(StairBase):
    id: UUID
    floor_id: UUID
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Exit Schemas
# ---------------------------------------------------------------------------
class ExitBase(BaseModel):
    position_x: float
    position_y: float
    width_meters: float = Field(default=2.0, gt=0.0)
    discharge_rate: float = Field(default=1.5, gt=0.0)
    is_usable: bool = Field(default=True)

class ExitCreate(ExitBase):
    floor_id: Optional[UUID] = None

class ExitUpdate(BaseModel):
    position_x: Optional[float] = None
    position_y: Optional[float] = None
    width_meters: Optional[float] = Field(default=None, gt=0.0)
    discharge_rate: Optional[float] = Field(default=None, gt=0.0)
    is_usable: Optional[bool] = None

class ExitRead(ExitBase):
    id: UUID
    floor_id: UUID
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)
