import math
from enum import Enum
from typing import Dict, List, Tuple
from uuid import UUID

from app.engine.graph.models import (
    Point2D, LineSegment2D, BoundingBox, 
    PWall, PDoor, PRoom, PStair, PExit, PFloor, PreprocessedBuilding
)

class CellType(Enum):
    EMPTY = 0
    WALKABLE = 1
    OBSTACLE = 2
    DOOR = 3
    STAIR = 4
    EXIT = 5


class WalkabilityGrid:
    def __init__(self, floor_id: UUID, width_cells: int, height_cells: int, resolution: float):
        self.floor_id = floor_id
        self.width_cells = width_cells
        self.height_cells = height_cells
        self.resolution = resolution
        # Default all cells to WALKABLE within the floor bounding box
        self.grid: List[List[CellType]] = [
            [CellType.WALKABLE for _ in range(height_cells)] 
            for _ in range(width_cells)
        ]

    def set_cell(self, x: int, y: int, cell_type: CellType):
        if 0 <= x < self.width_cells and 0 <= y < self.height_cells:
            self.grid[x][y] = cell_type

    def get_cell(self, x: int, y: int) -> CellType:
        if 0 <= x < self.width_cells and 0 <= y < self.height_cells:
            return self.grid[x][y]
        return CellType.OBSTACLE


class RasterizerResult:
    def __init__(self, building_id: UUID):
        self.building_id = building_id
        self.floor_grids: Dict[UUID, WalkabilityGrid] = {}


def _intersect_segment_aabb(p1: Point2D, p2: Point2D, min_x: float, min_y: float, max_x: float, max_y: float) -> bool:
    """
    Check if a line segment from p1 to p2 intersects the axis-aligned bounding box.
    Uses a simple bounding box overlap followed by a line intersection check.
    """
    # 1. Segment bounding box overlap check
    seg_min_x = min(p1.x, p2.x)
    seg_max_x = max(p1.x, p2.x)
    seg_min_y = min(p1.y, p2.y)
    seg_max_y = max(p1.y, p2.y)

    if seg_max_x < min_x or seg_min_x > max_x or seg_max_y < min_y or seg_min_y > max_y:
        return False

    # 2. Line equation check
    # Line equation: A*x + B*y + C = 0
    # A = y2 - y1, B = x1 - x2, C = x2*y1 - x1*y2
    A = p2.y - p1.y
    B = p1.x - p2.x
    C = p2.x * p1.y - p1.x * p2.y

    # Evaluate line equation at all 4 corners of AABB
    corners = [
        (min_x, min_y),
        (max_x, min_y),
        (max_x, max_y),
        (min_x, max_y)
    ]
    
    evals = [A * cx + B * cy + C for cx, cy in corners]
    
    # If all evaluations have the same sign (and none are zero), the line does not intersect
    # We use a small epsilon for floating point robustness
    eps = 1e-7
    all_pos = all(e > eps for e in evals)
    all_neg = all(e < -eps for e in evals)
    
    if all_pos or all_neg:
        return False
        
    return True


def rasterize_floor(p_floor: PFloor) -> WalkabilityGrid:
    """
    Rasterizes a preprocessed floor into a discrete walkability grid.
    """
    res = p_floor.grid_resolution
    width_cells = math.ceil(p_floor.bounds.max_x / res)
    height_cells = math.ceil(p_floor.bounds.max_y / res)
    
    # Handle extremely small or zero cases
    if width_cells <= 0:
        width_cells = 1
    if height_cells <= 0:
        height_cells = 1

    grid = WalkabilityGrid(
        floor_id=p_floor.id,
        width_cells=width_cells,
        height_cells=height_cells,
        resolution=res
    )

    # 1. Rasterize walls as OBSTACLES
    for wall in p_floor.walls:
        # Optimization: Only check cells in the bounding box of the wall segment
        min_x = min(wall.segment.start.x, wall.segment.end.x)
        max_x = max(wall.segment.start.x, wall.segment.end.x)
        min_y = min(wall.segment.start.y, wall.segment.end.y)
        max_y = max(wall.segment.start.y, wall.segment.end.y)
        
        start_cx = max(0, int(math.floor(min_x / res)))
        end_cx = min(width_cells - 1, int(math.floor(max_x / res)))
        start_cy = max(0, int(math.floor(min_y / res)))
        end_cy = min(height_cells - 1, int(math.floor(max_y / res)))
        
        for cx in range(start_cx, end_cx + 1):
            for cy in range(start_cy, end_cy + 1):
                cell_min_x = cx * res
                cell_min_y = cy * res
                cell_max_x = cell_min_x + res
                cell_max_y = cell_min_y + res
                
                if _intersect_segment_aabb(
                    wall.segment.start, wall.segment.end, 
                    cell_min_x, cell_min_y, cell_max_x, cell_max_y
                ):
                    grid.set_cell(cx, cy, CellType.OBSTACLE)

    # 2. Rasterize doors as DOOR (Overwrites OBSTACLES if they overlap, assuming door creates an opening)
    for door in p_floor.doors:
        cx = int(math.floor(door.center.x / res))
        cy = int(math.floor(door.center.y / res))
        
        # A simple model: mark the center cell and adjacent cells based on width
        # For this minimal representation, we just mark the center cell. 
        # A more complex model would orient the door and carve out a line.
        grid.set_cell(cx, cy, CellType.DOOR)

    # 3. Rasterize stairs as STAIR
    for stair in p_floor.stairs:
        cx = int(math.floor(stair.center.x / res))
        cy = int(math.floor(stair.center.y / res))
        grid.set_cell(cx, cy, CellType.STAIR)

    # 4. Rasterize exits as EXIT
    for exit_obj in p_floor.exits:
        cx = int(math.floor(exit_obj.center.x / res))
        cy = int(math.floor(exit_obj.center.y / res))
        grid.set_cell(cx, cy, CellType.EXIT)

    return grid


def rasterize_building(building: PreprocessedBuilding) -> RasterizerResult:
    """
    Converts a PreprocessedBuilding into a per-floor RasterizerResult.
    """
    result = RasterizerResult(building_id=building.id)
    
    # Process floors deterministically
    for p_floor in building.sorted_floors:
        grid = rasterize_floor(p_floor)
        result.floor_grids[p_floor.id] = grid
        
    return result
