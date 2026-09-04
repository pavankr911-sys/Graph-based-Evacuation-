import pytest
import uuid
import math
from app.engine.graph.models import (
    Point2D, LineSegment2D, BoundingBox, 
    PWall, PDoor, PRoom, PStair, PExit, PFloor, PreprocessedBuilding
)
from app.engine.graph.rasterizer import rasterize_building
from app.engine.graph.generator import GraphGenerator, persist_graph

pytestmark = pytest.mark.asyncio(loop_scope="function")

def make_uuid():
    return uuid.uuid4()

def setup_single_room_building():
    b_id = make_uuid()
    f_id = make_uuid()
    p_floor = PFloor(
        id=f_id, floor_number=0, elevation_z=0.0,
        bounds=BoundingBox(0.0, 0.0, 2.0, 2.0),
        grid_resolution=1.0,
        walls=[], doors=[], rooms=[], stairs=[], exits=[]
    )
    return PreprocessedBuilding(
        id=b_id, name="Test", floors={f_id: p_floor}, sorted_floors=[p_floor]
    )

def test_stage1_nodes_and_stage2_horizontal_edges():
    # 2x2 grid = 4 nodes, fully connected
    b = setup_single_room_building()
    raster = rasterize_building(b)
    gen = GraphGenerator(b, raster)
    topo, nodes, edges = gen.generate()
    
    assert topo.node_count == 4
    assert len(nodes) == 4
    
    # Check edges
    # (0,0) connects to (1,0), (0,1), and diagonal (1,1)
    # Total undirected edges = 6 in a 2x2 grid (square + 2 diagonals)
    assert len(edges) == 6
    assert topo.edge_count == 6

def test_stage3_edge_weights_and_capacity():
    b = setup_single_room_building()
    raster = rasterize_building(b)
    gen = GraphGenerator(b, raster)
    topo, nodes, edges = gen.generate()
    
    # One orthogonal edge should have dist=1.0, width=1.0, flow=1.33, traversal=1.0
    ortho_edge = next(e for e in edges.values() if math.isclose(e.length_meters, 1.0))
    assert math.isclose(ortho_edge.max_flow_rate, 1.33)
    assert math.isclose(ortho_edge.base_traversal_time, 1.0)
    
    # One diagonal edge should have dist=1.414, width=1.0, flow=1.33, traversal=1.414
    diag_edge = next(e for e in edges.values() if e.length_meters > 1.4)
    assert math.isclose(diag_edge.max_flow_rate, 1.33)
    assert math.isclose(diag_edge.base_traversal_time, math.sqrt(2))

def test_stage4_special_node_mapping():
    b_id = make_uuid()
    f_id = make_uuid()
    door = PDoor(id=make_uuid(), center=Point2D(0.5, 0.5), width=1.0, room_a_id=None, room_b_id=None)
    exit_node = PExit(id=make_uuid(), center=Point2D(1.5, 1.5), width=1.0, discharge_rate=1.0)
    
    p_floor = PFloor(
        id=f_id, floor_number=0, elevation_z=0.0,
        bounds=BoundingBox(0.0, 0.0, 2.0, 2.0),
        grid_resolution=1.0,
        walls=[], doors=[door], rooms=[], stairs=[], exits=[exit_node]
    )
    b = PreprocessedBuilding(id=b_id, name="Test", floors={f_id: p_floor}, sorted_floors=[p_floor])
    raster = rasterize_building(b)
    gen = GraphGenerator(b, raster)
    _, nodes, _ = gen.generate()
    
    door_nodes = [n for n in nodes.values() if n.node_type == "DOOR"]
    exit_nodes = [n for n in nodes.values() if n.node_type == "EXIT"]
    
    assert len(door_nodes) == 1
    assert door_nodes[0].x == 0.5 and door_nodes[0].y == 0.5
    
    assert len(exit_nodes) == 1
    assert exit_nodes[0].x == 1.5 and exit_nodes[0].y == 1.5

def test_stage6_stair_connectivity():
    b_id = make_uuid()
    f1_id = make_uuid()
    f2_id = make_uuid()
    
    stair1 = PStair(id=make_uuid(), center=Point2D(0.5, 0.5), width=1.0, target_floor_id=f2_id, is_upward=True)
    stair2 = PStair(id=make_uuid(), center=Point2D(0.5, 0.5), width=1.0, target_floor_id=f1_id, is_upward=False)
    
    f1 = PFloor(
        id=f1_id, floor_number=0, elevation_z=0.0, bounds=BoundingBox(0,0,1,1),
        grid_resolution=1.0, walls=[], doors=[], rooms=[], stairs=[stair1], exits=[]
    )
    f2 = PFloor(
        id=f2_id, floor_number=1, elevation_z=3.5, bounds=BoundingBox(0,0,1,1),
        grid_resolution=1.0, walls=[], doors=[], rooms=[], stairs=[stair2], exits=[]
    )
    
    b = PreprocessedBuilding(id=b_id, name="Test", floors={f1_id: f1, f2_id: f2}, sorted_floors=[f1, f2])
    raster = rasterize_building(b)
    gen = GraphGenerator(b, raster)
    _, nodes, edges = gen.generate()
    
    # Should have 2 nodes (1 on each floor) and 1 vertical edge
    assert len(nodes) == 2
    assert len(edges) == 1
    
    edge = list(edges.values())[0]
    assert edge.length_meters == 3.5
    assert math.isclose(edge.base_traversal_time, 3.5 / 0.6)

async def test_stage8_persistence(session):
    b = setup_single_room_building()
    raster = rasterize_building(b)
    gen = GraphGenerator(b, raster)
    topo, nodes, edges = gen.generate()
    
    from app.models.building import Building
    
    # Create required parent building
    db_b = Building(id=b.id, name="Test", total_floors=1)
    session.add(db_b)
    await session.commit()
    
    db_topo = await persist_graph(session, topo, nodes, edges)
    assert db_topo is not None
    assert db_topo.node_count == 4
    assert db_topo.edge_count == 6
    
    # Test regeneration
    db_topo2 = await persist_graph(session, topo, nodes, edges)
    assert db_topo2 is not None
    assert db_topo.id == db_topo2.id

def test_wall_blocks_edges():
    b_id = make_uuid()
    f_id = make_uuid()
    # 2x1 grid, with a wall exactly in the middle between cell (0,0) and (1,0)
    # The rasterizer marks (1,0) as OBSTACLE if the wall is inside it.
    # To test edge blocking properly, let's use a 3x1 grid with wall at (1,0)
    wall = PWall(id=make_uuid(), segment=LineSegment2D(Point2D(1.5, 0.0), Point2D(1.5, 1.0)), is_combustible=False)
    
    p_floor = PFloor(
        id=f_id, floor_number=0, elevation_z=0.0,
        bounds=BoundingBox(0.0, 0.0, 3.0, 1.0),
        grid_resolution=1.0,
        walls=[wall], doors=[], rooms=[], stairs=[], exits=[]
    )
    b = PreprocessedBuilding(id=b_id, name="Test", floors={f_id: p_floor}, sorted_floors=[p_floor])
    raster = rasterize_building(b)
    gen = GraphGenerator(b, raster)
    _, nodes, edges = gen.generate()
    
    # Cells: (0,0) Walkable, (1,0) Obstacle, (2,0) Walkable
    assert len(nodes) == 2
    assert len(edges) == 0 # Cannot connect across obstacle

def test_corner_cutting_prevented():
    b_id = make_uuid()
    f_id = make_uuid()
    # 2x2 grid. Obstacle at (1,0) and (0,1). 
    # Diagonal between (0,0) and (1,1) should NOT be allowed.
    w1 = PWall(id=make_uuid(), segment=LineSegment2D(Point2D(1.5, 0.5), Point2D(1.5, 0.5)), is_combustible=False)
    w2 = PWall(id=make_uuid(), segment=LineSegment2D(Point2D(0.5, 1.5), Point2D(0.5, 1.5)), is_combustible=False)
    
    p_floor = PFloor(
        id=f_id, floor_number=0, elevation_z=0.0,
        bounds=BoundingBox(0.0, 0.0, 2.0, 2.0),
        grid_resolution=1.0,
        walls=[w1, w2], doors=[], rooms=[], stairs=[], exits=[]
    )
    b = PreprocessedBuilding(id=b_id, name="Test", floors={f_id: p_floor}, sorted_floors=[p_floor])
    raster = rasterize_building(b)
    gen = GraphGenerator(b, raster)
    _, nodes, edges = gen.generate()
    
    # (0,0) and (1,1) are walkable.
    # No edges should exist because orthogonal is blocked and diagonal is blocked by corners
    assert len(nodes) == 2
    assert len(edges) == 0
