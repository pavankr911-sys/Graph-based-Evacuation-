import uuid
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, ConfigDict
from datetime import datetime

class AgentState(BaseModel):
    id: str
    x: float
    y: float
    floor_number: int
    status: str  # IDLE, MOVING, EXITED, TRAPPED
    profile: str = "ADULT"
    base_speed: float = 1.25
    velocity: Optional[float] = 0.0
    current_node_id: Optional[str] = None
    target_node_id: Optional[str] = None

class SimulationFrame(BaseModel):
    time_sec: float
    agents: List[AgentState]
    hazards: List[Dict[str, Any]] = []

class SimulationConfigCreate(BaseModel):
    occupant_count: int = 10
    tick_rate_hz: float = 1.0
    max_time_sec: float = 300.0

class SimulationRunRead(BaseModel):
    id: uuid.UUID
    building_id: uuid.UUID
    status: str
    config: Dict[str, Any]
    results: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
