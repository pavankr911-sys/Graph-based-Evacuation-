# Navigation Graph Engine Architecture & Conventions

This document defines the mathematical and architectural conventions for generating a navigation graph from a 2D floorplan. 

## 1. Coordinate System
- **2D Coordinate Convention:** Cartesian (x, y) coordinates for horizontal space on a given floor, with a separate discrete `floor_number` indicating vertical elevation. We assume a right-handed coordinate system.
- **Origin (0,0):** Bottom-left corner of the building's bounding box.
- **Axis Directions:** +x represents East/Right, +y represents North/Up. +z represents Upwards (captured discretely via floor number).
- **Units:** Meters (m).
- **Grid Resolution:** Configurable, defaulting to `0.5m x 0.5m` per cell for discrete grid analysis.
- **Conversion (Stored to Grid):**
  - `grid_x = floor(stored_x / grid_resolution)`
  - `grid_y = floor(stored_y / grid_resolution)`

## 2. Node Semantics
A **Navigation Node** represents a distinct spatial location.
- **Topological Skeleton:** 
  - Represents abstract logic. Nodes map strictly to spatial elements: `RoomNode`, `CorridorNode`, `DoorwayNode`, `StairNode`, `ExitNode`.
- **Geometric Navigation Grid:**
  - Represents physical movement. Nodes map strictly to walkable cells. 
  - Each geometric node is assigned the semantic label (room, corridor, etc.) of the element it belongs to.
- **Non-walkable locations** (walls, structural pillars) are explicitly excluded from the geometric navigation graph; no nodes are generated for them.
- **Persisted `GraphNode` Model:** We will persist the *Geometric Navigation Grid* nodes to allow for pathfinding and capacity computation. 

## 3. Edge Semantics
- **Connectivity:** Two nodes are connected if an occupant can move between them directly without crossing an obstacle.
- **Direction:** All edges are **undirected** (bidirectional) by default, except for one-way turnstiles or specific downward/upward-only emergency escalators (which are directed).
- **Diagonal Movement:** Permitted in the geometric grid. An 8-neighbor connectivity model (Moore neighborhood) is used.
- **Distance Calculation:** Euclidean distance.
  - Orthogonal step distance = `grid_resolution` (e.g., 0.5m)
  - Diagonal step distance = `sqrt(2) * grid_resolution` (e.g., ~0.707m)
- **Blocked Edges:** Edges intersecting a Wall or closed Door geometry are excluded during generation.
- **Capacity Semantics:** Edges have a `max_flow_rate` (persons per second) derived from the physical width of the boundary they cross.

## 4. Static vs Dynamic State
- **STATIC GRAPH (Generated & Persisted here):**
  - Geometry (node (x,y) positions)
  - Connectivity (edges between nodes)
  - Distance (edge weights)
  - Traversal Characteristics (stairs vs flat, base cost)
  - Capacity (maximum physical occupancy and theoretical max flow rate)
- **DYNAMIC STATE (Handled in Simulation Engine, NOT persisted to graph models):**
  - Hazard spread (smoke, fire)
  - Congestion levels
  - Real-time occupancy
  - Temporary blockages or opened/closed state changes during evacuation

## 5. Dual-Graph Design
We utilize a dual-graph representation:
**A. Topological Skeleton:**
- **Why it exists:** Provides high-level path planning (e.g., Room A -> Door 1 -> Corridor B -> Exit C). Fast to compute.
- **How it maps:** 1:N mapping to geometric nodes. A `RoomNode` in the topology maps to all grid nodes within that room's geometry.
**B. Geometric Navigation Grid:**
- **Why it exists:** Provides fine-grained routing and collision avoidance. Essential for simulating crowd dynamics, bottlenecking, and localized hazards.
- **Relationship & Routing:**
  - The Simulation Engine will use the **Geometric Navigation Grid** for actual agent movement (A* routing).
  - The **Topological Skeleton** will be used as a heuristic/hierarchical overlay to speed up pathfinding across massive buildings (Hierarchical A*).

## 6. Capacity Model
The mathematical basis for capacity relies on physical area and width, devoid of empirical arbitrary numbers.
- **Node Capacity:** Maximum number of persons that can occupy a cell.
  - Formula: `Area (m^2) * Maximum Packing Density (persons/m^2)`
- **Edge Capacity (Corridors/General):**
  - Formula: `Effective Width (m) * Specific Flow (persons/m/s)`
- **Doorway Capacity:**
  - Formula: `(Door Width - boundary clearance) * Specific Flow`
- **Stair Capacity:**
  - Slightly lower specific flow multiplier due to stair traversal mechanics.
- **Exit Capacity:**
  - Defines the maximum discharge rate to the outside safe zone.
*(Note: Real-world density/flow values are placed in ASSUMPTIONS.md as configurable parameters).*

## 7. Traversal Time
Static traversal time represents the time to cross an edge at a normalized baseline speed in an empty building.
- **Formula:** `traversal_time = distance / base_speed`
- `base_speed` is assumed as `1.0 m/s` for normalized weight calculations.
- Agent-specific speeds (e.g., mobility-impaired vs running) are dynamic and applied by the simulation engine at runtime by multiplying the static weight.

## 8. Multi-Floor Connectivity
- **Stair Nodes:** A geometric representation of a staircase is generated as a sequence of nodes connecting Floor A to Floor B.
- **Vertical Edges:** Edges connecting a node on `floor=N` to `floor=N+1` represent the stair treads.
- **Traversal Distance:** Slant distance = `sqrt(horizontal_run^2 + vertical_rise^2)`.
- **Capacity:** Derived from stair width.

## 9. Obstacles and Invalid Geometry
- **Walls:** Modeled as line segments or polygons. Any geometric grid edge intersecting a wall segment is pruned.
- **Disconnected Areas:** If a room has no doors or a floor has no stairs/exits, the graph will contain isolated subgraphs. The generator will flag these during generation but still output the disconnected graph.
- **Invalid Geometry:** Self-intersecting walls or zero-area rooms will be logged and skipped during the geometric discretization phase.

## 10. Determinism
- Given the exact same building schema, the graph generator will produce the exact same nodes and edges.
- **ID Generation:** UUIDs for generated nodes and edges are generated using `uuid5(NAMESPACE_URL, "building_id:floor_id:x:y")` to ensure deterministic IDs across multiple identical generation runs, rather than random `uuid4()` generation.
