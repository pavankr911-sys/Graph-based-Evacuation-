import uuid
from typing import List, Dict, Set, Optional, Any, Tuple
from pydantic import BaseModel
from collections import defaultdict, deque

from app.schemas.graph import GraphTopologyRead, GraphNodeRead, GraphEdgeRead

class ValidationMessage(BaseModel):
    severity: str  # "ERROR" or "WARNING"
    category: str
    message: str
    entity_id: Optional[uuid.UUID] = None

class ValidationResult(BaseModel):
    is_valid: bool
    errors: List[ValidationMessage]
    warnings: List[ValidationMessage]
    
    total_nodes: int
    total_exits: int
    
    connected_components: int
    component_sizes: List[int]
    isolated_nodes: int
    invalid_nodes: int
    invalid_edges: int
    
    reachable_nodes: int
    unreachable_nodes: int
    reachable_exits: int
    unreachable_exits: int
    unreachable_regions: int
    dead_end_nodes: int
    total_capacity_persons: float
    total_egress_flow_rate: float
    invalid_capacity_nodes: int
    invalid_flow_edges: int
    dead_end_regions: int
    bottleneck_nodes: int
    bottleneck_edges: int
    articulation_points: int
    bridges: int
    critical_stair_connections: int

class GraphValidator:
    def __init__(self, topology: GraphTopologyRead, nodes: List[GraphNodeRead], edges: List[GraphEdgeRead]):
        self.topology = topology
        self.nodes = nodes
        self.edges = edges
        
        self.errors: List[ValidationMessage] = []
        self.warnings: List[ValidationMessage] = []
        
        self.node_map: Dict[uuid.UUID, GraphNodeRead] = {}
        self.edge_map: Dict[uuid.UUID, GraphEdgeRead] = {}
        
        # Adjacency list for connectivity analysis (undirected graph traversal)
        self.adj_list: Dict[uuid.UUID, Set[uuid.UUID]] = defaultdict(set)
        
        self.invalid_node_ids: Set[uuid.UUID] = set()
        self.invalid_edge_ids: Set[uuid.UUID] = set()

    def _add_error(self, category: str, message: str, entity_id: Optional[uuid.UUID] = None):
        self.errors.append(ValidationMessage(
            severity="ERROR", category=category, message=message, entity_id=entity_id
        ))

    def _add_warning(self, category: str, message: str, entity_id: Optional[uuid.UUID] = None):
        self.warnings.append(ValidationMessage(
            severity="WARNING", category=category, message=message, entity_id=entity_id
        ))

    def validate(self) -> ValidationResult:
        self._validate_node_integrity()
        self._validate_edge_integrity()
        self._validate_graph_consistency()
        self._validate_special_nodes()
        
        components_count, component_sizes, isolated_count, component_map = self._analyze_connectivity()
        
        reachability_stats = self._analyze_reachability(component_map, components_count)
        capacity_stats = self._analyze_capacity_and_flow()
        dead_end_nodes, dead_end_regions = self._identify_dead_ends()
        bottleneck_stats = self._analyze_bottlenecks()
        
        is_valid = len(self.errors) == 0
        
        # Sort messages deterministically
        self.errors.sort(key=lambda m: (m.category, m.message, str(m.entity_id)))
        self.warnings.sort(key=lambda m: (m.category, m.message, str(m.entity_id)))
        component_sizes.sort(reverse=True)
        
        return ValidationResult(
            is_valid=is_valid,
            errors=self.errors,
            warnings=self.warnings,
            total_nodes=len(self.nodes),
            total_exits=reachability_stats["total_exits"],
            connected_components=components_count,
            component_sizes=component_sizes,
            isolated_nodes=isolated_count,
            invalid_nodes=len(self.invalid_node_ids),
            invalid_edges=len(self.invalid_edge_ids),
            reachable_nodes=reachability_stats["reachable_nodes"],
            unreachable_nodes=reachability_stats["unreachable_nodes"],
            reachable_exits=reachability_stats["reachable_exits"],
            unreachable_exits=reachability_stats["unreachable_exits"],
            unreachable_regions=reachability_stats["unreachable_regions"],
            dead_end_nodes=dead_end_nodes,
            total_capacity_persons=capacity_stats["total_capacity_persons"],
            total_egress_flow_rate=capacity_stats["total_egress_flow_rate"],
            invalid_capacity_nodes=capacity_stats["invalid_capacity_nodes"],
            invalid_flow_edges=capacity_stats["invalid_flow_edges"],
            dead_end_regions=dead_end_regions,
            bottleneck_nodes=bottleneck_stats["articulation_points"],
            bottleneck_edges=bottleneck_stats["bridges"],
            articulation_points=bottleneck_stats["articulation_points"],
            bridges=bottleneck_stats["bridges"],
            critical_stair_connections=bottleneck_stats["critical_stair_connections"]
        )

    def _validate_node_integrity(self):
        seen_ids = set()
        
        for node in self.nodes:
            if node.id in seen_ids:
                self._add_error("NODE_INTEGRITY", f"Duplicate node ID found.", node.id)
                self.invalid_node_ids.add(node.id)
            seen_ids.add(node.id)
            self.node_map[node.id] = node
            
            # Floor checks
            if node.floor_number < 0:
                self._add_error("NODE_INTEGRITY", f"Invalid floor number {node.floor_number}.", node.id)
                self.invalid_node_ids.add(node.id)
                
            # Type checks
            valid_types = {"ROOM", "CORRIDOR", "DOOR", "STAIR", "EXIT", "WALKABLE"}
            if node.node_type not in valid_types:
                self._add_error("NODE_INTEGRITY", f"Invalid node type '{node.node_type}'.", node.id)
                self.invalid_node_ids.add(node.id)
                
            if node.capacity_persons < 0:
                self._add_error("NODE_INTEGRITY", f"Capacity cannot be negative.", node.id)
                self.invalid_node_ids.add(node.id)
                
            if node.base_cost <= 0:
                self._add_error("NODE_INTEGRITY", f"Base cost must be positive.", node.id)
                self.invalid_node_ids.add(node.id)

    def _validate_edge_integrity(self):
        seen_ids = set()
        # To detect undirected duplicate edges: store normalized source/target pairs
        seen_pairs = set()
        
        for edge in self.edges:
            if edge.id in seen_ids:
                self._add_error("EDGE_INTEGRITY", f"Duplicate edge ID found.", edge.id)
                self.invalid_edge_ids.add(edge.id)
            seen_ids.add(edge.id)
            self.edge_map[edge.id] = edge
            
            if edge.source_node_id == edge.target_node_id:
                self._add_error("EDGE_INTEGRITY", f"Prohibited self-loop edge.", edge.id)
                self.invalid_edge_ids.add(edge.id)
                
            # Missing source/target
            source_missing = edge.source_node_id not in self.node_map
            target_missing = edge.target_node_id not in self.node_map
            
            if source_missing:
                self._add_error("EDGE_INTEGRITY", f"Missing source node.", edge.id)
                self.invalid_edge_ids.add(edge.id)
            if target_missing:
                self._add_error("EDGE_INTEGRITY", f"Missing target node.", edge.id)
                self.invalid_edge_ids.add(edge.id)
                
            # Negative/zero distance
            if edge.length_meters <= 0:
                self._add_error("EDGE_INTEGRITY", f"Edge distance must be positive.", edge.id)
                self.invalid_edge_ids.add(edge.id)
                
            if edge.base_traversal_time <= 0:
                self._add_error("EDGE_INTEGRITY", f"Edge traversal time must be positive.", edge.id)
                self.invalid_edge_ids.add(edge.id)
                
            if edge.max_flow_rate < 0:
                self._add_error("EDGE_INTEGRITY", f"Edge capacity (max flow rate) cannot be negative.", edge.id)
                self.invalid_edge_ids.add(edge.id)
                
            # Duplicate edges check
            if not source_missing and not target_missing:
                pair = tuple(sorted([str(edge.source_node_id), str(edge.target_node_id)]))
                if pair in seen_pairs:
                    self._add_error("EDGE_INTEGRITY", f"Duplicate connection between nodes.", edge.id)
                    self.invalid_edge_ids.add(edge.id)
                else:
                    seen_pairs.add(pair)
                
                # Build adjacency list for connectivity analysis
                # Even if edge is directed, for component analysis we often treat as undirected. 
                # (But navigation graph bidirectional=True generally for these static edges)
                self.adj_list[edge.source_node_id].add(edge.target_node_id)
                self.adj_list[edge.target_node_id].add(edge.source_node_id)

    def _validate_graph_consistency(self):
        # Topology matches
        for node in self.nodes:
            if node.topology_id != self.topology.id:
                self._add_error("GRAPH_CONSISTENCY", f"Node belongs to wrong topology.", node.id)
                self.invalid_node_ids.add(node.id)
                
        for edge in self.edges:
            if edge.topology_id != self.topology.id:
                self._add_error("GRAPH_CONSISTENCY", f"Edge belongs to wrong topology.", edge.id)
                self.invalid_edge_ids.add(edge.id)
                
        # Count mismatch warning
        if self.topology.node_count != len(self.nodes):
            self._add_warning("GRAPH_CONSISTENCY", f"Topology node_count ({self.topology.node_count}) does not match actual node count ({len(self.nodes)}).")
            
        if self.topology.edge_count != len(self.edges):
            self._add_warning("GRAPH_CONSISTENCY", f"Topology edge_count ({self.topology.edge_count}) does not match actual edge count ({len(self.edges)}).")

    def _validate_special_nodes(self):
        for node in self.nodes:
            if node.node_type in ("DOOR", "EXIT", "STAIR"):
                # Must have at least one connection
                if node.id not in self.adj_list or len(self.adj_list[node.id]) == 0:
                    self._add_warning("SPECIAL_NODE", f"Special node type '{node.node_type}' is isolated.", node.id)

        # Check multi-floor vertical egress requirements
        floor_numbers = sorted(list({n.floor_number for n in self.nodes}))
        for f_num in floor_numbers:
            if f_num > 0:
                has_stair = any(n.floor_number == f_num and n.node_type == "STAIR" for n in self.nodes)
                if not has_stair:
                    self._add_warning(
                        "STAIR_REQUIREMENT",
                        f"Floor {f_num} has walkable spaces but no staircase. Evacuees on upper floors require stairs to reach Ground Floor exits."
                    )

    def _analyze_connectivity(self) -> Tuple[int, List[int], int, Dict[uuid.UUID, int]]:
        visited = set()
        components_count = 0
        component_sizes = []
        isolated_count = 0
        component_map = {} # node_id -> component_index
        
        sorted_node_ids = sorted(list(self.node_map.keys()))
        
        for node_id in sorted_node_ids:
            if node_id not in visited:
                components_count += 1
                size = 0
                
                # BFS
                queue = deque([node_id])
                visited.add(node_id)
                
                while queue:
                    curr = queue.popleft()
                    size += 1
                    component_map[curr] = components_count
                    
                    for neighbor in self.adj_list[curr]:
                        if neighbor not in visited:
                            visited.add(neighbor)
                            queue.append(neighbor)
                            
                component_sizes.append(size)
                if size == 1:
                    isolated_count += 1
                    
        return components_count, component_sizes, isolated_count, component_map

    def _analyze_reachability(self, component_map: Dict[uuid.UUID, int], num_components: int) -> Dict[str, int]:
        exit_nodes = [node for node in self.nodes if node.node_type == "EXIT"]
        total_exits = len(exit_nodes)
        
        if total_exits == 0 and len(self.nodes) > 0:
            self._add_error("REACHABILITY", "Building has no exits.")
            
        components_with_exit = set()
        for exit_node in exit_nodes:
            if exit_node.id in component_map:
                components_with_exit.add(component_map[exit_node.id])
                
        reachable_nodes = 0
        unreachable_nodes = 0
        
        for node in self.nodes:
            if node.id in component_map and component_map[node.id] in components_with_exit:
                reachable_nodes += 1
            else:
                unreachable_nodes += 1
                if node.node_type != "EXIT":
                    self._add_error("REACHABILITY", f"Unreachable {node.node_type} node.", node.id)
                    
        reachable_exits = 0
        unreachable_exits = 0
        
        for exit_node in exit_nodes:
            if exit_node.id in component_map and component_map[exit_node.id] in components_with_exit:
                # Exits are inherently reachable from their own component
                reachable_exits += 1
            else:
                unreachable_exits += 1 # Unlikely unless isolated
                self._add_error("REACHABILITY", "Unreachable exit node.", exit_node.id)
                
        unreachable_regions = num_components - len(components_with_exit)
        
        return {
            "total_exits": total_exits,
            "reachable_nodes": reachable_nodes,
            "unreachable_nodes": unreachable_nodes,
            "reachable_exits": reachable_exits,
            "unreachable_exits": unreachable_exits,
            "unreachable_regions": unreachable_regions
        }

    def _analyze_capacity_and_flow(self) -> Dict[str, Any]:
        total_capacity_persons = 0.0
        total_egress_flow_rate = 0.0
        invalid_capacity_nodes = 0
        invalid_flow_edges = 0
        
        exit_nodes = {node.id for node in self.nodes if node.node_type == "EXIT"}
        
        for node in self.nodes:
            if node.node_type != "EXIT":
                total_capacity_persons += max(0.0, node.capacity_persons)
            
            if node.capacity_persons == 0.0:
                self._add_warning("CAPACITY", f"Node has zero capacity.", node.id)
                invalid_capacity_nodes += 1
                
        for edge in self.edges:
            if edge.max_flow_rate == 0.0:
                self._add_warning("FLOW", f"Edge has zero flow rate.", edge.id)
                invalid_flow_edges += 1
                
            if edge.source_node_id in exit_nodes or edge.target_node_id in exit_nodes:
                total_egress_flow_rate += max(0.0, edge.max_flow_rate)
                
        return {
            "total_capacity_persons": total_capacity_persons,
            "total_egress_flow_rate": total_egress_flow_rate,
            "invalid_capacity_nodes": invalid_capacity_nodes,
            "invalid_flow_edges": invalid_flow_edges
        }

    def _identify_dead_ends(self) -> Tuple[int, int]:
        degree = {node_id: len(neighbors) for node_id, neighbors in self.adj_list.items()}
        for node in self.nodes:
            if node.id not in degree:
                degree[node.id] = 0
                
        exit_nodes = {node.id for node in self.nodes if node.node_type == "EXIT"}
        
        queue = deque([node.id for node in self.nodes if degree[node.id] <= 1 and node.id not in exit_nodes])
        dead_end_nodes = set()
        
        while queue:
            u = queue.popleft()
            if u in dead_end_nodes:
                continue
            dead_end_nodes.add(u)
            
            for v in self.adj_list.get(u, set()):
                if v not in dead_end_nodes:
                    degree[v] -= 1
                    if degree[v] <= 1 and v not in exit_nodes:
                        queue.append(v)
                        
        for u in dead_end_nodes:
            self._add_warning("DEAD_END", "Structural dead end detected.", u)
            
        # Count dead end regions (connected components in the subgraph induced by dead_end_nodes)
        visited_de = set()
        dead_end_regions = 0
        for u in dead_end_nodes:
            if u not in visited_de:
                dead_end_regions += 1
                q = deque([u])
                visited_de.add(u)
                while q:
                    curr = q.popleft()
                    for v in self.adj_list.get(curr, set()):
                        if v in dead_end_nodes and v not in visited_de:
                            visited_de.add(v)
                            q.append(v)
                            
        return len(dead_end_nodes), dead_end_regions

    def _analyze_bottlenecks(self) -> Dict[str, Any]:
        visited = set()
        discovery = {}
        low = {}
        parent = {}
        time_counter = [0]
        
        articulation_points = set()
        bridges = set()
        
        def iterative_dfs(start_node):
            stack = [(start_node, iter(self.adj_list.get(start_node, set())))]
            visited.add(start_node)
            discovery[start_node] = time_counter[0]
            low[start_node] = time_counter[0]
            time_counter[0] += 1
            children = {start_node: 0}
            
            while stack:
                u, children_iter = stack[-1]
                try:
                    v = next(children_iter)
                    if v not in visited:
                        parent[v] = u
                        children[u] = children.get(u, 0) + 1
                        visited.add(v)
                        discovery[v] = time_counter[0]
                        low[v] = time_counter[0]
                        time_counter[0] += 1
                        children[v] = 0
                        stack.append((v, iter(self.adj_list.get(v, set()))))
                    elif v != parent.get(u):
                        low[u] = min(low[u], discovery[v])
                except StopIteration:
                    stack.pop()
                    if stack:
                        p = stack[-1][0]
                        low[p] = min(low[p], low[u])
                        if parent.get(p) is None and children.get(p, 0) > 1:
                            articulation_points.add(p)
                        if parent.get(p) is not None and low[u] >= discovery[p]:
                            articulation_points.add(p)
                        if low[u] > discovery[p]:
                            bridges.add(tuple(sorted([p, u])))

        for node in self.nodes:
            if node.id not in visited:
                iterative_dfs(node.id)
                
        critical_stairs = 0
        for u, v in bridges:
            node_u = self.node_map[u]
            node_v = self.node_map[v]
            if node_u.node_type == "STAIR" or node_v.node_type == "STAIR" or node_u.floor_number != node_v.floor_number:
                critical_stairs += 1
                self._add_warning("BOTTLENECK", "Critical stair connection bridge detected.", u)
            else:
                self._add_warning("BOTTLENECK", "Structural bridge bottleneck detected.", u)
                
        for ap in articulation_points:
            self._add_warning("BOTTLENECK", "Articulation point bottleneck detected.", ap)
            
        return {
            "articulation_points": len(articulation_points),
            "bridges": len(bridges),
            "critical_stair_connections": critical_stairs
        }
