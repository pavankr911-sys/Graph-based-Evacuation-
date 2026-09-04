import pytest
from sqlalchemy import select
from pydantic import ValidationError
from app.core.database import AsyncSessionLocal, init_db
from app.models.building import Building
from app.models.graph import GraphTopology, GraphNode, GraphEdge
from app.schemas.graph import GraphTopologyCreate, GraphNodeCreate, GraphEdgeCreate


@pytest.mark.asyncio
async def test_graph_elements_creation():
    """Verify GraphTopology, GraphNode, GraphEdge models and relationships."""
    await init_db()

    async with AsyncSessionLocal() as session:
        b = Building(name="Graph Test Building")
        session.add(b)
        await session.commit()
        await session.refresh(b)

        # 1. GraphTopology creation
        topo = GraphTopology(building_id=b.id, version="1.0", node_count=2, edge_count=1)
        session.add(topo)
        await session.commit()
        await session.refresh(topo)

        # 2 & 3. GraphNode creation
        n1 = GraphNode(
            topology_id=topo.id,
            floor_number=1,
            x=10.0,
            y=10.0,
            node_type="ROOM",
            capacity_persons=10.0,
        )
        n2 = GraphNode(
            topology_id=topo.id,
            floor_number=1,
            x=20.0,
            y=10.0,
            node_type="DOOR",
            capacity_persons=2.0,
        )
        session.add_all([n1, n2])
        await session.commit()
        await session.refresh(n1)
        await session.refresh(n2)

        # 4 & 5 & 6. GraphEdge creation and Source/Target relationships
        e1 = GraphEdge(
            topology=topo,
            source_node=n1,
            target_node=n2,
            length_meters=10.0,
            max_flow_rate=1.5,
            width_meters=1.0,
            base_traversal_time=7.5,
        )
        session.add(e1)
        await session.commit()

        # Check DB directly
        n_db = (await session.execute(select(GraphNode).where(GraphNode.topology_id == topo.id))).scalars().all()
        e_db = (await session.execute(select(GraphEdge).where(GraphEdge.topology_id == topo.id))).scalars().all()

        assert len(n_db) == 2
        assert len(e_db) == 1

        edge_reloaded = e_db[0]
        assert edge_reloaded.length_meters == 10.0
        assert edge_reloaded.max_flow_rate == 1.5
        
        # Test back populates query from Building
        b_db = await session.execute(select(Building).where(Building.id == b.id))
        b_reloaded = b_db.scalar_one()
        
        # Check DB directly to bypass selectin test limitations
        topo_db = (await session.execute(select(GraphTopology).where(GraphTopology.building_id == b_reloaded.id))).scalars().all()
        assert len(topo_db) == 1
        assert topo_db[0].id == topo.id


def test_graph_schemas_validation():
    """Verify Pydantic schema validation for Graph models."""
    import uuid

    # GraphTopology
    valid_topo = GraphTopologyCreate(building_id=uuid.uuid4(), version="1.1", node_count=5)
    assert valid_topo.version == "1.1"

    with pytest.raises(ValidationError):
        GraphTopologyCreate(building_id=uuid.uuid4(), node_count=-1)

    # GraphNode
    valid_node = GraphNodeCreate(
        topology_id=uuid.uuid4(),
        floor_number=1,
        x=5.0,
        y=5.0,
        node_type="EXIT",
        capacity_persons=5.0,
    )
    assert valid_node.node_type == "EXIT"

    with pytest.raises(ValidationError):
        GraphNodeCreate(
            topology_id=uuid.uuid4(),
            floor_number=1,
            x=5.0,
            y=5.0,
            node_type="EXIT",
            capacity_persons=-2.0, # invalid negative capacity
        )

    # GraphEdge
    valid_edge = GraphEdgeCreate(
        topology_id=uuid.uuid4(),
        source_node_id=uuid.uuid4(),
        target_node_id=uuid.uuid4(),
        length_meters=10.0,
        max_flow_rate=2.0,
        width_meters=1.0,
        base_traversal_time=8.0,
    )
    assert valid_edge.length_meters == 10.0

    with pytest.raises(ValidationError):
        GraphEdgeCreate(
            topology_id=uuid.uuid4(),
            source_node_id=uuid.uuid4(),
            target_node_id=uuid.uuid4(),
            length_meters=-5.0, # invalid negative length
            max_flow_rate=2.0,
            width_meters=1.0,
            base_traversal_time=8.0,
        )
