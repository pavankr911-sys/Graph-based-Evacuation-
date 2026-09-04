import logging
import asyncio
from typing import Dict, Any, List
from datetime import datetime
from uuid import uuid4, UUID

from app.models.graph import GraphTopology
from app.schemas.simulation import AgentState, SimulationFrame, SimulationConfigCreate

from app.engine.simulation.demographics import generate_agent_profile
from app.engine.simulation.pathfinding import Navigator
import random
import math

logger = logging.getLogger(__name__)

class EvacuationSimulation:
    def __init__(self, topology: GraphTopology, config: SimulationConfigCreate):
        self.topology = topology
        self.config = config
        self.current_time_sec = 0.0
        self.frames: List[SimulationFrame] = []
        self.agents: List[AgentState] = []
        self.navigator = Navigator(topology)
        self.nodes = {n.id: n for n in topology.nodes}
        
        self._initialize_agents()

    def _initialize_agents(self):
        # Find all WALKABLE nodes in the topology
        walkable_nodes = [n for n in self.topology.nodes if n.node_type == "WALKABLE"]
        
        # If no walkable nodes exist, fallback
        if not walkable_nodes:
            logger.warning("No WALKABLE nodes found in topology. Using origin (0,0) for all agents.")
        
        for i in range(self.config.occupant_count):
            # Generate demographic
            profile_id, base_speed = generate_agent_profile()
            
            # Pick a starting room
            start_node = random.choice(walkable_nodes) if walkable_nodes else None
            x = start_node.x if start_node else 0.0
            y = start_node.y if start_node else 0.0
            floor = start_node.floor_number if start_node else 0
            node_id_str = str(start_node.id) if start_node else None
            
            self.agents.append(AgentState(
                id=str(uuid4()),
                x=x,
                y=y,
                floor_number=floor,
                status="IDLE" if start_node else "TRAPPED",
                profile=profile_id,
                base_speed=base_speed,
                velocity=base_speed,
                current_node_id=node_id_str,
                target_node_id=None
            ))

    def _move_agent(self, agent: AgentState, dt: float):
        """Moves a single agent along the path."""
        if not agent.current_node_id:
            agent.status = "TRAPPED"
            agent.velocity = 0.0
            return
            
        current_node = self.nodes.get(UUID(agent.current_node_id))
        if not current_node:
            agent.status = "TRAPPED"
            agent.velocity = 0.0
            return

        if current_node.node_type == "EXIT":
            agent.status = "EXITED"
            agent.velocity = 0.0
            return

        if agent.status == "IDLE":
            agent.status = "MOVING"

        # If we don't have a target, ask navigator
        if not agent.target_node_id:
            next_node = self.navigator.get_next_node(UUID(agent.current_node_id))
            if not next_node:
                # No path to exit
                agent.status = "TRAPPED"
                agent.velocity = 0.0
                return
            agent.target_node_id = str(next_node.id)

        target_node = self.nodes.get(UUID(agent.target_node_id))
        
        # Calculate vector to target
        dx = target_node.x - agent.x
        dy = target_node.y - agent.y
        dist = math.hypot(dx, dy)
        
        move_dist = agent.base_speed * dt
        
        if move_dist >= dist:
            # Reached target node
            agent.x = target_node.x
            agent.y = target_node.y
            agent.floor_number = target_node.floor_number
            agent.current_node_id = agent.target_node_id
            agent.target_node_id = None
            
            # Check if this new node is an exit
            if target_node.node_type == "EXIT":
                agent.status = "EXITED"
                agent.velocity = 0.0
        else:
            # Move towards target
            if dist > 0:
                agent.x += (dx / dist) * move_dist
                agent.y += (dy / dist) * move_dist
            agent.velocity = agent.base_speed

    def tick(self):
        """Advances the simulation by 1 tick and records the frame."""
        dt = 1.0 / self.config.tick_rate_hz
        
        for agent in self.agents:
            if agent.status not in ["EXITED", "TRAPPED"]:
                self._move_agent(agent, dt)
        
        # Record frame
        frame = SimulationFrame(
            time_sec=self.current_time_sec,
            agents=[a.model_copy() for a in self.agents],
            hazards=[]
        )
        self.frames.append(frame)
        self.current_time_sec += dt

    async def run(self):
        """Runs the simulation loop asynchronously."""
        logger.info(f"Starting simulation. Max time: {self.config.max_time_sec}s")
        dt = 1.0 / self.config.tick_rate_hz
        
        while self.current_time_sec <= self.config.max_time_sec:
            # Check if all exited
            if all(a.status == "EXITED" for a in self.agents):
                # Record one final frame to ensure state consistency
                self.tick()
                logger.info("All agents exited. Simulation complete.")
                break
                
            self.tick()
            # Yield to event loop to not block FastAPI
            await asyncio.sleep(0.001) 
            
        logger.info(f"Simulation ended at {self.current_time_sec}s")
        return [f.model_dump() for f in self.frames]
