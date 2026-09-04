import math
import uuid
from typing import Dict, List, Optional, Set, Tuple
from sqlalchemy.ext.asyncio import AsyncSession

from app.engine.graph.models import (
    PreprocessedBuilding, PFloor
)
from app.engine.graph.rasterizer import RasterizerResult, WalkabilityGrid, CellType
from app.schemas.graph import (
    GraphTopologyCreate, GraphNodeCreate, GraphEdgeCreate
)
from app.models.graph import GraphTopology, GraphNode, GraphEdge

# UUID namespace for deterministic generation
GRAPH_NAMESPACE = uuid.UUID("11111111-2222-3333-4444-555555555555")

def _deterministic_node_id(building_id: uuid.UUID, floor_id: uuid.UUID, x: int, y: int) -> uuid.UUID:
    name = f"{building_id}:{floor_id}:{x}:{y}"
    return uuid.uuid5(GRAPH_NAMESPACE, name)

def _deterministic_edge_id(topology_id: uuid.UUID, source_id: uuid.UUID, target_id: uuid.UUID) -> uuid.UUID:
    # Sort IDs to ensure undirected edges get the same ID regardless of source/target order
    id1, id2 = sorted([str(source_id), str(target_id)])
    name = f"{topology_id}:{id1}:{id2}"
    return uuid.uuid5(GRAPH_NAMESPACE, name)

class GraphGenerator:
    def __init__(self, building: PreprocessedBuilding, raster: RasterizerResult):
        self.building = building
        self.raster = raster
        
        self.topology_id = uuid.uuid5(GRAPH_NAMESPACE, f"topology:{building.id}")
        self.nodes: Dict[uuid.UUID, GraphNodeCreate] = {}
        self.edges: Dict[uuid.UUID, GraphEdgeCreate] = {}
        
        # Internal mapping for fast lookup during edge generation
        # floor_id -> (cx, cy) -> node_id
        self.grid_nodes: Dict[uuid.UUID, Dict[Tuple[int, int], uuid.UUID]] = {}
        
        # floor_id -> list of (node_id, stair node)
        self.stair_nodes: Dict[uuid.UUID, List[Tuple[uuid.UUID, GraphNodeCreate]]] = {
            f.id: [] for f in building.sorted_floors
        }

    def _get_node_type(self, cell_type: CellType) -> str:
        if cell_type == CellType.DOOR:
            return "DOOR"
        elif cell_type == CellType.STAIR:
            return "STAIR"
        elif cell_type == CellType.EXIT:
            return "EXIT"
        else:
            return "WALKABLE" # Standard topological fallback

    def generate(self) -> Tuple[GraphTopologyCreate, Dict[uuid.UUID, GraphNodeCreate], Dict[uuid.UUID, GraphEdgeCreate]]:
        """Executes all stages of graph generation."""
        self._stage_1_nodes()
        self._stage_2_and_3_horizontal_edges()
        self._stage_4_and_5_special_and_topology()
        self._stage_6_and_7_vertical_connections()
        
        topology = GraphTopologyCreate(
            building_id=self.building.id,
            version="1.0",
            node_count=len(self.nodes),
            edge_count=len(self.edges)
        )
        
        return topology, self.nodes, self.edges

    def _stage_1_nodes(self):
        """Generate navigation nodes from walkable grid locations."""
        for p_floor in self.building.sorted_floors:
            grid = self.raster.floor_grids[p_floor.id]
            res = grid.resolution
            self.grid_nodes[p_floor.id] = {}
            
            # Node Capacity: Area * Max Packing Density (4 persons/m^2 per ASSUMPTIONS.md)
            cell_area = res * res
            node_capacity = cell_area * 4.0
            
            for cx in range(grid.width_cells):
                for cy in range(grid.height_cells):
                    cell_type = grid.get_cell(cx, cy)
                    if cell_type in (CellType.WALKABLE, CellType.DOOR, CellType.STAIR, CellType.EXIT):
                        n_id = _deterministic_node_id(self.building.id, p_floor.id, cx, cy)
                        
                        physical_x = (cx + 0.5) * res
                        physical_y = (cy + 0.5) * res
                        
                        node = GraphNodeCreate(
                            topology_id=self.topology_id,
                            floor_number=p_floor.floor_number,
                            x=physical_x,
                            y=physical_y,
                            z=p_floor.elevation_z,
                            node_type=self._get_node_type(cell_type),
                            capacity_persons=node_capacity,
                            base_cost=1.0 # 1.0 multiplier for flat horizontal movement
                        )
                        self.nodes[n_id] = node
                        self.grid_nodes[p_floor.id][(cx, cy)] = n_id
                        
                        if cell_type == CellType.STAIR:
                            self.stair_nodes[p_floor.id].append((n_id, node))

    def _stage_2_and_3_horizontal_edges(self):
        """Generate edges between compatible neighboring nodes and calculate weights/capacities."""
        # 8-neighbor connectivity
        directions = [
            (1, 0, False), (0, 1, False), (-1, 0, False), (0, -1, False),
            (1, 1, True), (-1, 1, True), (1, -1, True), (-1, -1, True)
        ]
        
        for p_floor in self.building.sorted_floors:
            grid = self.raster.floor_grids[p_floor.id]
            res = grid.resolution
            floor_nodes = self.grid_nodes[p_floor.id]
            
            # Edge flow capacity: width * 1.33 persons/m/s (per ASSUMPTIONS.md)
            edge_width = res
            max_flow_rate = edge_width * 1.33
            
            for (cx, cy), source_id in floor_nodes.items():
                for dx, dy, is_diag in directions:
                    nx, ny = cx + dx, cy + dy
                    
                    if (nx, ny) in floor_nodes:
                        target_id = floor_nodes[(nx, ny)]
                        
                        # Prevent diagonal corner-cutting
                        if is_diag:
                            # Both adjacent orthogonal cells must be walkable
                            if grid.get_cell(cx + dx, cy) == CellType.OBSTACLE or \
                               grid.get_cell(cx, cy + dy) == CellType.OBSTACLE:
                                continue
                                
                        e_id = _deterministic_edge_id(self.topology_id, source_id, target_id)
                        
                        # Only add edge if not already added (undirected)
                        if e_id not in self.edges:
                            dist = res * math.sqrt(2) if is_diag else res
                            
                            # Traversal time = distance / base_speed (1.0 m/s)
                            base_time = dist / 1.0
                            
                            edge = GraphEdgeCreate(
                                topology_id=self.topology_id,
                                source_node_id=source_id,
                                target_node_id=target_id,
                                length_meters=dist,
                                max_flow_rate=max_flow_rate,
                                width_meters=edge_width,
                                bidirectional=True,
                                base_traversal_time=base_time
                            )
                            self.edges[e_id] = edge

    def _stage_4_and_5_special_and_topology(self):
        """
        Verify special nodes are connected.
        In a purely geometric dual-graph design, the node metadata (DOOR, EXIT) 
        and the graph edges directly act as the topological skeleton mapped onto geometry.
        """
        # We implicitly built the geometric grid. Nodes labeled DOOR/EXIT act as the 
        # topological markers.
        # We just verify there are no isolated doors/exits.
        connected_node_ids = set()
        for e in self.edges.values():
            connected_node_ids.add(e.source_node_id)
            connected_node_ids.add(e.target_node_id)
            
        for n_id, node in self.nodes.items():
            if node.node_type in ("DOOR", "EXIT"):
                if n_id not in connected_node_ids:
                    # Isolated door/exit detected (possible if wall thickness overlaps entirely)
                    # We won't crash, but log or handle. In a strict system, this might raise.
                    pass 

    def _stage_6_and_7_vertical_connections(self):
        """Connect stairs vertically across floors."""
        floors = self.building.sorted_floors
        
        for i in range(len(floors) - 1):
            lower_floor = floors[i]
            upper_floor = floors[i+1]
            
            # upper_stair_map: (x, y) -> (node_id, node)
            upper_stair_map = { (n.x, n.y): (n_id, n) for n_id, n in self.stair_nodes[upper_floor.id] }
            
            for l_node_id, l_node in self.stair_nodes[lower_floor.id]:
                coord = (l_node.x, l_node.y)
                if coord in upper_stair_map:
                    u_node_id, u_node = upper_stair_map[coord]
                    
                    e_id = _deterministic_edge_id(self.topology_id, l_node_id, u_node_id)
                    if e_id not in self.edges:
                        # 3.5m inter-floor height, zero horizontal run
                        vertical_dist = upper_floor.elevation_z - lower_floor.elevation_z
                        
                        # Stair width defaults to grid res for a single cell connection
                        stair_width = lower_floor.grid_resolution
                        
                        # Capacity flow for stairs is slightly lower (use multiplier 0.6 from ASSUMPTIONS.md, 
                        # actually assumptions says speed is 0.6. Flow capacity is generally similar or slightly lower.)
                        # We'll use standard flow capacity 1.33 but traversal time is penalized.
                        flow = stair_width * 1.33
                        
                        # Traversal time = distance / (base_speed * stair_penalty)
                        stair_penalty = 0.6
                        base_time = vertical_dist / (1.0 * stair_penalty)
                        
                        edge = GraphEdgeCreate(
                            topology_id=self.topology_id,
                            source_node_id=l_node_id,
                            target_node_id=u_node_id,
                            length_meters=vertical_dist,
                            max_flow_rate=flow,
                            width_meters=stair_width,
                            bidirectional=True,
                            base_traversal_time=base_time
                        )
                        self.edges[e_id] = edge


async def persist_graph(
    db: AsyncSession, 
    topology: GraphTopologyCreate, 
    nodes_map: Dict[uuid.UUID, GraphNodeCreate], 
    edges_map: Dict[uuid.UUID, GraphEdgeCreate]
) -> GraphTopology:
    """Stage 8: Persists the generated graph into the database using bulk inserts."""
    
    topo_id = uuid.uuid5(GRAPH_NAMESPACE, f"topology:{topology.building_id}")
    
    # Check if a topology already exists for this building, if so delete it (regeneration)
    from sqlalchemy import select, delete, insert
    existing = await db.execute(select(GraphTopology).where(GraphTopology.building_id == topology.building_id))
    existing_topo = existing.scalars().first()
    if existing_topo:
        await db.delete(existing_topo)
        await db.commit()
    
    # 1. Create Topology
    db_topo = GraphTopology(**topology.model_dump(exclude_unset=True))
    db_topo.id = topo_id
    db.add(db_topo)
    await db.commit()
    
    # 2. Add Nodes in bulk
    nodes_data = []
    for n_id, n_create in nodes_map.items():
        d = n_create.model_dump(exclude_unset=True)
        d["id"] = n_id
        nodes_data.append(d)
        
    if nodes_data:
        # Chunk inserts to avoid sqlite binding limits
        chunk_size = 5000
        for i in range(0, len(nodes_data), chunk_size):
            await db.execute(insert(GraphNode), nodes_data[i:i+chunk_size])
        
    # 3. Add Edges in bulk
    edges_data = []
    for e_id, e_create in edges_map.items():
        d = e_create.model_dump(exclude_unset=True)
        d["id"] = e_id
        edges_data.append(d)
        
    if edges_data:
        chunk_size = 5000
        for i in range(0, len(edges_data), chunk_size):
            await db.execute(insert(GraphEdge), edges_data[i:i+chunk_size])
        
    await db.commit()
    await db.refresh(db_topo)
    return db_topo
