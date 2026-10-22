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
    target_exit_id: Optional[str] = None
    exit_node_id: Optional[str] = None

class SimulationFrame(BaseModel):
    time_sec: float
    agents: List[AgentState]
    hazards: List[Dict[str, Any]] = []

class SimulationConfigCreate(BaseModel):
    occupant_count: int = 10
    tick_rate_hz: float = 5.0
    max_time_sec: float = 300.0
    hazard_ignition_nodes: List[str] = []
    hazard_spread_rate: float = 0.05
    routing_algorithm: str = "ALGO_D"

class ComparisonConfigCreate(BaseModel):
    occupant_count: int = 20
    tick_rate_hz: float = 5.0
    max_time_sec: float = 120.0
    hazard_ignition_nodes: List[str] = []
    hazard_spread_rate: float = 0.05
    algorithms: List[str] = ["ALGO_A", "ALGO_B", "ALGO_C", "ALGO_D"]

class AlgorithmMetricResult(BaseModel):
    algorithm: str
    algorithm_name: str
    simulation_id: str
    total_evacuation_time: float
    evacuated_count: int
    trapped_count: int
    casualties: int
    avg_evacuation_time: float
    evacuation_curve: List[Dict[str, Any]]

class ComparisonResultRead(BaseModel):
    building_id: str
    occupant_count: int
    metrics: Dict[str, AlgorithmMetricResult]
    winner: str
    summary: str
    created_at: datetime = datetime.now()

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

