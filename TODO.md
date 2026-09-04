# Project Master TODO List

---

## Milestone 1: Foundation, Building Editor & Topological Graph Engine

- [ ] **M1-T1:** Backend Setup & Database Foundations
  - Initialize Python 3.11+ structure (`app/core`, `app/models`, `app/schemas`, `app/api`).
  - Configure SQLAlchemy 2.0 Async engine with PostgreSQL connection & SQLite fallback for zero-friction local execution.
  - Create Alembic migrations configuration.
- [ ] **M1-T2:** Database Schema & ORM Models
  - Define `Building`, `Floor`, `Room`, `Wall`, `Door`, `Stair`, `Exit` models.
  - Define `GraphTopology`, `GraphNode`, `GraphEdge` models.
  - Write validation Pydantic v2 schemas.
- [ ] **M1-T3:** Building & Topology API Endpoints
  - Implement CRUD endpoints for Buildings and Floors (`/api/v1/buildings`).
  - Implement Floorplan element batch persistence endpoint.
  - Implement Floorplan JSON export and import endpoints.
- [ ] **M1-T4:** 2D Grid / Floorplan to Graph Conversion Engine
  - Implement topological graph generator (extracting rooms as centroids, doors/stairs as portals, corridors as navigation corridors).
  - Implement edge distance, width, traversal time, and person-flow capacity calculations.
  - Implement multi-floor stair connections bridging 3D coordinates $(x, y, z)$.
- [ ] **M1-T5:** Graph Validation & Diagnostic Engine
  - Connectivity testing: verify all walkable nodes have at least one valid path to an exit.
  - Dead-end, orphan node, and bottleneck capacity detection.
  - Diagnostic error reporting for invalid building geometry.
- [ ] **M1-T6:** Frontend Next.js Project Initialization
  - Initialize Next.js 14+ / React 18 / TypeScript frontend project.
  - Setup Tailwind CSS, Lucide icons, and core layout components with dark command-center aesthetic.
- [ ] **M1-T7:** 2D Floorplan & Building Editor Canvas UI
  - Interactive grid canvas with pan, zoom, grid-snap, and multi-floor switching.
  - Tool palette: Wall, Room, Door, Stair, Exit, Hazard Point, Blocked Zone.
  - Element selection, property editing, delete, and undo/redo history.
- [ ] **M1-T8:** Live Graph Overlay & Visualizer
  - Visualizer overlay displaying generated navigation graph directly on floorplan.
  - Inspector for node capacities, edge lengths, and flow limits.
  - Graph generation trigger with validation feedback toast/dialog.
- [ ] **M1-T9:** Milestone 1 Automated Test Suite
  - Pytest unit tests for graph conversion, capacity calculations, and connectivity validation.
  - Integration tests for Building and Graph API endpoints.
- [ ] **M1-T10:** Milestone 1 Verification & Git Checkpoint
  - Verify complete end-to-end floorplan creation -> graph generation -> API persistence flow.
  - Git commit checkpoint: `checkpoint: milestone-1-building-graph-engine`.

---

## Milestone 2: Hazard Propagation, Occupant Demographics & Routing Core (A, B, C, D)

- [ ] **M2-T1:** Deterministic Dynamic Hazard Engine (Fire, smoke, visibility drop, blocked nodes).
- [ ] **M2-T2:** Untrusted FDS (Fire Dynamics Simulator) Time-Series Data Parser and Sanitizer.
- [ ] **M2-T3:** Heterogeneous Occupant Population Generator & State Machine (Calm → Alert → Evacuating → Safe).
- [ ] **M2-T4:** Routing Algorithm A: Baseline Shortest-Path A*.
- [ ] **M2-T5:** Routing Algorithm B: Hazard-Weighted Safety-Aware A*.
- [ ] **M2-T6:** Routing Algorithm C: Real-Time Exit Load-Aware A*.
- [ ] **M2-T7:** Routing Algorithm D: Dynamic Safety + Multi-Horizon Predictive Queue Rerouting.
- [ ] **M2-T8:** Selective Threshold-Based Path Invalidation & Anti-Oscillation Hysteresis.
- [ ] **M2-T9:** Explainability Engine & Decision Rationale Telemetry Logs.
- [ ] **M2-T10:** Discrete-Event Simulation Coordinator & State Snapshot Serializer.
- [ ] **M2-T11:** Milestone 2 Test Suite (Algorithm correctness, determinism, benchmark tests).
- [ ] **M2-T12:** Milestone 2 Verification & Checkpoint.

---

## Milestone 3: Digital Twin Command Center UI, 2D/3D Viewports & Replay

- [ ] **M3-T1:** Real-Time Telemetry Stream via WebSockets & SSE (Delta compression).
- [ ] **M3-T2:** High-Performance 2D Simulation Canvas (Agents, paths, hazard heatmaps, congestion badges).
- [ ] **M3-T3:** 3D React Three Fiber (R3F) Digital Twin Scene (Multi-floor extrusion, dynamic agent meshes, fire particles).
- [ ] **M3-T4:** Synchronized Dual-Viewport State Controller (Zustand simulation state store).
- [ ] **M3-T5:** Exit Intelligence Cards HUD (Real-time load, capacity, predicted queue, risk rating, ETA).
- [ ] **M3-T6:** Simulation Playback HUD (Play/pause, step-forward, 0.5x–4x speed multiplier, reset).
- [ ] **M3-T7:** Head-to-Head Algorithm Race View (Side-by-side execution of Algorithms A vs B vs C vs D).
- [ ] **M3-T8:** Replay Scrubber & Event Timeline (Hazard ignition, door blockage, major reroute events).
- [ ] **M3-T9:** Interactive Agent & Node Inspector (Detailed decision log and "Why this route?" tooltip).
- [ ] **M3-T10:** Milestone 3 Verification & Checkpoint.

---

## Milestone 4: Research Benchmarks, Automated Experiments & Final QA

- [ ] **M4-T1:** Automated Monte-Carlo Scenario & Batch Experiment Runner.
- [ ] **M4-T2:** Parameter Sweep & Ablation Study Engine ($\alpha, \beta, \gamma, \delta, \epsilon, \zeta$ weights).
- [ ] **M4-T3:** Analytics Dashboard & Statistical Export (TET, P95, mean/median times, CSV/JSON export).
- [ ] **M4-T4:** Security Audit & FDS File Upload Hardening.
- [ ] **M4-T5:** Performance & Scalability Benchmarking (1,000+ agents, 60 FPS frontend, <5ms sim tick).
- [ ] **M4-T6:** End-to-End Automated Browser QA with Playwright.
- [ ] **M4-T7:** Comprehensive Research Documentation & Reproducibility Guide.
- [ ] **M4-T8:** Final System Polish, Walkthrough Video/Artifact, and Final Checkpoint.
