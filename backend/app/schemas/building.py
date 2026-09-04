from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# Floor Schemas
# ---------------------------------------------------------------------------


class FloorBase(BaseModel):
    """Base schema attributes for a building floor."""

    floor_number: int = Field(
        default=0,
        description="Zero-indexed floor level (0=Ground, 1=Floor 1, -1=Basement).",
    )
    name: str = Field(
        default="Ground Floor",
        min_length=1,
        max_length=100,
        description="Human-readable floor label.",
    )
    width_meters: float = Field(
        default=50.0,
        gt=0.0,
        description="Horizontal boundary width of the floor in meters.",
    )
    height_meters: float = Field(
        default=30.0,
        gt=0.0,
        description="Vertical boundary height of the floor in meters.",
    )
    grid_cell_size: float = Field(
        default=0.5,
        gt=0.0,
        description="Discretization grid cell resolution in meters.",
    )
    raw_geometry: Optional[Dict[str, Any]] = Field(
        default_factory=dict,
        description="Serialized layout geometry (rooms, walls, doors, etc.).",
    )


class FloorCreate(FloorBase):
    """Schema for creating a new floor under a building."""

    building_id: Optional[UUID] = Field(
        default=None,
        description="Parent building ID (optional if creating alongside building).",
    )


class FloorUpdate(BaseModel):
    """Schema for updating floor attributes."""

    floor_number: Optional[int] = None
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    width_meters: Optional[float] = Field(default=None, gt=0.0)
    height_meters: Optional[float] = Field(default=None, gt=0.0)
    grid_cell_size: Optional[float] = Field(default=None, gt=0.0)
    raw_geometry: Optional[Dict[str, Any]] = None


class FloorRead(FloorBase):
    """Schema for returning floor data with database metadata."""

    id: UUID
    building_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Building Schemas
# ---------------------------------------------------------------------------


class BuildingBase(BaseModel):
    """Base schema attributes for a building."""

    name: str = Field(
        min_length=1,
        max_length=255,
        description="Building name or identifier.",
    )
    description: Optional[str] = Field(
        default=None,
        description="Detailed description of building architecture or usage.",
    )
    total_floors: int = Field(
        default=1,
        ge=1,
        description="Total count of above and below ground floors.",
    )
    building_metadata: Optional[Dict[str, Any]] = Field(
        default_factory=dict,
        description="Arbitrary building metadata (address, fire rating, occupancy max).",
    )


class BuildingCreate(BuildingBase):
    """Schema for creating a new building, optionally with initial floor definitions."""

    floors: Optional[List[FloorCreate]] = Field(
        default=None,
        description="Initial floor definitions to create atomically with the building.",
    )


class BuildingUpdate(BaseModel):
    """Schema for updating building attributes."""

    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    description: Optional[str] = None
    total_floors: Optional[int] = Field(default=None, ge=1)
    building_metadata: Optional[Dict[str, Any]] = None


class BuildingRead(BuildingBase):
    """Schema for returning building data without eager floor collections."""

    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BuildingDetailRead(BuildingRead):
    """Schema for returning building data along with all nested floor records."""

    floors: List[FloorRead] = Field(
        default_factory=list,
        description="Ordered list of floors belonging to this building.",
    )

    model_config = ConfigDict(from_attributes=True)
