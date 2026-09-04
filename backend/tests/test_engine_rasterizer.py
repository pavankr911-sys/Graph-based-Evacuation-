import pytest
import uuid
import math
from app.engine.graph.models import (
    Point2D, LineSegment2D, BoundingBox, 
    PWall, PDoor, PRoom, PStair, PExit, PFloor, PreprocessedBuilding
)
from app.engine.graph.rasterizer import (
    rasterize_floor, rasterize_building, CellType, _intersect_segment_aabb
)

def make_uuid():
    return uuid.uuid4()

def test_intersect_segment_aabb():
    # AABB from 0,0 to 1,1
    min_x, min_y, max_x, max_y = 0.0, 0.0, 1.0, 1.0
    
    # Intersecting through middle
    assert _intersect_segment_aabb(Point2D(0.5, -1), Point2D(0.5, 2), min_x, min_y, max_x, max_y) == True
    
    # Missing completely
    assert _intersect_segment_aabb(Point2D(2, 2), Point2D(3, 3), min_x, min_y, max_x, max_y) == False
    
    # Just outside bounds (epsilon check)
    assert _intersect_segment_aabb(Point2D(1.1, 0), Point2D(1.1, 1), min_x, min_y, max_x, max_y) == False
    
    # Exactly on boundary
    assert _intersect_segment_aabb(Point2D(1, 0), Point2D(1, 1), min_x, min_y, max_x, max_y) == True
    
    # Diagonal intersection
    assert _intersect_segment_aabb(Point2D(-1, -1), Point2D(2, 2), min_x, min_y, max_x, max_y) == True


def test_empty_walkable_floor():
    f_id = make_uuid()
    p_floor = PFloor(
        id=f_id, floor_number=0, elevation_z=0.0,
        bounds=BoundingBox(0.0, 0.0, 10.0, 10.0),
        grid_resolution=1.0,
        walls=[], doors=[], rooms=[], stairs=[], exits=[]
    )
    
    grid = rasterize_floor(p_floor)
    
    assert grid.width_cells == 10
    assert grid.height_cells == 10
    
    # Everything should be walkable
    for x in range(10):
        for y in range(10):
            assert grid.get_cell(x, y) == CellType.WALKABLE


def test_wall_obstacle():
    f_id = make_uuid()
    # Wall from (2.5, 0) to (2.5, 5) -> x=2 cell should be hit if using 1.0 resolution 
    # Actually 2.5 is exactly on the boundary of cell 2 [2,3] and cell 3 [3,4] (wait, 2.5 is in middle of cell [2,3])
    # Let's make wall from (2.5, 2.5) to (5.5, 2.5). 
    # Cells (2,2), (3,2), (4,2), (5,2) should be intersected.
    w_id = make_uuid()
    wall = PWall(
        id=w_id,
        segment=LineSegment2D(start=Point2D(2.5, 2.5), end=Point2D(5.5, 2.5)),
        is_combustible=False
    )
    
    p_floor = PFloor(
        id=f_id, floor_number=0, elevation_z=0.0,
        bounds=BoundingBox(0.0, 0.0, 10.0, 10.0),
        grid_resolution=1.0,
        walls=[wall], doors=[], rooms=[], stairs=[], exits=[]
    )
    
    grid = rasterize_floor(p_floor)
    
    assert grid.get_cell(2, 2) == CellType.OBSTACLE
    assert grid.get_cell(3, 2) == CellType.OBSTACLE
    assert grid.get_cell(4, 2) == CellType.OBSTACLE
    assert grid.get_cell(5, 2) == CellType.OBSTACLE
    
    assert grid.get_cell(2, 3) == CellType.WALKABLE
    assert grid.get_cell(1, 2) == CellType.WALKABLE


def test_door_overrides_obstacle():
    f_id = make_uuid()
    # Door at (3.5, 2.5) should punch a hole in the wall
    wall = PWall(
        id=make_uuid(),
        segment=LineSegment2D(start=Point2D(2.5, 2.5), end=Point2D(5.5, 2.5)),
        is_combustible=False
    )
    door = PDoor(
        id=make_uuid(),
        center=Point2D(3.5, 2.5),
        width=1.0,
        room_a_id=None, room_b_id=None
    )
    
    p_floor = PFloor(
        id=f_id, floor_number=0, elevation_z=0.0,
        bounds=BoundingBox(0.0, 0.0, 10.0, 10.0),
        grid_resolution=1.0,
        walls=[wall], doors=[door], rooms=[], stairs=[], exits=[]
    )
    
    grid = rasterize_floor(p_floor)
    
    assert grid.get_cell(2, 2) == CellType.OBSTACLE
    assert grid.get_cell(3, 2) == CellType.DOOR  # Overridden
    assert grid.get_cell(4, 2) == CellType.OBSTACLE


def test_stair_and_exit_marking():
    f_id = make_uuid()
    stair = PStair(
        id=make_uuid(),
        center=Point2D(1.5, 1.5),
        width=2.0, target_floor_id=None, is_upward=True
    )
    exit_obj = PExit(
        id=make_uuid(),
        center=Point2D(8.5, 8.5),
        width=2.0, discharge_rate=1.0
    )
    
    p_floor = PFloor(
        id=f_id, floor_number=0, elevation_z=0.0,
        bounds=BoundingBox(0.0, 0.0, 10.0, 10.0),
        grid_resolution=1.0,
        walls=[], doors=[], rooms=[], stairs=[stair], exits=[exit_obj]
    )
    
    grid = rasterize_floor(p_floor)
    
    assert grid.get_cell(1, 1) == CellType.STAIR
    assert grid.get_cell(8, 8) == CellType.EXIT
    assert grid.get_cell(5, 5) == CellType.WALKABLE


def test_rasterize_building():
    b_id = make_uuid()
    f_id = make_uuid()
    p_floor = PFloor(
        id=f_id, floor_number=0, elevation_z=0.0,
        bounds=BoundingBox(0.0, 0.0, 10.0, 10.0),
        grid_resolution=1.0,
        walls=[], doors=[], rooms=[], stairs=[], exits=[]
    )
    p_building = PreprocessedBuilding(
        id=b_id,
        name="Test",
        floors={f_id: p_floor},
        sorted_floors=[p_floor]
    )
    
    result = rasterize_building(p_building)
    assert result.building_id == b_id
    assert f_id in result.floor_grids
    assert result.floor_grids[f_id].width_cells == 10
