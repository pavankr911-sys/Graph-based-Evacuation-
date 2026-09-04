# Intelligent Emergency Evacuation Digital Twin
### Graph-Based Evacuation Simulation with Predictive Load-Aware Exit Allocation & Dynamic Environmental Hazards

---

## 1. Project Overview & Research Objective

The **Intelligent Emergency Evacuation Digital Twin** is a high-fidelity, research-grade evacuation modeling, routing, and simulation platform. It is engineered to evaluate, benchmark, and visualize evacuation dynamics under rapidly shifting spatial and environmental hazards (e.g., propagating fire, toxic smoke, structural obstructions).

### Core Research Question
> **Can dynamic safety-aware and predictive load-aware routing algorithms significantly reduce Total Evacuation Time (TET), exit queue congestion, and cumulative hazardous exposure compared to conventional static shortest-path routing (e.g., standard A*) during building emergencies?**

### Research Integrity Principles
- **Empirical Rigor:** All reduction percentages, evacuation time improvements, and congestion mitigation claims are treated strictly as **hypotheses** to be tested and measured.
- **No Fabricated Benchmarks:** Baseline metrics, FDS (Fire Dynamics Simulator) datasets, agent counts, and path choices are deterministically simulated and verified with reproducible seeds.

---

## 2. High-Level System Architecture

The platform is designed as a high-performance **Modular Monolith**:
- **Backend & Simulation Core:** Python 3.11+ / FastAPI, SQLAlchemy, PostgreSQL, Alembic, custom discrete-event simulation engine, spatial graph builders, deterministic hazard propagation, and 4 distinct routing algorithms.
- **Frontend & Digital Twin Visualizer:** Next.js (Strict TypeScript), React, Tailwind CSS, Lucide, React Three Fiber (Three.js 3D), 2D HTML5 Canvas, Zustand state stores, and Recharts analytics.
- **Real-Time Telemetry:** WebSockets and SSE for low-latency streaming of simulation frames, occupant states, queue depths, and hazard heatmaps.

---

## 3. Four Core Routing Strategies

1. **Algorithm A (Baseline - Static Shortest Path):** Standard A* minimizing pure geometric distance $\sum d(u, v)$ to the nearest static exit.
2. **Algorithm B (Safety-Aware A*):** Hazard-weighted cost function $f(n) = g(n) + h(n) + L(n)$, where $L(n)$ penalizes fire intensity, smoke density, and temperature.
3. **Algorithm C (Real-Time Load-Aware A*):** Dynamically penalizes edges and exits based on instantaneous queue lengths $Q_{\text{exit}}(t)$ and door discharge rates.
4. **Algorithm D (Proposed System - Dynamic Safety + Predictive Load-Aware Rerouting):**
   $$\text{Cost}(e) = \alpha \cdot \text{Distance} + \beta \cdot \text{TraversalTime} + \gamma \cdot \text{HazardRisk} + \delta \cdot \text{CurrentCongestion} + \epsilon \cdot \text{PredictedExitLoad}(t + \tau) + \zeta \cdot \text{CumulativeExposure}$$
   Coupled with selective threshold-based path invalidation and human-interpretable explainability logs.

---

## 4. Key Capabilities

- 🏢 **Multi-Floor Building & Graph Editor:** Interactive 2D grid/polygon editor with snap-to-grid, pan/zoom, room/door/stair/exit tagging, and 1-click conversion to topological navigation graphs.
- 🔥 **Dynamic Hazard Engine:** Deterministic cellular/grid fire and smoke propagation models + import parser for time-series FDS output datasets.
- 👥 **Heterogeneous Occupant Demographics:** Multi-class agents (Adult, Child, Elderly, Mobility-Impaired, Emergency Staff) with individualized speeds, reaction delays, risk tolerances, and behavioral state transitions.
- 📊 **Synchronized 2D & 3D Command-Center UI:** Real-time dual viewport, Exit Intelligence monitoring cards, dynamic heatmaps, time-scrubber replay, and head-to-head algorithm race analytics.
- 🔬 **Automated Research & Ablation Engine:** Automated Monte-Carlo scenario execution, parameter sweeps ($\alpha, \beta, \gamma, \delta, \epsilon, \zeta$), and statistical validation (TET, P95, mean/median times, bottleneck ratios).

---

## 5. Repository Documentation Guide

- [`PROJECT_STATUS.md`](./PROJECT_STATUS.md) — Persistent project memory, active milestone status, and immediate next action.
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — Exhaustive system architecture, domain models, ERD, and API contracts.
- [`CHANGELOG.md`](./CHANGELOG.md) — Chronological history of milestones, checkpoints, and verified changes.
- [`TODO.md`](./TODO.md) — Comprehensive implementation task breakdown across all 4 milestones.
- [`ASSUMPTIONS.md`](./ASSUMPTIONS.md) — Simulation assumptions, behavioral parameters, and mathematical constraints.
- [`RISKS.md`](./RISKS.md) — Technical, algorithmic, and architectural risk registry with mitigation strategies.
- [`ACCEPTANCE_CRITERIA.md`](./ACCEPTANCE_CRITERIA.md) — Formal verification checklists and acceptance gates for all milestones.

---

## 6. Getting Started

### Backend Setup (Python 3.11+)
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup (Node.js 18+)
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to access the digital twin command center.
