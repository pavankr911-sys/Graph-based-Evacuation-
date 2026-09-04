# Risk Registry & Mitigation Strategies

**Project:** Intelligent Emergency Evacuation Digital Twin  
**Version:** 1.0.0  

---

## 1. Technical & Algorithmic Risks

| Risk ID | Description | Severity | Likelihood | Impact | Mitigation Strategy |
|---|---|---|---|---|---|
| **RSK-01** | **Path Oscillation & Flapping:** Agents rapidly switch between two competing exits as queues fluctuate by 1 person. | HIGH | HIGH | Unrealistic zig-zag movement, increased evacuation delay. | Implement temporal hysteresis timer ($t_{\text{cooldown}} = 4.0\text{s}$) and a hysteresis threshold margin ($+15\%$ cost reduction required to trigger reroute). |
| **RSK-02** | **A* Computation Bottleneck:** Full graph replanning for 1,000 agents every tick leads to CPU exhaustion ($O(N \cdot |V| \log |V|)$). | HIGH | HIGH | Simulation lag, dropped WebSocket frames. | Use **Selective Dynamic Rerouting**: only re-evaluate paths for agents whose immediate path intersects a hazard change or whose target exit queue spikes beyond $\Delta Q_{\text{threshold}}$. |
| **RSK-03** | **Exit Starvation & Herding:** Naive load-aware routing dumps all agents to a distant empty exit, quickly overloading it. | HIGH | MEDIUM | Severe secondary congestion. | Use **Predictive Arrival Queue Estimator** ($\hat{Q}_{\text{exit}}(t_{\text{target}})$) which accounts for agents already en route to that exit. |
| **RSK-04** | **Unreachable Nodes / Dead-End Traps:** Fire cuts off an entire wing, leaving agents trapped without any path to exit. | MEDIUM | HIGH | Infinite search loop or simulation crash. | Implement fail-safe state: if $A^*$ returns $\emptyset$, agent transitions to `Trapped/Shelter-In-Place` mode, seeking nearest low-hazard refuge node. |
| **RSK-05** | **Agent Interpenetration / Overlapping:** In 2D/3D visualizations, 50 agents stack on a single 1-meter node. | MEDIUM | MEDIUM | Visually unrealistic, invalid spatial density. | Implement discrete node occupancy capacities with velocity damping as node approaches maximum density ($4 \text{ agents/m}^2$). |

---

## 2. Architecture & Performance Risks

| Risk ID | Description | Severity | Likelihood | Impact | Mitigation Strategy |
|---|---|---|---|---|---|
| **RSK-06** | **WebSocket Telemetry Flooding:** Sending full graph + 1,000 agent state dictionaries at 60 Hz overwhelms network and frontend JSON parser. | HIGH | HIGH | Browser freezing, memory leak, high latency. | Run simulation ticks at 10–20 Hz; send **Delta Compressed Frames** (only transmitting modified node hazards and moving agent coordinate deltas); frontend interpolates smoothly at 60 FPS. |
| **RSK-07** | **3D Rendering Performance (Three.js):** 1,000 individual 3D mesh instances and multi-floor buildings dropping frame rates below 20 FPS. | MEDIUM | MEDIUM | Poor user experience. | Use `THREE.InstancedMesh` for agents, low-poly geometry for walls/doors, and frustum/floor culling to render only the active floor in focused views. |
| **RSK-08** | **Database Lock Contention During Live Simulation:** Writing continuous frame logs directly to SQL in real-time degrades database I/O. | HIGH | MEDIUM | Backend blocking. | Keep active simulation state purely in-memory; buffer trajectories and persist only aggregate summaries and periodic sampled checkpoints asynchronously upon completion. |

---

## 3. Security & Data Integrity Risks

| Risk ID | Description | Severity | Likelihood | Impact | Mitigation Strategy |
|---|---|---|---|---|---|
| **RSK-09** | **Untrusted FDS File Uploads:** Malformed, oversized, or malicious CSV/JSON hazard data uploaded by users. | HIGH | MEDIUM | Buffer overflow, memory exhaustion, injection. | Implement strict schema validation (Pydantic), strict file size limits (max 50 MB), file extension whitelist, and sandboxed parser with bounds checking. |
| **RSK-10** | **Geometric Exploits / Infinite Polygons:** User drawing self-intersecting or infinite walls causing infinite loops in graph generator. | MEDIUM | MEDIUM | Backend hang in spatial indexer. | Implement geometric validation (Shapely/custom polygon sanitizer) that clamps coordinates to floor boundaries and strips invalid self-intersecting lines. |
