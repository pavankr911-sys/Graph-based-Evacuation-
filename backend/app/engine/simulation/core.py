import logging
import asyncio
from typing import Dict, Any, List, Optional, Tuple, Set
from datetime import datetime
from uuid import uuid4, UUID
import heapq

from app.models.graph import GraphTopology
from app.schemas.simulation import AgentState, SimulationFrame, SimulationConfigCreate

from app.engine.simulation.demographics import generate_agent_profile
from app.engine.simulation.pathfinding import Navigator
from app.engine.simulation.hazard import HazardEngine
import random
import math


def _segment_intersects_aabb(p1: Tuple[float, float], p2: Tuple[float, float], box: Tuple[float, float, float, float]) -> bool:
    """Liang-Barsky segment clipping against axis-aligned bounding box."""
    b_min_x, b_min_y, b_max_x, b_max_y = box
    x1, y1 = p1
    x2, y2 = p2
    
    if max(x1, x2) < b_min_x or min(x1, x2) > b_max_x or max(y1, y2) < b_min_y or min(y1, y2) > b_max_y:
        return False
        
    dx = x2 - x1
    dy = y2 - y1
    
    t_min = 0.0
    t_max = 1.0
    
    for p, q in [(-dx, x1 - b_min_x), (dx, b_max_x - x1), (-dy, y1 - b_min_y), (dy, b_max_y - y1)]:
        if abs(p) < 1e-9:
            if q < 0:
                return False
        else:
            t = q / p
            if p < 0:
                if t > t_min:
                    t_min = t
            else:
                if t < t_max:
                    t_max = t
            if t_min > t_max:
                return False
            
    return True


def _plan_outdoor_perimeter_path(
    start: Tuple[float, float],
    target: Tuple[float, float],
    building_bounds: Tuple[float, float, float, float],
    margin: float = 3.0
) -> List[Tuple[float, float]]:
    """
    Computes an outdoor perimeter trajectory around the building envelope.
    Ensures evacuees who exit from any side (North, South, East, West) never
    step back into the building interior to reach the assembly gathering zone.
    """
    min_x, min_y, max_x, max_y = building_bounds
    
    # Inset obstacle box so touching exit boundary doesn't self-collide
    inset = 0.4
    obs_box = (min_x + inset, min_y + inset, max_x - inset, max_y - inset)
    
    if not _segment_intersects_aabb(start, target, obs_box):
        return [target]
        
    # 4 outer perimeter corners with clearance margin
    p_min_x = min_x - margin
    p_max_x = max_x + margin
    p_min_y = min_y - margin
    p_max_y = max_y + margin
    
    corners = [
        (p_min_x, p_min_y), # 0: NW
        (p_max_x, p_min_y), # 1: NE
        (p_max_x, p_max_y), # 2: SE
        (p_min_x, p_max_y), # 3: SW
    ]
    
    # Determine which exterior side start is closest to
    sx, sy = start
    dist_west = abs(sx - min_x)
    dist_east = abs(sx - max_x)
    dist_north = abs(sy - min_y)
    dist_south = abs(sy - max_y)
    min_side_dist = min(dist_west, dist_east, dist_north, dist_south)
    if min_side_dist == dist_west:
        start_outer = (p_min_x, sy)
    elif min_side_dist == dist_east:
        start_outer = (p_max_x, sy)
    elif min_side_dist == dist_north:
        start_outer = (sx, p_min_y)
    else:
        start_outer = (sx, p_max_y)
        
    # Determine which exterior side target is closest to
    tx, ty = target
    t_dist_w = abs(tx - min_x)
    t_dist_e = abs(tx - max_x)
    t_dist_n = abs(ty - min_y)
    t_dist_s = abs(ty - max_y)
    min_t_dist = min(t_dist_w, t_dist_e, t_dist_n, t_dist_s)
    if min_t_dist == t_dist_w:
        target_outer = (p_min_x, ty)
    elif min_t_dist == t_dist_e:
        target_outer = (p_max_x, ty)
    elif min_t_dist == t_dist_n:
        target_outer = (tx, p_min_y)
    else:
        target_outer = (tx, p_max_y)
        
    ring_points = [start_outer] + corners + [target_outer]
    s_idx = 0
    t_idx = 5
    
    # Graph of visible outer ring segments
    adj: Dict[int, List[Tuple[int, float]]] = {i: [] for i in range(6)}
    for i in range(6):
        for j in range(i + 1, 6):
            if not _segment_intersects_aabb(ring_points[i], ring_points[j], obs_box):
                d = math.hypot(ring_points[i][0] - ring_points[j][0], ring_points[i][1] - ring_points[j][1])
                adj[i].append((j, d))
                adj[j].append((i, d))
                
    dist = {i: float("inf") for i in range(6)}
    prev: Dict[int, Optional[int]] = {i: None for i in range(6)}
    dist[s_idx] = 0.0
    pq = [(0.0, s_idx)]
    
    while pq:
        d, u = heapq.heappop(pq)
        if d > dist[u]:
            continue
        if u == t_idx:
            break
        for v, w in adj[u]:
            if dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
                prev[v] = u
                heapq.heappush(pq, (dist[v], v))
                
    path_indices = []
    curr = t_idx
    while curr is not None:
        path_indices.append(curr)
        curr = prev[curr]
    path_indices.reverse()
    
    waypoints = [ring_points[i] for i in path_indices if i != s_idx]
    if not waypoints or waypoints[-1] != target:
        waypoints.append(target)
    return waypoints

logger = logging.getLogger(__name__)

class EvacuationSimulation:
    def __init__(
        self,
        topology: GraphTopology,
        config: SimulationConfigCreate,
        initial_agents: Optional[List[AgentState]] = None
    ):
        self.topology = topology
        self.config = config
        self.current_time_sec = 0.0
        self.frames: List[SimulationFrame] = []
        self.nodes = {n.id: n for n in topology.nodes}
        self.exit_times: Dict[str, float] = {}
        self.casualties: set = set()
        self.tick_count = 0
        self.agent_stair_progress: Dict[str, float] = {}
        
        # Initialize Hazard Engine
        ignition_ids = [UUID(uid) for uid in self.config.hazard_ignition_nodes] if getattr(self.config, 'hazard_ignition_nodes', []) else []
        if not ignition_ids and getattr(self.config, 'hazard_spread_rate', 0.0) > 0.01:
            # Auto-assign an ignition node near room center if hazard spread is enabled
            walkable_nodes = [n for n in topology.nodes if n.node_type == "WALKABLE"]
            if walkable_nodes:
                avg_x = sum(n.x for n in walkable_nodes) / len(walkable_nodes)
                avg_y = sum(n.y for n in walkable_nodes) / len(walkable_nodes)
                closest = min(walkable_nodes, key=lambda n: (n.x - avg_x)**2 + (n.y - avg_y)**2)
                ignition_ids = [closest.id]

        self.hazard_engine = HazardEngine(topology, ignition_ids, spread_rate=getattr(self.config, 'hazard_spread_rate', 0.1))
        
        # Initialize Navigator with Algorithm
        self.navigator = Navigator(topology, algorithm=getattr(self.config, 'routing_algorithm', "ALGO_A"), hazard_engine=self.hazard_engine)

        # Initialize Outdoor Evacuation Assembly / Gathering Zone
        ground_nodes = [n for n in topology.nodes if n.floor_number == 0]
        if not ground_nodes:
            ground_nodes = list(topology.nodes)
        
        if ground_nodes:
            min_x = min(n.x for n in ground_nodes)
            max_x = max(n.x for n in ground_nodes)
            min_y = min(n.y for n in ground_nodes)
            max_y = max(n.y for n in ground_nodes)
            cx = (min_x + max_x) / 2.0
            cy = (min_y + max_y) / 2.0
        else:
            min_x, max_x, min_y, max_y = 0.0, 50.0, 0.0, 30.0
            cx, cy = 25.0, 15.0

        ground_exits = [n for n in topology.nodes if n.node_type == "EXIT" and n.floor_number == 0]
        if ground_exits:
            # Pick primary ground exit (highest y / south exit)
            pri_exit = max(ground_exits, key=lambda e: e.y)
            vx = pri_exit.x - cx
            vy = pri_exit.y - cy
            dist = math.hypot(vx, vy)
            if dist > 1.0:
                ux, uy = vx / dist, vy / dist
                ax = pri_exit.x + ux * 7.5
                ay = pri_exit.y + uy * 7.5
            else:
                ax = pri_exit.x
                ay = max_y + 7.5
        else:
            ax = cx
            ay = max_y + 7.5

        self.assembly_point = {
            "x": round(ax, 2),
            "y": round(ay, 2),
            "radius": 4.5,
            "name": "Evacuation Assembly Area"
        }
        self.building_bounds = (min_x, min_y, max_x, max_y)
        self.perimeter_margin = 3.0
        self.agent_outdoor_waypoints: Dict[str, List[Tuple[float, float]]] = {}
        self.agent_assembly_spots: Dict[str, Any] = {}
        self.assembly_arrival_times: Dict[str, float] = {}
        self.assembly_counter: int = 0
        self.assembly_buffer_ticks: int = 0
        
        if initial_agents is not None:
            self.agents = [a.model_copy(deep=True) for a in initial_agents]
        else:
            self.agents = []
            self._initialize_agents()

    @staticmethod
    def generate_shared_agents(topology: GraphTopology, occupant_count: int) -> List[AgentState]:
        """Generates a reproducible initial pool of agents for fair comparative benchmarking strictly inside the building."""
        walkable_nodes = [n for n in topology.nodes if n.node_type in ["WALKABLE", "ROOM", "CORRIDOR"]]
        if not walkable_nodes:
            walkable_nodes = [n for n in topology.nodes if n.node_type not in ["EXIT", "HAZARD_POINT"]]
        if not walkable_nodes and topology.nodes:
            walkable_nodes = list(topology.nodes)
        exit_nodes = [n for n in topology.nodes if n.node_type == "EXIT"]

        # Prefer strictly interior room nodes that are not right on exit thresholds
        if exit_nodes and len(walkable_nodes) > occupant_count:
            interior_candidates = [
                n for n in walkable_nodes
                if all((n.x - ex.x)**2 + (n.y - ex.y)**2 >= 4.0 for ex in exit_nodes if ex.floor_number == n.floor_number)
            ]
            if len(interior_candidates) >= occupant_count:
                walkable_nodes = interior_candidates

        agents = []
        # Group interior nodes by floor for balanced multi-floor occupant distribution
        floor_numbers = sorted(list({n.floor_number for n in walkable_nodes})) if walkable_nodes else [0]
        nodes_by_floor = {f: [n for n in walkable_nodes if n.floor_number == f] for f in floor_numbers}

        for i in range(occupant_count):
            profile_id, base_speed = generate_agent_profile()
            target_floor = floor_numbers[i % len(floor_numbers)]
            floor_pool = nodes_by_floor.get(target_floor) or walkable_nodes
            start_node = random.choice(floor_pool) if floor_pool else None
            x = start_node.x if start_node else 0.0
            y = start_node.y if start_node else 0.0
            floor = start_node.floor_number if start_node else 0
            node_id_str = str(start_node.id) if start_node else None
            
            agents.append(AgentState(
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
        return agents

    def _initialize_agents(self):
        self.agents = self.generate_shared_agents(self.topology, self.config.occupant_count)

    def _get_agent_assembly_spot(self, agent_id: str):
        """Calculates a natural gathering spot in the outdoor assembly area for an exited agent."""
        if agent_id not in self.agent_assembly_spots:
            idx = self.assembly_counter
            self.assembly_counter += 1
            if idx == 0:
                ox, oy = 0.0, 0.0
            else:
                phi = 2.399963229728653  # golden angle
                r = 0.75 * math.sqrt(idx)
                theta = idx * phi
                ox = r * math.cos(theta)
                oy = r * math.sin(theta)
            self.agent_assembly_spots[agent_id] = (
                round(self.assembly_point["x"] + ox, 2),
                round(self.assembly_point["y"] + oy, 2)
            )
        return self.agent_assembly_spots[agent_id]

    def _move_exited_agent_to_assembly(self, agent: AgentState, dt: float):
        """
        Moves an exited agent smoothly around the exterior perimeter of the building
        to their outdoor assembly muster spot without re-entering the building.
        """
        target_x, target_y = self._get_agent_assembly_spot(agent.id)
        
        # Plan outdoor perimeter waypoints if not already planned
        if agent.id not in self.agent_outdoor_waypoints:
            self.agent_outdoor_waypoints[agent.id] = _plan_outdoor_perimeter_path(
                (agent.x, agent.y),
                (target_x, target_y),
                self.building_bounds,
                margin=self.perimeter_margin
            )
            
        waypoints = self.agent_outdoor_waypoints[agent.id]
        if not waypoints:
            agent.x = target_x
            agent.y = target_y
            agent.velocity = 0.0
            if agent.id not in self.assembly_arrival_times:
                self.assembly_arrival_times[agent.id] = round(self.current_time_sec, 2)
            return

        # Navigate toward current target waypoint
        curr_target_x, curr_target_y = waypoints[0]
        dx = curr_target_x - agent.x
        dy = curr_target_y - agent.y
        dist = math.hypot(dx, dy)
        move_dist = agent.base_speed * dt
        
        if dist <= move_dist:
            agent.x = curr_target_x
            agent.y = curr_target_y
            waypoints.pop(0)
            if not waypoints:
                agent.velocity = 0.0
                if agent.id not in self.assembly_arrival_times:
                    self.assembly_arrival_times[agent.id] = round(self.current_time_sec, 2)
            else:
                agent.velocity = agent.base_speed
        else:
            agent.x += (dx / dist) * move_dist
            agent.y += (dy / dist) * move_dist
            agent.velocity = agent.base_speed


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

        # Check if agent is engulfed in fatal fire
        if getattr(self, 'hazard_engine', None) and self.hazard_engine.is_fatal(UUID(agent.current_node_id)):
            self.casualties.add(agent.id)
            agent.status = "TRAPPED"
            agent.velocity = 0.0
            return

        if current_node.node_type == "EXIT":
            if agent.id not in self.exit_times:
                self.exit_times[agent.id] = round(self.current_time_sec, 2)
            agent.status = "EXITED"
            agent.exit_node_id = str(current_node.id)
            agent.target_exit_id = str(current_node.id)
            agent.velocity = 0.0
            return

        if agent.status == "IDLE":
            agent.status = "MOVING"

        # Dynamically recalculate target node since flow field updates
        next_node = self.navigator.get_next_node(agent.current_node_id)
        if not next_node:
            # No path to exit
            agent.status = "TRAPPED"
            agent.velocity = 0.0
            agent.target_node_id = None
            return
        agent.target_node_id = str(next_node.id)

        target_exit = self.navigator.get_target_exit_node(agent.current_node_id)
        if target_exit:
            agent.target_exit_id = str(target_exit.id)

        target_node = self.nodes.get(UUID(agent.target_node_id))
        
        is_vertical_stair = (target_node.floor_number != agent.floor_number)
        dx = target_node.x - agent.x
        dy = target_node.y - agent.y
        dz = abs(target_node.floor_number - agent.floor_number) * 3.5
        total_dist = math.hypot(dx, dy, dz)
        
        speed_factor = 0.6 if is_vertical_stair else 1.0  # Stair speed penalty per NFPA standard
        move_dist = agent.base_speed * speed_factor * dt
        
        if is_vertical_stair:
            # Progress through continuous vertical stair shaft
            prog = self.agent_stair_progress.get(agent.id, 0.0) + move_dist
            if prog >= total_dist:
                self.agent_stair_progress[agent.id] = 0.0
                agent.x = target_node.x
                agent.y = target_node.y
                agent.floor_number = target_node.floor_number
                agent.current_node_id = agent.target_node_id
                agent.target_node_id = None
                
                if target_node.node_type == "EXIT":
                    if agent.id not in self.exit_times:
                        self.exit_times[agent.id] = round(self.current_time_sec, 2)
                    agent.status = "EXITED"
                    agent.floor_number = 0
                    agent.exit_node_id = str(target_node.id)
                    agent.target_exit_id = str(target_node.id)
                    agent.velocity = 0.0
                    self._get_agent_assembly_spot(agent.id)
            else:
                self.agent_stair_progress[agent.id] = prog
                if total_dist > 0:
                    agent.x += dx * (move_dist / total_dist)
                    agent.y += dy * (move_dist / total_dist)
                agent.velocity = agent.base_speed * 0.6
        else:
            dist_2d = math.hypot(dx, dy)
            if move_dist >= dist_2d:
                # Reached target node on same floor
                agent.x = target_node.x
                agent.y = target_node.y
                agent.floor_number = target_node.floor_number
                agent.current_node_id = agent.target_node_id
                agent.target_node_id = None
                
                # Check if this new node is an exit
                if target_node.node_type == "EXIT":
                    if agent.id not in self.exit_times:
                        self.exit_times[agent.id] = round(self.current_time_sec, 2)
                    agent.status = "EXITED"
                    agent.floor_number = 0  # Reached outdoor ground level
                    agent.exit_node_id = str(target_node.id)
                    agent.target_exit_id = str(target_node.id)
                    agent.velocity = 0.0
                    self._get_agent_assembly_spot(agent.id)
            else:
                # Move towards target
                if dist_2d > 0:
                    agent.x += (dx / dist_2d) * move_dist
                    agent.y += (dy / dist_2d) * move_dist
                agent.velocity = agent.base_speed

    def tick(self):
        """Advances the simulation by 1 tick and records the frame."""
        dt = 1.0 / self.config.tick_rate_hz
        self.tick_count += 1
        
        # 1. Update Hazards
        if getattr(self, 'hazard_engine', None) and any(v > 0 for v in self.hazard_engine.intensities.values()):
            self.hazard_engine.tick(dt)
            
        # 2. Update Node Occupancy for Load-Aware algorithms
        # Only recalculate flow field on first tick or every 1.5 seconds to maximize simulation speed
        flow_interval = max(1, int(self.config.tick_rate_hz * 1.5))
        if self.tick_count == 1 or (self.tick_count % flow_interval == 0):
            node_occupancy: Dict[UUID, int] = {}
            for agent in self.agents:
                if agent.status in ["MOVING", "IDLE"] and agent.current_node_id:
                    uid = UUID(agent.current_node_id)
                    node_occupancy[uid] = node_occupancy.get(uid, 0) + 1
                    
            # 3. Update Flow Field (Dijkstra recalculates based on hazards/crowds)
            self.navigator.update_flow_field(node_occupancy)
        
        # 4. Move Agents
        for agent in self.agents:
            if agent.status not in ["EXITED", "TRAPPED"]:
                self._move_agent(agent, dt)
            elif agent.status == "EXITED":
                self._move_exited_agent_to_assembly(agent, dt)
        
        # 5. Extract hazard state for frontend
        hazard_data = []
        if getattr(self, 'hazard_engine', None):
            for node_id, intensity in self.hazard_engine.intensities.items():
                if intensity > 0.01:
                    node = self.nodes.get(node_id)
                    if node:
                        hazard_data.append({
                            "node_id": str(node_id),
                            "x": node.x,
                            "y": node.y,
                            "floor_number": getattr(node, "floor_number", 0),
                            "intensity": intensity
                        })
                        
        # Record frame
        frame = SimulationFrame(
            time_sec=round(self.current_time_sec, 2),
            agents=[a.model_copy() for a in self.agents],
            hazards=hazard_data
        )
        self.frames.append(frame)
        self.current_time_sec += dt

    async def run(self):
        """Runs the simulation loop asynchronously."""
        logger.info(f"Starting simulation. Max time: {self.config.max_time_sec}s")
        dt = 1.0 / self.config.tick_rate_hz
        
        while self.current_time_sec <= self.config.max_time_sec:
            # Check if all agents have reached a terminal state (either EXITED or TRAPPED)
            active_agents = [a for a in self.agents if a.status not in ["EXITED", "TRAPPED"]]
            if not active_agents and self.current_time_sec > 0:
                # Allow exited agents to walk and gather at the outdoor assembly point
                all_arrived = all(a.id in self.assembly_arrival_times for a in self.agents if a.status == "EXITED")
                if all_arrived or self.assembly_buffer_ticks >= int(self.config.tick_rate_hz * 8):
                    self.tick()
                    logger.info("All agents resolved and assembled outside. Simulation complete.")
                    break
                self.assembly_buffer_ticks += 1

            self.tick()
            # Non-blocking yield without Windows 15ms sleep delay
            if self.tick_count % 15 == 0:
                await asyncio.sleep(0) 
            
        logger.info(f"Simulation ended at {self.current_time_sec}s")

        evacuated_count = sum(1 for a in self.agents if a.status == "EXITED")
        trapped_count = sum(1 for a in self.agents if a.status != "EXITED")
        casualties_count = len(self.casualties)
        avg_evac_time = (
            round(sum(self.exit_times.values()) / len(self.exit_times), 2)
            if self.exit_times else 0.0
        )
        
        # Build evacuation curve sampled across frames
        evacuation_curve = []
        sample_step = max(1, int(self.config.tick_rate_hz))
        for idx in range(0, len(self.frames), sample_step):
            f = self.frames[idx]
            evac_at_t = sum(1 for a in f.agents if a.status == "EXITED")
            evacuation_curve.append({"time": f.time_sec, "evacuated": evac_at_t})
        
        if self.frames and (not evacuation_curve or evacuation_curve[-1]["time"] != self.frames[-1].time_sec):
            final_f = self.frames[-1]
            evacuation_curve.append({
                "time": final_f.time_sec,
                "evacuated": sum(1 for a in final_f.agents if a.status == "EXITED")
            })

        building_evac_time = (
            max(self.exit_times.values()) if self.exit_times else round(self.current_time_sec, 2)
        )
        metrics = {
            "total_evacuation_time": building_evac_time,
            "evacuated_count": evacuated_count,
            "trapped_count": trapped_count,
            "casualties": casualties_count,
            "avg_evacuation_time": avg_evac_time,
            "evacuation_curve": evacuation_curve
        }

        return {
            "frames": [f.model_dump() for f in self.frames],
            "metrics": metrics,
            "assembly_point": self.assembly_point
        }

