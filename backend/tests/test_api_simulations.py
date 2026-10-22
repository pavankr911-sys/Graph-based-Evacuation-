import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
import asyncio

from app.models.building import Building
from app.models.graph import GraphTopology

from fastapi.testclient import TestClient

@pytest.mark.asyncio
async def test_create_and_poll_simulation(
    client: TestClient, session: AsyncSession
):
    # Create test building
    test_building = Building(name="Test Building", total_floors=1)
    session.add(test_building)
    await session.commit()
    
    # Create a dummy GraphTopology for the building so simulation doesn't fail
    topo = GraphTopology(
        building_id=test_building.id,
        version="v1",
        node_count=2,
        edge_count=1,
        serialized_graph={}
    )
    session.add(topo)
    await session.flush()
    
    from app.models.graph import GraphNode, GraphEdge
    
    node1 = GraphNode(
        topology_id=topo.id,
        floor_number=0, x=0.0, y=0.0, node_type="ROOM"
    )
    node2 = GraphNode(
        topology_id=topo.id,
        floor_number=0, x=10.0, y=0.0, node_type="EXIT"
    )
    session.add_all([node1, node2])
    await session.flush()
    
    edge = GraphEdge(
        topology_id=topo.id,
        source_node_id=node1.id,
        target_node_id=node2.id,
        length_meters=10.0,
        max_flow_rate=1.0,
        width_meters=1.0,
        base_traversal_time=10.0
    )
    session.add(edge)
    await session.commit()

    # 1. Start simulation
    payload = {
        "occupant_count": 5,
        "tick_rate_hz": 1.0,
        "max_time_sec": 15.0
    }
    response = client.post(f"/api/v1/buildings/{test_building.id}/simulations", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "PENDING"
    sim_id = data["id"]

    # 2. Poll for completion
    for _ in range(30):
        await asyncio.sleep(0.1)
        res = client.get(f"/api/v1/buildings/simulations/{sim_id}")
        data = res.json()
        if data["status"] in ["COMPLETED", "FAILED"]:
            break
            
    assert data["status"] == "COMPLETED"
    
    # Check results
    results = data["results"]
    assert "frames" in results
    frames = results["frames"]
    assert len(frames) > 0
    
    # Ensure time progresses and agents are initialized with demographics
    first_frame = frames[0]
    assert first_frame["time_sec"] == 0.0
    assert len(first_frame["agents"]) == 5
    
    # Check demographics
    for agent in first_frame["agents"]:
        assert agent["profile"] in ["ADULT", "CHILD", "ELDERLY", "DISABLED"]
        assert agent["base_speed"] >= 0.2
        assert agent["velocity"] == agent["base_speed"]
        
    last_frame = frames[-1]
    # They should all have reached the exit node
    assert last_frame["time_sec"] > 0.0
    for agent in last_frame["agents"]:
        assert agent["status"] == "EXITED"
        assert agent["exit_node_id"] is not None
        # Verify agents gather outside the exit at the designated assembly point
        assert agent["x"] >= 10.0
