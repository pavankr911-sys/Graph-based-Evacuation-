import uuid
from sqlalchemy import Column, String, ForeignKey, JSON
from sqlalchemy.types import Uuid
from sqlalchemy.orm import relationship, Mapped, mapped_column
from typing import Any, Dict

from app.models.base import Base, UUIDPrimaryKeyMixin, TimestampMixin

class SimulationRun(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "simulation_runs"

    building_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("buildings.id", ondelete="CASCADE"), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="PENDING")
    config: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    results: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=True)
    error_message: Mapped[str] = mapped_column(String(2000), nullable=True)

    # Relationships
    building = relationship("Building", back_populates="simulations")

