import heapq
import math
from typing import Dict, List, Tuple, Optional, Any, Union
from uuid import UUID
from app.models.graph import GraphTopology, GraphNode, GraphEdge
from app.engine.simulation.hazard import HazardEngine

class Navigator:
    def __init__(self, topology: GraphTopology, algorithm: str = "ALGO_A", hazard_engine: Optional[HazardEngine] = None):
        self.topology = topology
        self.algorithm = algorithm
        self.hazard_engine = hazard_engine
        
        # Fast array-indexed lookups
        self.idx_to_node: List[GraphNode] = list(topology.nodes)
        self.node_to_idx: Dict[Any, int] = {}
        for i, node in enumerate(self.idx_to_node):
            self.node_to_idx[node.id] = i
            self.node_to_idx[str(node.id)] = i
            
        self.N = len(self.idx_to_node)
        self.nodes = {n.id: n for n in self.idx_to_node}
        for n in self.idx_to_node:
            self.nodes[str(n.id)] = n
        
        # All EXIT nodes across floors act as discharge targets for evacuation
        self.exit_indices: List[int] = [
            i for i, n in enumerate(self.idx_to_node) if n.node_type == "EXIT"
        ]
        
        # Build integer-indexed reverse adjacency list for multi-source Dijkstra from EXITs
        # adj[u] -> list of (v, length, capacity)
        self.adj: List[List[Tuple[int, float, float]]] = [[] for _ in range(self.N)]
        for edge in topology.edges:
            cap = edge.max_flow_rate if edge.max_flow_rate else 1.0
            u = self.node_to_idx.get(edge.target_node_id)
            v = self.node_to_idx.get(edge.source_node_id)
            if u is not None and v is not None:
                self.adj[u].append((v, edge.length_meters, cap))
                if edge.bidirectional:
                    self.adj[v].append((u, edge.length_meters, cap))
                    
        # State arrays
        self.dist: List[float] = [float("inf")] * self.N
        self.parent: List[Optional[int]] = [None] * self.N
        self.target_exit: List[Optional[int]] = [None] * self.N
        self.node_occupancy_by_idx: Dict[int, int] = {}
        
        # Precompute initial flow field
        self.update_flow_field({})

    def update_flow_field(self, node_occupancy: Dict[UUID, int]):
        """
        Runs multi-source Dijkstra's algorithm backwards from all EXIT nodes.
        Cost function depends on self.algorithm.
        """
        # ALGO_A is static distance-only; skip recomputation once initialized
        if self.algorithm == "ALGO_A" and any(d < float("inf") for d in self.dist):
            return
            
        # Map occupancy by integer index
        self.node_occupancy_by_idx = {
            self.node_to_idx[uid]: count 
            for uid, count in node_occupancy.items() 
            if count > 0 and uid in self.node_to_idx
        }
        
        # Reset distance, parent & target exit arrays
        dist = [float("inf")] * self.N
        parent: List[Optional[int]] = [None] * self.N
        target_exit: List[Optional[int]] = [None] * self.N
        pq: List[Tuple[float, int]] = []
        
        for ex in self.exit_indices:
            dist[ex] = 0.0
            target_exit[ex] = ex
            heapq.heappush(pq, (0.0, ex))
            
        # Pre-cache hazard values if hazard engine exists
        hazard_cache: Dict[int, float] = {}
        if self.hazard_engine and self.hazard_engine.intensities:
            for uid, val in self.hazard_engine.intensities.items():
                if val > 0.01:
                    idx = self.node_to_idx.get(uid)
                    if idx is not None:
                        hazard_cache[idx] = val
                        
        algo = self.algorithm
        occ_dict = self.node_occupancy_by_idx
        adj = self.adj
        
        while pq:
            d, u = heapq.heappop(pq)
            if d > dist[u]:
                continue
                
            u_occ = occ_dict.get(u, 0)
            
            for v, edge_length, edge_capacity in adj[u]:
                h_int = hazard_cache.get(v, 0.0)
                if h_int >= 0.8:
                    continue  # Impassable fatal fire
                    
                penalty = 0.0
                if algo == "ALGO_B":
                    penalty = h_int * 100.0
                elif algo == "ALGO_C":
                    penalty = (u_occ / edge_capacity) * 2.0
                elif algo == "ALGO_D":
                    penalty = (h_int * 200.0) + ((u_occ / edge_capacity) * 5.0)
                    
                new_cost = d + edge_length + penalty
                if new_cost < dist[v]:
                    dist[v] = new_cost
                    parent[v] = u
                    target_exit[v] = target_exit[u]
                    heapq.heappush(pq, (new_cost, v))
                    
        self.dist = dist
        self.parent = parent
        self.target_exit = target_exit

    def get_next_node(self, node_id: Any) -> Optional[GraphNode]:
        idx = self.node_to_idx.get(node_id)
        if idx is None:
            return None
        p_idx = self.parent[idx]
        if p_idx is None:
            return None
        return self.idx_to_node[p_idx]

    def get_target_exit_node(self, node_id: Any) -> Optional[GraphNode]:
        idx = self.node_to_idx.get(node_id)
        if idx is None:
            return None
        ex_idx = self.target_exit[idx]
        if ex_idx is None:
            return None
        return self.idx_to_node[ex_idx]

    def get_distance_to_exit(self, node_id: Any) -> float:
        idx = self.node_to_idx.get(node_id)
        if idx is None:
            return float("inf")
        return self.dist[idx]
