import math
from typing import Dict, List
from uuid import UUID

from app.schemas.export import BuildingExport, FloorExport
from app.engine.graph.models import (
    Point2D, LineSegment2D, BoundingBox, 
    PWall, PDoor, PRoom, PStair, PExit, PFloor, PreprocessedBuilding
)

class PreprocessingError(ValueError):
    """Raised when floorplan geometry or references are invalid."""
    pass


def _distance(p1: Point2D, p2: Point2D) -> float:
    return math.sqrt((p2.x - p1.x)**2 + (p2.y - p1.y)**2)


def preprocess_building(export_data: BuildingExport) -> PreprocessedBuilding:
    """
    Validates and normalizes a BuildingExport into a deterministic 
    PreprocessedBuilding representation for graph generation.
    """
    
    # 1. First pass: Collect all valid floor and room IDs for cross-reference validation
    valid_floor_ids = {f.id for f in export_data.floors}
    valid_room_ids = {r.id for f in export_data.floors for r in f.rooms}

    p_floors: Dict[UUID, PFloor] = {}
    
    # Sort floors deterministically by floor_number, then id
    sorted_floors_export = sorted(export_data.floors, key=lambda f: (f.floor_number, str(f.id)))

    for f_exp in sorted_floors_export:
        if f_exp.width_meters <= 0 or f_exp.height_meters <= 0:
            raise PreprocessingError(f"Floor {f_exp.id} has invalid dimensions: {f_exp.width_meters}x{f_exp.height_meters}")
            
        if f_exp.grid_cell_size <= 0:
            raise PreprocessingError(f"Floor {f_exp.id} has invalid grid cell size: {f_exp.grid_cell_size}")

        bounds = BoundingBox(
            min_x=0.0,
            min_y=0.0,
            max_x=f_exp.width_meters,
            max_y=f_exp.height_meters
        )
        
        # Rooms
        p_rooms = []
        for r_exp in sorted(f_exp.rooms, key=lambda r: str(r.id)):
            p_rooms.append(PRoom(
                id=r_exp.id,
                name=r_exp.name,
                room_type=r_exp.room_type,
                geometry=r_exp.geometry
            ))
            
        # Walls
        p_walls = []
        for w_exp in sorted(f_exp.walls, key=lambda w: str(w.id)):
            p1 = Point2D(x=w_exp.start_x, y=w_exp.start_y)
            p2 = Point2D(x=w_exp.end_x, y=w_exp.end_y)
            
            if _distance(p1, p2) < 1e-5:
                raise PreprocessingError(f"Wall {w_exp.id} has zero length.")
                
            if not (bounds.contains(p1) and bounds.contains(p2)):
                raise PreprocessingError(f"Wall {w_exp.id} is outside floor {f_exp.id} bounds.")
                
            p_walls.append(PWall(
                id=w_exp.id,
                segment=LineSegment2D(start=p1, end=p2),
                is_combustible=w_exp.is_combustible
            ))
            
        # Doors
        p_doors = []
        for d_exp in sorted(f_exp.doors, key=lambda d: str(d.id)):
            if d_exp.width_meters <= 0:
                raise PreprocessingError(f"Door {d_exp.id} has invalid width: {d_exp.width_meters}")
                
            center = Point2D(x=d_exp.position_x, y=d_exp.position_y)
            if not bounds.contains(center):
                raise PreprocessingError(f"Door {d_exp.id} is outside floor {f_exp.id} bounds.")
                
            if d_exp.room_a_id and d_exp.room_a_id not in valid_room_ids:
                raise PreprocessingError(f"Door {d_exp.id} references invalid room_a_id {d_exp.room_a_id}")
            if d_exp.room_b_id and d_exp.room_b_id not in valid_room_ids:
                raise PreprocessingError(f"Door {d_exp.id} references invalid room_b_id {d_exp.room_b_id}")
                
            p_doors.append(PDoor(
                id=d_exp.id,
                center=center,
                width=d_exp.width_meters,
                room_a_id=d_exp.room_a_id,
                room_b_id=d_exp.room_b_id
            ))
            
        # Stairs
        p_stairs = []
        for s_exp in sorted(f_exp.stairs, key=lambda s: str(s.id)):
            if s_exp.width_meters <= 0:
                raise PreprocessingError(f"Stair {s_exp.id} has invalid width: {s_exp.width_meters}")
                
            center = Point2D(x=s_exp.position_x, y=s_exp.position_y)
            if not bounds.contains(center):
                raise PreprocessingError(f"Stair {s_exp.id} is outside floor {f_exp.id} bounds.")
                
            if s_exp.target_floor_id and s_exp.target_floor_id not in valid_floor_ids:
                raise PreprocessingError(f"Stair {s_exp.id} references invalid target_floor_id {s_exp.target_floor_id}")
                
            p_stairs.append(PStair(
                id=s_exp.id,
                center=center,
                width=s_exp.width_meters,
                target_floor_id=s_exp.target_floor_id,
                is_upward=s_exp.is_upward
            ))
            
        # Exits
        p_exits = []
        for e_exp in sorted(f_exp.exits, key=lambda e: str(e.id)):
            if e_exp.width_meters <= 0:
                raise PreprocessingError(f"Exit {e_exp.id} has invalid width: {e_exp.width_meters}")
                
            center = Point2D(x=e_exp.position_x, y=e_exp.position_y)
            if not bounds.contains(center):
                raise PreprocessingError(f"Exit {e_exp.id} is outside floor {f_exp.id} bounds.")
                
            p_exits.append(PExit(
                id=e_exp.id,
                center=center,
                width=e_exp.width_meters,
                discharge_rate=e_exp.discharge_rate
            ))
            
        # Assume 3.5m inter-floor height per ASSUMPTIONS.md
        elevation_z = f_exp.floor_number * 3.5
        
        p_floors[f_exp.id] = PFloor(
            id=f_exp.id,
            floor_number=f_exp.floor_number,
            elevation_z=elevation_z,
            bounds=bounds,
            grid_resolution=f_exp.grid_cell_size,
            walls=p_walls,
            doors=p_doors,
            rooms=p_rooms,
            stairs=p_stairs,
            exits=p_exits
        )

    sorted_floors_list = [p_floors[f.id] for f in sorted_floors_export]

    return PreprocessedBuilding(
        id=export_data.id,
        name=export_data.name,
        floors=p_floors,
        sorted_floors=sorted_floors_list
    )
