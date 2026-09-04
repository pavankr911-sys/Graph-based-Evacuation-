from typing import List
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.graph import GraphTopology, GraphNode, GraphEdge
from app.schemas.graph import (
    GraphTopologyCreate, GraphTopologyUpdate,
    GraphNodeCreate, GraphNodeUpdate,
    GraphEdgeCreate, GraphEdgeUpdate,
)
from app.services.base import CRUDBase


class CRUDGraphTopology(CRUDBase[GraphTopology, GraphTopologyCreate, GraphTopologyUpdate]):
    async def get_by_building(self, db: AsyncSession, building_id: UUID) -> List[GraphTopology]:
        result = await db.execute(select(GraphTopology).where(GraphTopology.building_id == building_id))
        return list(result.scalars().all())

    async def get_with_elements(self, db: AsyncSession, id: UUID) -> GraphTopology | None:
        result = await db.execute(
            select(GraphTopology)
            .options(
                selectinload(GraphTopology.nodes),
                selectinload(GraphTopology.edges)
            )
            .where(GraphTopology.id == id)
        )
        return result.scalars().first()


class CRUDGraphNode(CRUDBase[GraphNode, GraphNodeCreate, GraphNodeUpdate]):
    async def get_by_topology(self, db: AsyncSession, topology_id: UUID) -> List[GraphNode]:
        result = await db.execute(select(GraphNode).where(GraphNode.topology_id == topology_id))
        return list(result.scalars().all())


class CRUDGraphEdge(CRUDBase[GraphEdge, GraphEdgeCreate, GraphEdgeUpdate]):
    async def get_by_topology(self, db: AsyncSession, topology_id: UUID) -> List[GraphEdge]:
        result = await db.execute(select(GraphEdge).where(GraphEdge.topology_id == topology_id))
        return list(result.scalars().all())


topology = CRUDGraphTopology(GraphTopology)
node = CRUDGraphNode(GraphNode)
edge = CRUDGraphEdge(GraphEdge)
