import logging
from typing import Dict, List
from uuid import UUID

from app.models.graph import GraphTopology

logger = logging.getLogger(__name__)

class HazardEngine:
    def __init__(self, topology: GraphTopology, ignition_node_ids: List[UUID], spread_rate: float = 0.1):
        """
        spread_rate: Increase in intensity per second for nodes adjacent to fire.
        """
        self.topology = topology
        self.nodes = {n.id: n for n in topology.nodes}
        self.edges = topology.edges
        self.spread_rate = spread_rate
        
        # Adjacency list for fast spread calculation
        self.adj: Dict[UUID, List[UUID]] = {n.id: [] for n in topology.nodes}
        for edge in self.edges:
            self.adj[edge.source_node_id].append(edge.target_node_id)
            if edge.bidirectional:
                self.adj[edge.target_node_id].append(edge.source_node_id)
        
        # Hazard intensity map: only stores burning nodes (sparse dictionary for O(burning) vs O(total_graph))
        self.intensities: Dict[UUID, float] = {}
        
        # Ignite initial nodes
        for node_id in ignition_node_ids:
            if node_id in self.nodes:
                self.intensities[node_id] = 1.0
                
    def tick(self, dt: float):
        """Advances the hazard spread by dt seconds using sparse updates."""
        if not self.intensities:
            return
            
        new_intensities = self.intensities.copy()
        
        for node_id, intensity in self.intensities.items():
            if intensity > 0:
                # Grow intensity at current node
                new_intensities[node_id] = min(1.0, intensity + (self.spread_rate * dt))
                
                # If intensity is high enough, spread to neighbors
                if intensity > 0.4:
                    for neighbor_id in self.adj.get(node_id, []):
                        current_nbr = new_intensities.get(neighbor_id, 0.0)
                        if current_nbr < 1.0:
                            new_intensities[neighbor_id] = min(1.0, current_nbr + (self.spread_rate * 0.5 * dt))
                        
        self.intensities = new_intensities

    def get_intensity(self, node_id: UUID) -> float:
        return self.intensities.get(node_id, 0.0)
        
    def is_fatal(self, node_id: UUID) -> bool:
        """Returns True if the node is considered impassable."""
        return self.get_intensity(node_id) >= 0.8
