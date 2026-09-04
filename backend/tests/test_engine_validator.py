import pytest
import uuid
from datetime import datetime
from app.schemas.graph import GraphTopologyRead, GraphNodeRead, GraphEdgeRead
from app.engine.graph.validator import GraphValidator

def make_uuid():
    return uuid.uuid4()

def setup_basic_graph():
    topo_id = make_uuid()
    b_id = make_uuid()
    
    topo = GraphTopologyRead(
        id=topo_id,
        building_id=b_id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
        version="1.0",
        node_count=2,
        edge_count=1
    )
    
    n1_id = make_uuid()
    n2_id = make_uuid()
    
    n1 = GraphNodeRead(
        id=n1_id, topology_id=topo_id, floor_number=0, x=0, y=0, node_type="WALKABLE",
        capacity_persons=4.0, base_cost=1.0, created_at=datetime.utcnow(), updated_at=datetime.utcnow()
    )
    n2 = GraphNodeRead(
        id=n2_id, topology_id=topo_id, floor_number=0, x=1, y=0, node_type="EXIT",
        capacity_persons=4.0, base_cost=1.0, created_at=datetime.utcnow(), updated_at=datetime.utcnow()
    )
    
    e1 = GraphEdgeRead(
        id=make_uuid(), topology_id=topo_id, source_node_id=n1_id, target_node_id=n2_id,
        length_meters=1.0, max_flow_rate=1.33, width_meters=1.0, bidirectional=True, base_traversal_time=1.0,
        created_at=datetime.utcnow(), updated_at=datetime.utcnow()
    )
    
    return topo, [n1, n2], [e1]

def test_valid_connected_graph():
    topo, nodes, edges = setup_basic_graph()
    validator = GraphValidator(topo, nodes, edges)
    result = validator.validate()
    
    assert result.is_valid
    assert len(result.errors) == 0
    assert result.connected_components == 1
    assert result.isolated_nodes == 0
    assert result.reachable_nodes == 2

def test_multiple_connected_components():
    topo, nodes, edges = setup_basic_graph()
    n3_id = make_uuid()
    n4_id = make_uuid()
    
    n3 = GraphNodeRead(
        id=n3_id, topology_id=topo.id, floor_number=0, x=5, y=5, node_type="WALKABLE",
        capacity_persons=4.0, base_cost=1.0, created_at=datetime.utcnow(), updated_at=datetime.utcnow()
    )
    n4 = GraphNodeRead(
        id=n4_id, topology_id=topo.id, floor_number=0, x=6, y=5, node_type="EXIT",
        capacity_persons=4.0, base_cost=1.0, created_at=datetime.utcnow(), updated_at=datetime.utcnow()
    )
    
    e2 = GraphEdgeRead(
        id=make_uuid(), topology_id=topo.id, source_node_id=n3_id, target_node_id=n4_id,
        length_meters=1.0, max_flow_rate=1.33, width_meters=1.0, bidirectional=True, base_traversal_time=1.0,
        created_at=datetime.utcnow(), updated_at=datetime.utcnow()
    )
    
    nodes.extend([n3, n4])
    edges.append(e2)
    topo = topo.model_copy(update={"node_count": 4, "edge_count": 2})
    
    validator = GraphValidator(topo, nodes, edges)
    result = validator.validate()
    
    assert result.is_valid
    assert result.connected_components == 2
    assert result.isolated_nodes == 0
    assert result.component_sizes == [2, 2]
    assert result.reachable_nodes == 4

def test_isolated_node():
    topo, nodes, edges = setup_basic_graph()
    n3 = GraphNodeRead(
        id=make_uuid(), topology_id=topo.id, floor_number=0, x=5, y=5, node_type="WALKABLE",
        capacity_persons=4.0, base_cost=1.0, created_at=datetime.utcnow(), updated_at=datetime.utcnow()
    )
    nodes.append(n3)
    topo = topo.model_copy(update={"node_count": 3})
    
    validator = GraphValidator(topo, nodes, edges)
    result = validator.validate()
    
    assert not result.is_valid  # Because isolated node is unreachable WALKABLE
    assert result.isolated_nodes == 1
    assert result.connected_components == 2
    assert result.unreachable_nodes == 1

def test_missing_source_node():
    topo, nodes, edges = setup_basic_graph()
    edges[0] = edges[0].model_copy(update={"source_node_id": make_uuid()})
    
    validator = GraphValidator(topo, nodes, edges)
    result = validator.validate()
    
    assert not result.is_valid
    assert any("Missing source node" in e.message for e in result.errors)
    assert result.invalid_edges == 1

def test_missing_target_node():
    topo, nodes, edges = setup_basic_graph()
    edges[0] = edges[0].model_copy(update={"target_node_id": make_uuid()})
    
    validator = GraphValidator(topo, nodes, edges)
    result = validator.validate()
    
    assert not result.is_valid
    assert any("Missing target node" in e.message for e in result.errors)

def test_invalid_edge_self_loop():
    topo, nodes, edges = setup_basic_graph()
    edges[0] = edges[0].model_copy(update={"target_node_id": edges[0].source_node_id})
    
    validator = GraphValidator(topo, nodes, edges)
    result = validator.validate()
    
    assert not result.is_valid
    assert any("self-loop" in e.message for e in result.errors)

def test_invalid_distance():
    topo, nodes, edges = setup_basic_graph()
    edges[0] = edges[0].model_copy(update={"length_meters": -1.0})
    
    validator = GraphValidator(topo, nodes, edges)
    result = validator.validate()
    
    assert not result.is_valid
    assert any("positive" in e.message for e in result.errors)

def test_invalid_traversal_time():
    topo, nodes, edges = setup_basic_graph()
    edges[0] = edges[0].model_copy(update={"base_traversal_time": 0.0})
    
    validator = GraphValidator(topo, nodes, edges)
    result = validator.validate()
    
    assert not result.is_valid
    assert any("traversal time" in e.message for e in result.errors)

def test_invalid_capacity():
    topo, nodes, edges = setup_basic_graph()
    nodes[0] = nodes[0].model_copy(update={"capacity_persons": -5.0})
    
    validator = GraphValidator(topo, nodes, edges)
    result = validator.validate()
    
    assert not result.is_valid
    assert any("Capacity cannot be negative" in e.message for e in result.errors)

def test_duplicate_edge():
    topo, nodes, edges = setup_basic_graph()
    e2 = edges[0].model_copy(update={"id": make_uuid(), "source_node_id": edges[0].target_node_id, "target_node_id": edges[0].source_node_id})
    edges.append(e2)
    
    validator = GraphValidator(topo, nodes, edges)
    result = validator.validate()
    
    assert not result.is_valid
    assert any("Duplicate connection" in e.message for e in result.errors)

def test_invalid_special_node_reference():
    topo, nodes, edges = setup_basic_graph()
    # Make n1 an isolated special node (DOOR)
    nodes[0] = nodes[0].model_copy(update={"node_type": "DOOR"})
    # Remove edge so n1 is isolated. But n2 is EXIT. So n2 also isolated!
    edges = []
    
    validator = GraphValidator(topo, nodes, edges)
    result = validator.validate()
    
    assert not result.is_valid # isolated DOOR is unreachable -> ERROR
    assert result.unreachable_nodes == 1

def test_deterministic_validation_result():
    topo, nodes, edges = setup_basic_graph()
    
    nodes.append(nodes[0].model_copy(update={"id": make_uuid(), "floor_number": -1}))
    nodes.append(nodes[1].model_copy(update={"id": make_uuid(), "base_cost": -1}))
    
    validator = GraphValidator(topo, nodes, edges)
    result1 = validator.validate()
    
    validator2 = GraphValidator(topo, nodes, edges)
    result2 = validator2.validate()
    
    assert [e.entity_id for e in result1.errors] == [e.entity_id for e in result2.errors]
    assert result1.component_sizes == result2.component_sizes

def test_reachability_simple_with_exit():
    topo, nodes, edges = setup_basic_graph()
    # n2 is already an exit in setup_basic_graph
    
    validator = GraphValidator(topo, nodes, edges)
    res = validator.validate()
    
    assert res.is_valid
    assert res.total_exits == 1
    assert res.reachable_exits == 1
    assert res.reachable_nodes == 2
    assert res.unreachable_nodes == 0
    assert res.unreachable_regions == 0
    assert res.dead_end_nodes == 1

def test_reachability_multiple_exits():
    topo, nodes, edges = setup_basic_graph()
    n3_id = make_uuid()
    n3 = GraphNodeRead(
        id=n3_id, topology_id=topo.id, floor_number=0, x=2, y=0, node_type="EXIT",
        capacity_persons=4.0, base_cost=1.0, created_at=datetime.utcnow(), updated_at=datetime.utcnow()
    )
    e2 = GraphEdgeRead(
        id=make_uuid(), topology_id=topo.id, source_node_id=nodes[1].id, target_node_id=n3_id,
        length_meters=1.0, max_flow_rate=1.33, width_meters=1.0, bidirectional=True, base_traversal_time=1.0,
        created_at=datetime.utcnow(), updated_at=datetime.utcnow()
    )
    nodes[0] = nodes[0].model_copy(update={"node_type": "EXIT"})
    
    nodes.append(n3)
    edges.append(e2)
    topo = topo.model_copy(update={"node_count": 3, "edge_count": 2})
    
    validator = GraphValidator(topo, nodes, edges)
    res = validator.validate()
    
    assert res.is_valid
    assert res.total_exits == 3
    assert res.reachable_exits == 3
    assert res.reachable_nodes == 3

def test_reachability_unreachable_node_and_region():
    topo, nodes, edges = setup_basic_graph()
    n3_id = make_uuid()
    n3 = GraphNodeRead(
        id=n3_id, topology_id=topo.id, floor_number=0, x=5, y=5, node_type="WALKABLE",
        capacity_persons=4.0, base_cost=1.0, created_at=datetime.utcnow(), updated_at=datetime.utcnow()
    )
    nodes.append(n3)
    topo = topo.model_copy(update={"node_count": 3})
    
    validator = GraphValidator(topo, nodes, edges)
    res = validator.validate()
    
    assert not res.is_valid
    assert res.reachable_nodes == 2
    assert res.unreachable_nodes == 1
    assert res.unreachable_regions == 1

def test_reachability_unreachable_exit():
    topo, nodes, edges = setup_basic_graph()
    # First component has an EXIT, we add a second component that ALSO has an EXIT but they are disconnected
    n3_id = make_uuid()
    n3 = GraphNodeRead(
        id=n3_id, topology_id=topo.id, floor_number=0, x=5, y=5, node_type="EXIT",
        capacity_persons=4.0, base_cost=1.0, created_at=datetime.utcnow(), updated_at=datetime.utcnow()
    )
    nodes.append(n3)
    topo = topo.model_copy(update={"node_count": 3})
    
    validator = GraphValidator(topo, nodes, edges)
    res = validator.validate()
    
    # Both exits are reachable from their own components. There are no unreachable nodes.
    assert res.is_valid
    assert res.total_exits == 2
    assert res.reachable_exits == 2
    assert res.unreachable_nodes == 0

def test_reachability_multiple_floors_connected():
    topo, nodes, edges = setup_basic_graph()
    nodes[0] = nodes[0].model_copy(update={"floor_number": 0})
    nodes[1] = nodes[1].model_copy(update={"floor_number": 1, "node_type": "EXIT"})
    
    validator = GraphValidator(topo, nodes, edges)
    res = validator.validate()
    
    assert res.is_valid
    assert res.reachable_nodes == 2

def test_reachability_broken_stair_connection():
    topo, nodes, edges = setup_basic_graph()
    nodes[0] = nodes[0].model_copy(update={"floor_number": 0, "node_type": "STAIR"})
    nodes[1] = nodes[1].model_copy(update={"floor_number": 1, "node_type": "EXIT"})
    edges = []
    topo = topo.model_copy(update={"edge_count": 0})
    
    validator = GraphValidator(topo, nodes, edges)
    res = validator.validate()
    
    assert not res.is_valid
    assert res.reachable_exits == 1
    assert res.unreachable_nodes == 1
    assert res.unreachable_regions == 1

def test_reachability_empty_no_exit():
    topo, nodes, edges = setup_basic_graph()
    nodes[1] = nodes[1].model_copy(update={"node_type": "WALKABLE"})
    validator = GraphValidator(topo, nodes, edges)
    res = validator.validate()
    
    assert not res.is_valid
    assert res.total_exits == 0
    assert any("Building has no exits" in e.message for e in res.errors)


def test_bottleneck_articulation_point():
    topo, nodes, edges = setup_basic_graph()
    
    # Create an articulation point graph: 
    # n1 - n3
    # |    |
    # n4 - n5
    # Wait, simple articulation point: n3 - n1 - n2 (n1 is AP, but n2 is EXIT).
    # Let's do a bow-tie: n3-n4, n4-n5, n5-n3 (cycle) and n5 is connected to n1.
    # Actually, simpler: n3 - n1. n1 is connected to n2 (EXIT).
    # n1 is an articulation point if removing it increases connected components.
    # n3-n1 and n1-n2. Removing n1 separates n3 and n2.
    # So n1 is an articulation point.
    n3_id = make_uuid()
    n3 = GraphNodeRead(
        id=n3_id, topology_id=topo.id, floor_number=0, x=-1, y=0, node_type="WALKABLE",
        capacity_persons=4.0, base_cost=1.0, created_at=datetime.utcnow(), updated_at=datetime.utcnow()
    )
    e2 = GraphEdgeRead(
        id=make_uuid(), topology_id=topo.id, source_node_id=n3_id, target_node_id=nodes[0].id,
        length_meters=1.0, max_flow_rate=1.33, width_meters=1.0, bidirectional=True, base_traversal_time=1.0,
        created_at=datetime.utcnow(), updated_at=datetime.utcnow()
    )
    nodes.append(n3)
    edges.append(e2)
    topo = topo.model_copy(update={"node_count": 3, "edge_count": 2})
    
    validator = GraphValidator(topo, nodes, edges)
    res = validator.validate()
    
    assert res.is_valid
    # n1 is an articulation point.
    assert res.articulation_points >= 1
    # n3 is a leaf node => dead end
    assert res.dead_end_nodes >= 1

def test_bottleneck_bridge():
    topo, nodes, edges = setup_basic_graph()
    # n1-n2 is a bridge because removing it disconnects n1 and n2
    
    validator = GraphValidator(topo, nodes, edges)
    res = validator.validate()
    
    assert res.is_valid
    assert res.bridges == 1

def test_critical_stair_connection():
    topo, nodes, edges = setup_basic_graph()
    nodes[0] = nodes[0].model_copy(update={"floor_number": 0, "node_type": "STAIR"})
    nodes[1] = nodes[1].model_copy(update={"floor_number": 1, "node_type": "EXIT"})
    
    validator = GraphValidator(topo, nodes, edges)
    res = validator.validate()
    
    assert res.is_valid
    assert res.bridges == 1
    assert res.critical_stair_connections == 1

def test_true_dead_end_branch():
    topo, nodes, edges = setup_basic_graph()
    # Add a long branch that leads nowhere
    n3 = GraphNodeRead(
        id=make_uuid(), topology_id=topo.id, floor_number=0, x=-1, y=0, node_type="WALKABLE",
        capacity_persons=4.0, base_cost=1.0, created_at=datetime.utcnow(), updated_at=datetime.utcnow()
    )
    n4 = GraphNodeRead(
        id=make_uuid(), topology_id=topo.id, floor_number=0, x=-2, y=0, node_type="WALKABLE",
        capacity_persons=4.0, base_cost=1.0, created_at=datetime.utcnow(), updated_at=datetime.utcnow()
    )
    e2 = GraphEdgeRead(
        id=make_uuid(), topology_id=topo.id, source_node_id=nodes[0].id, target_node_id=n3.id,
        length_meters=1.0, max_flow_rate=1.33, width_meters=1.0, bidirectional=True, base_traversal_time=1.0,
        created_at=datetime.utcnow(), updated_at=datetime.utcnow()
    )
    e3 = GraphEdgeRead(
        id=make_uuid(), topology_id=topo.id, source_node_id=n3.id, target_node_id=n4.id,
        length_meters=1.0, max_flow_rate=1.33, width_meters=1.0, bidirectional=True, base_traversal_time=1.0,
        created_at=datetime.utcnow(), updated_at=datetime.utcnow()
    )
    nodes.extend([n3, n4])
    edges.extend([e2, e3])
    topo = topo.model_copy(update={"node_count": 4, "edge_count": 3})
    
    validator = GraphValidator(topo, nodes, edges)
    res = validator.validate()
    
    assert res.is_valid
    # nodes: n4, n3, n1 are all dead end nodes because trimming from n4 cascades down to n1
    assert res.dead_end_nodes == 3
    assert res.dead_end_regions == 1

def test_multiple_bottlenecks():
    topo, nodes, edges = setup_basic_graph()
    n3 = GraphNodeRead(id=make_uuid(), topology_id=topo.id, floor_number=0, x=-1, y=0, node_type="WALKABLE", capacity_persons=4.0, base_cost=1.0, created_at=datetime.utcnow(), updated_at=datetime.utcnow())
    n4 = GraphNodeRead(id=make_uuid(), topology_id=topo.id, floor_number=0, x=-2, y=0, node_type="WALKABLE", capacity_persons=4.0, base_cost=1.0, created_at=datetime.utcnow(), updated_at=datetime.utcnow())
    n5 = GraphNodeRead(id=make_uuid(), topology_id=topo.id, floor_number=0, x=-3, y=0, node_type="EXIT", capacity_persons=4.0, base_cost=1.0, created_at=datetime.utcnow(), updated_at=datetime.utcnow())
    
    e2 = GraphEdgeRead(id=make_uuid(), topology_id=topo.id, source_node_id=nodes[0].id, target_node_id=n3.id, length_meters=1.0, max_flow_rate=1.33, width_meters=1.0, bidirectional=True, base_traversal_time=1.0, created_at=datetime.utcnow(), updated_at=datetime.utcnow())
    e3 = GraphEdgeRead(id=make_uuid(), topology_id=topo.id, source_node_id=n3.id, target_node_id=n4.id, length_meters=1.0, max_flow_rate=1.33, width_meters=1.0, bidirectional=True, base_traversal_time=1.0, created_at=datetime.utcnow(), updated_at=datetime.utcnow())
    e4 = GraphEdgeRead(id=make_uuid(), topology_id=topo.id, source_node_id=n4.id, target_node_id=n5.id, length_meters=1.0, max_flow_rate=1.33, width_meters=1.0, bidirectional=True, base_traversal_time=1.0, created_at=datetime.utcnow(), updated_at=datetime.utcnow())
    
    nodes.extend([n3, n4, n5])
    edges.extend([e2, e3, e4])
    topo = topo.model_copy(update={"node_count": 5, "edge_count": 4})
    
    validator = GraphValidator(topo, nodes, edges)
    res = validator.validate()
    
    assert res.is_valid
    # Bridges: all 4 edges are bridges. 
    assert res.bridges == 4
    # Articulation points: n1, n3, n4
    assert res.articulation_points == 3


def test_t5d_capacity_flow_valid():
    topo, nodes, edges = setup_basic_graph()
    validator = GraphValidator(topo, nodes, edges)
    res = validator.validate()
    
    assert res.is_valid
    assert res.total_capacity_persons == 4.0
    assert res.total_egress_flow_rate == 1.33
    assert res.invalid_capacity_nodes == 0
    assert res.invalid_flow_edges == 0

def test_t5d_zero_capacity_node():
    topo, nodes, edges = setup_basic_graph()
    nodes[0] = nodes[0].model_copy(update={"capacity_persons": 0.0})
    
    validator = GraphValidator(topo, nodes, edges)
    res = validator.validate()
    
    assert res.is_valid
    assert res.total_capacity_persons == 0.0
    assert res.invalid_capacity_nodes == 1
    assert any("zero capacity" in str(w.message) for w in res.warnings)

def test_t5d_zero_flow_edge():
    topo, nodes, edges = setup_basic_graph()
    edges[0] = edges[0].model_copy(update={"max_flow_rate": 0.0})
    
    validator = GraphValidator(topo, nodes, edges)
    res = validator.validate()
    
    assert res.is_valid
    assert res.total_egress_flow_rate == 0.0
    assert res.invalid_flow_edges == 1
    assert any("zero flow rate" in str(w.message) for w in res.warnings)

def test_t5d_multiple_exits_egress_flow():
    topo, nodes, edges = setup_basic_graph()
    
    n3_id = make_uuid()
    n3 = GraphNodeRead(
        id=n3_id, topology_id=topo.id, floor_number=0, x=2, y=0, node_type="EXIT",
        capacity_persons=4.0, base_cost=1.0, created_at=datetime.utcnow(), updated_at=datetime.utcnow()
    )
    e2 = GraphEdgeRead(
        id=make_uuid(), topology_id=topo.id, source_node_id=nodes[0].id, target_node_id=n3_id,
        length_meters=1.0, max_flow_rate=2.0, width_meters=1.0, bidirectional=True, base_traversal_time=1.0,
        created_at=datetime.utcnow(), updated_at=datetime.utcnow()
    )
    nodes.append(n3)
    edges.append(e2)
    topo = topo.model_copy(update={"node_count": 3, "edge_count": 2})
    
    validator = GraphValidator(topo, nodes, edges)
    res = validator.validate()
    
    assert res.is_valid
    # n1 connects to n2 (1.33) and n3 (2.0)
    assert res.total_egress_flow_rate == 3.33
    assert res.total_capacity_persons == 4.0
