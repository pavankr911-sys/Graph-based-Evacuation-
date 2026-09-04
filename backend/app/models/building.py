import uuid
from typing import List, Optional
from sqlalchemy import Float, ForeignKey, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import Uuid

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Building(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Represents a physical building structure containing one or more floors."""

    __tablename__ = "buildings"

    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    total_floors: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    building_metadata: Mapped[Optional[dict]] = mapped_column(
        JSON, default=dict, nullable=True
    )

    # Relationships
    floors: Mapped[list["Floor"]] = relationship(
        "Floor",
        back_populates="building",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="Floor.floor_number",
    )
    graph_topologies: Mapped[list["GraphTopology"]] = relationship(
        "GraphTopology", back_populates="building", cascade="all, delete-orphan", lazy="selectin"
    )
    simulations: Mapped[list["SimulationRun"]] = relationship(
        "SimulationRun", back_populates="building", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Building(id={self.id}, name='{self.name}', total_floors={self.total_floors})>"


class Floor(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Represents a specific horizontal floor level within a building."""

    __tablename__ = "floors"
    __table_args__ = (
        UniqueConstraint(
            "building_id", "floor_number", name="uq_building_floor_number"
        ),
    )

    building_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("buildings.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    floor_number: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )
    name: Mapped[str] = mapped_column(
        String(100), nullable=False, default="Ground Floor"
    )
    width_meters: Mapped[float] = mapped_column(
        Float, nullable=False, default=50.0
    )
    height_meters: Mapped[float] = mapped_column(
        Float, nullable=False, default=30.0
    )
    grid_cell_size: Mapped[float] = mapped_column(
        Float, nullable=False, default=0.5
    )
    raw_geometry: Mapped[Optional[dict]] = mapped_column(
        JSON, default=dict, nullable=True
    )

    # Relationships
    building: Mapped["Building"] = relationship(
        "Building", back_populates="floors"
    )
    rooms: Mapped[list["Room"]] = relationship(
        "Room", back_populates="floor", cascade="all, delete-orphan", lazy="selectin"
    )
    walls: Mapped[list["Wall"]] = relationship(
        "Wall", back_populates="floor", cascade="all, delete-orphan", lazy="selectin"
    )
    doors: Mapped[list["Door"]] = relationship(
        "Door", back_populates="floor", cascade="all, delete-orphan", lazy="selectin"
    )
    stairs: Mapped[list["Stair"]] = relationship(
        "Stair", foreign_keys="[Stair.floor_id]", back_populates="floor", cascade="all, delete-orphan", lazy="selectin"
    )
    exits: Mapped[list["Exit"]] = relationship(
        "Exit", back_populates="floor", cascade="all, delete-orphan", lazy="selectin"
    )

    def __repr__(self) -> str:
        return (
            f"<Floor(id={self.id}, building_id={self.building_id}, "
            f"number={self.floor_number}, name='{self.name}')>"
        )
