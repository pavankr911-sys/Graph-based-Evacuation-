import uuid
from typing import Optional, List
from sqlalchemy import Float, ForeignKey, Integer, JSON, String, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import Uuid

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class GraphTopology(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Represents a generated navigation graph for a building."""
    __tablename__ = "graph_topologies"

    building_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("buildings.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    version: Mapped[str] = mapped_column(String(50), nullable=False, default="1.0")
    node_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    edge_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    serialized_graph: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # Relationships
    building: Mapped["Building"] = relationship("Building", back_populates="graph_topologies")
    nodes: Mapped[List["GraphNode"]] = relationship(
        "GraphNode", back_populates="topology", cascade="all, delete-orphan", lazy="selectin"
    )
    edges: Mapped[List["GraphEdge"]] = relationship(
        "GraphEdge", back_populates="topology", cascade="all, delete-orphan", lazy="selectin"
    )


class GraphNode(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Represents a spatial node in the navigation graph."""
    __tablename__ = "graph_nodes"

    topology_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("graph_topologies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    floor_number: Mapped[int] = mapped_column(Integer, nullable=False)
    x: Mapped[float] = mapped_column(Float, nullable=False)
    y: Mapped[float] = mapped_column(Float, nullable=False)
    z: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    node_type: Mapped[str] = mapped_column(String(50), nullable=False) # ROOM|CORRIDOR|DOOR|STAIR|EXIT|HAZARD_POINT
    capacity_persons: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    base_cost: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)

    # Relationships
    topology: Mapped["GraphTopology"] = relationship("GraphTopology", back_populates="nodes")
    # For outgoing edges where this is the source
    outgoing_edges: Mapped[List["GraphEdge"]] = relationship(
        "GraphEdge", foreign_keys="[GraphEdge.source_node_id]", back_populates="source_node"
    )
    # For incoming edges where this is the target
    incoming_edges: Mapped[List["GraphEdge"]] = relationship(
        "GraphEdge", foreign_keys="[GraphEdge.target_node_id]", back_populates="target_node"
    )


class GraphEdge(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Represents a connection (edge) between two navigation nodes."""
    __tablename__ = "graph_edges"

    topology_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("graph_topologies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    source_node_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("graph_nodes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    target_node_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("graph_nodes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    length_meters: Mapped[float] = mapped_column(Float, nullable=False)
    max_flow_rate: Mapped[float] = mapped_column(Float, nullable=False)
    width_meters: Mapped[float] = mapped_column(Float, nullable=False)
    bidirectional: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    base_traversal_time: Mapped[float] = mapped_column(Float, nullable=False)

    # Relationships
    topology: Mapped["GraphTopology"] = relationship("GraphTopology", back_populates="edges")
    source_node: Mapped["GraphNode"] = relationship(
        "GraphNode", foreign_keys=[source_node_id], back_populates="outgoing_edges"
    )
    target_node: Mapped["GraphNode"] = relationship(
        "GraphNode", foreign_keys=[target_node_id], back_populates="incoming_edges"
    )
