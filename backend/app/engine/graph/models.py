from dataclasses import dataclass
from typing import List, Dict, Optional
from uuid import UUID

@dataclass
class Point2D:
    x: float
    y: float

@dataclass
class LineSegment2D:
    start: Point2D
    end: Point2D

@dataclass
class BoundingBox:
    min_x: float
    min_y: float
    max_x: float
    max_y: float

    def contains(self, point: Point2D) -> bool:
        return (self.min_x <= point.x <= self.max_x) and (self.min_y <= point.y <= self.max_y)

@dataclass
class PWall:
    id: UUID
    segment: LineSegment2D
    is_combustible: bool

@dataclass
class PDoor:
    id: UUID
    center: Point2D
    width: float
    room_a_id: Optional[UUID]
    room_b_id: Optional[UUID]

@dataclass
class PRoom:
    id: UUID
    name: str
    room_type: str

@dataclass
class PStair:
    id: UUID
    center: Point2D
    width: float
    target_floor_id: Optional[UUID]
    is_upward: bool

@dataclass
class PExit:
    id: UUID
    center: Point2D
    width: float
    discharge_rate: float

@dataclass
class PFloor:
    id: UUID
    floor_number: int
    elevation_z: float
    bounds: BoundingBox
    grid_resolution: float
    walls: List[PWall]
    doors: List[PDoor]
    rooms: List[PRoom]
    stairs: List[PStair]
    exits: List[PExit]

@dataclass
class PreprocessedBuilding:
    id: UUID
    name: str
    floors: Dict[UUID, PFloor]
    sorted_floors: List[PFloor]  # Sorted deterministically by floor_number
