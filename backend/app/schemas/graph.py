from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# GraphTopology Schemas
# ---------------------------------------------------------------------------
class GraphTopologyBase(BaseModel):
    version: str = Field(default="1.0", max_length=50)
    node_count: int = Field(default=0, ge=0)
    edge_count: int = Field(default=0, ge=0)
    serialized_graph: Optional[Dict[str, Any]] = None


class GraphTopologyCreate(GraphTopologyBase):
    building_id: UUID


class GraphTopologyUpdate(BaseModel):
    version: Optional[str] = Field(default=None, max_length=50)
    node_count: Optional[int] = Field(default=None, ge=0)
    edge_count: Optional[int] = Field(default=None, ge=0)
    serialized_graph: Optional[Dict[str, Any]] = None


class GraphTopologyRead(GraphTopologyBase):
    id: UUID
    building_id: UUID
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# GraphNode Schemas
# ---------------------------------------------------------------------------
class GraphNodeBase(BaseModel):
    floor_number: int
    x: float
    y: float
    z: float = Field(default=0.0)
    node_type: str = Field(max_length=50)
    capacity_persons: float = Field(default=0.0, ge=0.0)
    base_cost: float = Field(default=1.0, gt=0.0)


class GraphNodeCreate(GraphNodeBase):
    topology_id: UUID


class GraphNodeUpdate(BaseModel):
    floor_number: Optional[int] = None
    x: Optional[float] = None
    y: Optional[float] = None
    z: Optional[float] = None
    node_type: Optional[str] = Field(default=None, max_length=50)
    capacity_persons: Optional[float] = Field(default=None, ge=0.0)
    base_cost: Optional[float] = Field(default=None, gt=0.0)


class GraphNodeRead(GraphNodeBase):
    id: UUID
    topology_id: UUID
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# GraphEdge Schemas
# ---------------------------------------------------------------------------
class GraphEdgeBase(BaseModel):
    length_meters: float = Field(ge=0.0)
    max_flow_rate: float = Field(ge=0.0)
    width_meters: float = Field(ge=0.0)
    bidirectional: bool = Field(default=True)
    base_traversal_time: float = Field(ge=0.0)


class GraphEdgeCreate(GraphEdgeBase):
    topology_id: UUID
    source_node_id: UUID
    target_node_id: UUID


class GraphEdgeUpdate(BaseModel):
    length_meters: Optional[float] = Field(default=None, ge=0.0)
    max_flow_rate: Optional[float] = Field(default=None, ge=0.0)
    width_meters: Optional[float] = Field(default=None, ge=0.0)
    bidirectional: Optional[bool] = None
    base_traversal_time: Optional[float] = Field(default=None, ge=0.0)


class GraphEdgeRead(GraphEdgeBase):
    id: UUID
    topology_id: UUID
    source_node_id: UUID
    target_node_id: UUID
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)
