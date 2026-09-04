# Acceptance Criteria & Verification Gates

**Project:** Intelligent Emergency Evacuation Digital Twin  
**Version:** 1.0.0  

---

## Milestone 1 Verification Gates: Foundation, Building Editor & Topological Graph Engine

1. **Database & API Integrity:**
   - [ ] Backend starts cleanly with SQLite fallback or PostgreSQL with zero unhandled exceptions.
   - [ ] All Building, Floor, Element, and Graph endpoints pass Pytest unit and integration tests.
   - [ ] JSON export of a building can be imported back with 100% geometric and attribute fidelity.

2. **Graph Conversion Engine:**
   - [ ] Floorplan geometry (rooms, corridors, doors, stairs, exits) converts automatically into a dual-graph representation (topological + spatial grid).
   - [ ] Node capacities correctly compute based on room area ($\text{Area} / 1.5\text{ m}^2$).
   - [ ] Edge capacities and maximum flow rates correctly compute based on doorway and corridor widths using standard SFPE factors ($1.33 \text{ persons/m}\cdot\text{s}$).
   - [ ] Multi-floor stair portals successfully link Floor $N$ $(x, y, z)$ to Floor $N-1 / N+1$ with correct vertical traversal cost penalties.

3. **Graph Validation & Diagnostics:**
   - [ ] Validation engine detects disconnected rooms, unlinked doors, and inaccessible exits, returning descriptive error payloads.
   - [ ] Valid floorplans are certified with 100% exit reachability from all walkable nodes.

4. **Frontend Editor Experience:**
   - [ ] 2D Grid Canvas allows smooth pan, zoom ($0.2\times$ to $5.0\times$), and customizable grid snapping ($0.5\text{m}, 1.0\text{m}$).
   - [ ] Users can place, resize, move, tag, and delete rooms, walls, doors, stairs, exits, and hazard points.
   - [ ] Undo/Redo stack supports at least 50 historical actions.
   - [ ] Live Graph Overlay renders topological nodes and edges directly over the architectural floorplan with capacity/weight tooltips.

---

## Milestone 2 Verification Gates: Simulation & Routing Core

1. **Hazard Propagation Engine:**
   - [ ] Deterministic fire and smoke expansion matches cellular cellular automata rules across consecutive runs with identical seed.
   - [ ] Uploaded FDS time-series files are validated, parsed, and mapped accurately to spatial nodes.
   - [ ] Impassable hazard thresholds ($H(w) \ge 0.85$) dynamically invalidate graph edges and trigger node blocking.

2. **Occupant Agent Engine:**
   - [ ] Multi-demographic generator correctly instantiates Adult, Child, Elderly, Mobility-Impaired, and Staff agents with distinct speed and reaction distributions.
   - [ ] Agent state transitions follow the deterministic state machine ($\text{Calm} \rightarrow \text{Alert} \rightarrow \text{Evacuating} \rightarrow \text{Safe} / \text{Incapacitated}$).

3. **Routing Algorithms (A, B, C, D):**
   - [ ] **Algorithm A:** Standard A* reliably computes shortest Euclidean path to nearest exit.
   - [ ] **Algorithm B:** Safety-Aware A* routes agents around hazardous/smoke-filled nodes even if the detour is longer.
   - [ ] **Algorithm C:** Real-Time Load-Aware A* diverts agents away from currently jammed exit queues.
   - [ ] **Algorithm D:** Predictive Load-Aware A* successfully projects arrival-time queues and allocates agents across multiple exits to balance loads without oscillatory flapping.

4. **Selective Rerouting & Explainability:**
   - [ ] Rerouting triggers selectively on hazard encroachment or queue spikes, adhering to cooldown hysteresis ($t_{\text{cooldown}} = 4.0\text{s}$).
   - [ ] Every routing decision and reroute event generates a structured human-readable explanation (e.g., *"Rerouted from Exit 1 to Exit 2: Exit 1 predicted queue delay exceeds Exit 2 by 42 seconds; route hazard score is 0.05 vs 0.40"*).

---

## Milestone 3 Verification Gates: Command Center UI, 2D/3D Twin & Analytics

1. **Dual-Viewport Synchronization:**
   - [ ] 2D HTML5 Canvas and 3D React Three Fiber (R3F) scenes render identical agent positions and states at 60 FPS.
   - [ ] Floor switcher allows viewing individual floors or exploded 3D multi-floor views.

2. **Exit Intelligence & HUD:**
   - [ ] Exit Intelligence cards display real-time load, rated capacity, predicted queue, risk rating, and status badges (Safe / Warning / Critical / Blocked).
   - [ ] Simulation Playback HUD allows seamless play, pause, single-step, speed switching ($0.5\times, 1\times, 2\times, 4\times$), and time scrubbing.

3. **Race & Analytics:**
   - [ ] Side-by-side algorithm race executes identical scenario across Algorithms A, B, C, and D.
   - [ ] Evacuation curve charts (Agents Safe vs Time) and cumulative hazard exposure charts render accurately.

---

## Milestone 4 Verification Gates: Research Benchmarks, QA & Hardening

1. **Automated Experimentation:**
   - [ ] Batch runner executes Monte-Carlo simulations across multiple random seeds and parameter permutations.
   - [ ] Statistical distributions (Mean, Median, P95, Standard Deviation of TET, Bottleneck Index) export to CSV and JSON formats.

2. **Performance & Reliability:**
   - [ ] Backend sustains 1,000 active agents with tick execution time under $15\text{ms}$.
   - [ ] WebSocket telemetry delta frames remain under $20\text{ KB}$ per tick.
   - [ ] Zero unhandled frontend exceptions or memory leaks during prolonged 10-minute simulation runs.
