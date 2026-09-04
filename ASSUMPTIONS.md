# Simulation Assumptions & Modeling Registry

**Project:** Intelligent Emergency Evacuation Digital Twin  
**Version:** 1.0.0  

---

## 1. Spatial & Graph Topology Assumptions

1. **Coordinate System & Units:**
   - Spatial coordinates $(x, y)$ are measured in continuous metric units (meters).
   - Multi-floor elevation $(z)$ is indexed by integer floor levels ($0, 1, 2, \dots$) with a default inter-floor height of $3.5\text{ m}$.
   - Grid editor uses a default grid resolution of $0.5\text{ m} \times 0.5\text{ m}$ per cell for precise alignment.

2. **Graph Representation:**
   - Navigation graph $G = (V, E)$ consists of discrete topological nodes $V$ (room centers, corridor waypoints, doorways, stair portals, and final building exits) connected by weighted edges $E$.
   - **Edge Width & Capacity:** Edge width $W_e$ corresponds to physical corridor or doorway width in meters. Base flow capacity $C_{\text{flow}}$ follows standard SFPE Handbook guidelines:
     $$C_{\text{flow}} = 1.33 \text{ persons} / (\text{meter} \cdot \text{second})$$
   - **Staircase Dynamics:** Vertical movement through staircases applies a speed reduction factor $\kappa_{\text{stair}} = 0.6$ to horizontal movement speed to account for stair descent.

---

## 2. Heterogeneous Occupant Assumptions

1. **Demographic Distribution & Physical Attributes:**
   - Populations are modeled with 5 distinct demographic archetypes:
     | Demographic Class | Default Population % | Base Speed (m/s) | Reaction Time Delay (s) | Risk Sensitivity | Physical Radius (m) |
     |---|---|---|---|---|---|
     | **Standard Adult** | 60% | $1.20 \pm 0.15$ | $5 \pm 2$ | Medium ($1.0$) | $0.25$ |
     | **Elderly** | 15% | $0.80 \pm 0.10$ | $12 \pm 4$ | High ($1.8$) | $0.25$ |
     | **Child** | 10% | $0.95 \pm 0.12$ | $8 \pm 3$ | Variable ($0.8$) | $0.20$ |
     | **Mobility-Impaired** | 5% | $0.50 \pm 0.08$ | $15 \pm 5$ | Very High ($2.5$) | $0.40$ (Wheelchair/Cane) |
     | **Emergency Staff** | 10% | $1.60 \pm 0.20$ | $1 \pm 0.5$ | Low / Directing ($0.4$) | $0.25$ |

2. **Behavioral State Transitions:**
   - Agents follow a 4-state deterministic finite state machine:
     $$\text{Calm} \xrightarrow{\text{alarm/perception}} \text{Alert} \xrightarrow{\text{reaction delay}} \text{Evacuating} \xrightarrow{\text{crosses exit}} \text{Safe}$$
   - If an agent sustains cumulative toxic exposure exceeding lethal dosage ($E_{\text{accum}} \ge 1.0$), their state transitions to **Incapacitated**.

---

## 3. Dynamic Hazard Propagation Assumptions

1. **Fire & Smoke Cellular Model:**
   - Fire propagates outward from ignition nodes based on fuel load, combustible wall adjacency, and oxygen availability.
   - Smoke diffuses ahead of fire front at an isotropic velocity $v_{\text{smoke}} \approx 0.5\text{ m/s}$ horizontally and rises rapidly through stairwells.
   - Toxicity index $H(w, t) \in [0.0, 1.0]$ is computed as a weighted combination of carbon monoxide / toxic gas density, optical smoke density ($OD / \text{m}$), and temperature ($T^\circ\text{C}$).
   - Nodes with $H(w, t) \ge 0.85$ are flagged as completely impassable to routing algorithms.

2. **External FDS Integration:**
   - When external FDS (Fire Dynamics Simulator) simulation outputs (CSV/JSON slices) are uploaded, they override synthetic cellular propagation.
   - FDS data is sanitized and interpolated onto the topological graph nodes over matching timestamps $t$.

---

## 4. Exit Queuing & Predictive Load Assumptions

1. **Doorway Discharge Model:**
   - Exit portals discharge agents at a maximum rate of:
     $$R_{\text{exit}} = 1.33 \times W_{\text{exit}} \text{ persons/second}$$
   - When arrival rate exceeds $R_{\text{exit}}$, a FIFO queue develops with spatial density capped at $4 \text{ persons/m}^2$.

2. **Predictive Time Horizons:**
   - Multi-horizon queue prediction projects exit congestion at discrete future intervals $\tau \in \{10\text{s}, 20\text{s}, 30\text{s}, 60\text{s}\}$.
   - Projections assume other agents maintain their current velocities unless rerouted by subsequent hazard invalidations.

---

## 5. Algorithmic Parameter Defaults (Algorithm D)

- **Distance Weight ($\alpha$):** $0.15$
- **Traversal Time Weight ($\beta$):** $0.35$
- **Hazard Risk Weight ($\gamma$):** $0.30$
- **Current Congestion Weight ($\delta$):** $0.10$
- **Predicted Congestion Weight ($\epsilon$):** $0.25$
- **Cumulative Exposure Weight ($\zeta$):** $0.20$
- **Reroute Invalidation Hysteresis ($t_{\text{cooldown}}$):** $4.0\text{ seconds}$
- **Congestion Spike Invalidation Threshold ($\Delta Q / Q$):** $+35\%$
