import uuid
from typing import Optional
from sqlalchemy import Float, ForeignKey, Integer, JSON, String, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import Uuid

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Room(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Represents a discrete room within a floor."""
    __tablename__ = "rooms"

    floor_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("floors.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    room_type: Mapped[str] = mapped_column(String(50), nullable=False, default="general")
    geometry: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    is_accessible: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # Relationships
    floor: Mapped["Floor"] = relationship("Floor", back_populates="rooms")


class Wall(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Represents a wall or impassable boundary."""
    __tablename__ = "walls"

    floor_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("floors.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    start_x: Mapped[float] = mapped_column(Float, nullable=False)
    start_y: Mapped[float] = mapped_column(Float, nullable=False)
    end_x: Mapped[float] = mapped_column(Float, nullable=False)
    end_y: Mapped[float] = mapped_column(Float, nullable=False)
    is_combustible: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # Relationships
    floor: Mapped["Floor"] = relationship("Floor", back_populates="walls")


class Door(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Represents a navigable portal (doorway) between spaces."""
    __tablename__ = "doors"

    floor_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("floors.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    room_a_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("rooms.id", ondelete="SET NULL"), nullable=True
    )
    room_b_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("rooms.id", ondelete="SET NULL"), nullable=True
    )
    position_x: Mapped[float] = mapped_column(Float, nullable=False)
    position_y: Mapped[float] = mapped_column(Float, nullable=False)
    width_meters: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    is_open: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # Relationships
    floor: Mapped["Floor"] = relationship("Floor", back_populates="doors")
    room_a: Mapped[Optional["Room"]] = relationship("Room", foreign_keys=[room_a_id])
    room_b: Mapped[Optional["Room"]] = relationship("Room", foreign_keys=[room_b_id])


class Stair(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Represents a staircase connecting two floors."""
    __tablename__ = "stairs"

    floor_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("floors.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    target_floor_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("floors.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    position_x: Mapped[float] = mapped_column(Float, nullable=False)
    position_y: Mapped[float] = mapped_column(Float, nullable=False)
    width_meters: Mapped[float] = mapped_column(Float, nullable=False, default=1.5)
    is_upward: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # Relationships
    floor: Mapped["Floor"] = relationship("Floor", foreign_keys=[floor_id], back_populates="stairs")
    target_floor: Mapped[Optional["Floor"]] = relationship("Floor", foreign_keys=[target_floor_id])


class Exit(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Represents a final safe exit from the building."""
    __tablename__ = "exits"

    floor_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("floors.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    position_x: Mapped[float] = mapped_column(Float, nullable=False)
    position_y: Mapped[float] = mapped_column(Float, nullable=False)
    width_meters: Mapped[float] = mapped_column(Float, nullable=False, default=2.0)
    discharge_rate: Mapped[float] = mapped_column(Float, nullable=False, default=1.5)
    is_usable: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # Relationships
    floor: Mapped["Floor"] = relationship("Floor", back_populates="exits")
