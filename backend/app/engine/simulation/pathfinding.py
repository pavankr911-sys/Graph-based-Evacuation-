import heapq
import math
from typing import Dict, List, Tuple, Optional
from uuid import UUID
from app.models.graph import GraphTopology, GraphNode, GraphEdge

class Navigator:
    def __init__(self, topology: GraphTopology):
        self.topology = topology
        self.nodes = {n.id: n for n in topology.nodes}
        self.edges = topology.edges
        
        # Build adjacency list: node_id -> list of (neighbor_id, length)
        self.adj: Dict[UUID, List[Tuple[UUID, float]]] = {n.id: [] for n in topology.nodes}
        for edge in self.edges:
            # We add edges in reverse direction for backward Dijkstra
            self.adj[edge.target_node_id].append((edge.source_node_id, edge.length_meters))
            if edge.bidirectional:
                self.adj[edge.source_node_id].append((edge.target_node_id, edge.length_meters))
                
        # distance_map[node_id] = (distance_to_exit, next_node_id)
        self.distance_map: Dict[UUID, Tuple[float, Optional[UUID]]] = {}
        self._compute_flow_field()

    def _compute_flow_field(self):
        """
        Runs multi-source Dijkstra's algorithm backwards from all EXIT nodes
        to compute the shortest path from any node to the nearest exit.
        """
        exit_nodes = [n for n in self.topology.nodes if n.node_type == "EXIT"]
        
        # Priority queue stores tuples of (distance, node_id, next_node_id)
        pq = []
        for ex in exit_nodes:
            self.distance_map[ex.id] = (0.0, None) # EXIT has dist 0, no next node
            heapq.heappush(pq, (0.0, ex.id, None))
            
        while pq:
            current_dist, current_node_id, next_node_id = heapq.heappop(pq)
            
            # If we already found a shorter path, skip
            if self.distance_map.get(current_node_id, (float("inf"),))[0] < current_dist:
                continue
                
            # Iterate neighbors (in reverse graph, these are nodes that can reach current_node_id)
            for neighbor_id, edge_length in self.adj[current_node_id]:
                new_dist = current_dist + edge_length
                old_dist = self.distance_map.get(neighbor_id, (float("inf"),))[0]
                
                if new_dist < old_dist:
                    self.distance_map[neighbor_id] = (new_dist, current_node_id)
                    heapq.heappush(pq, (new_dist, neighbor_id, current_node_id))
                    
    def get_next_node(self, node_id: UUID) -> Optional[GraphNode]:
        """Returns the next node to travel to reach the nearest exit."""
        if node_id not in self.distance_map:
            return None
        next_node_id = self.distance_map[node_id][1]
        if not next_node_id:
            return None
        return self.nodes[next_node_id]

    def get_distance_to_exit(self, node_id: UUID) -> float:
        """Returns the shortest distance to the nearest exit."""
        if node_id not in self.distance_map:
            return float("inf")
        return self.distance_map[node_id][0]

