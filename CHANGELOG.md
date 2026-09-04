# Changelog

All notable changes to the **Intelligent Emergency Evacuation Digital Twin** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to Semantic Versioning.

---

## [Unreleased]

### Milestone 1 - M1-T2A: Building & Floor Domain Models - 2026-08-18
#### Added
- SQLAlchemy 2.0 ORM models for `Building` and `Floor` in `backend/app/models/building.py`.
- Bidirectional parent-child relationship with cascade delete rules and floor number ordering.
- Unique constraint `uq_building_floor_number` on `(building_id, floor_number)`.
- Pydantic v2 schemas in `backend/app/schemas/building.py` (`BuildingCreate`, `BuildingUpdate`, `BuildingRead`, `BuildingDetailRead`, `FloorCreate`, `FloorUpdate`, `FloorRead`).
- Unit and integration tests in `backend/tests/test_building_models.py` (12/12 passing total across the test suite).

### Milestone 1 - M1-T1B: Database Configuration + SQLAlchemy Async Engine - 2026-08-17
#### Added
- Async database configuration module (`backend/app/core/database.py`) with `create_async_engine`, `AsyncSessionLocal`, and `get_db` FastAPI dependency.
- Declarative Base architecture (`backend/app/models/base.py`) with `UUIDPrimaryKeyMixin` and `TimestampMixin`.
- Dynamic SQLite local fallback + PostgreSQL support with automatic dialect and async URL resolution in `backend/app/core/config.py`.
- Alembic database migration environment (`backend/alembic.ini`, `backend/alembic/env.py`, `backend/alembic/script.py.mako`, `backend/alembic/versions/`).
- Dynamic database health check in `/api/v1/health` verifying engine connectivity.
- Unit and integration tests in `backend/tests/test_database.py`.

### Milestone 1 - M1-T1A: Backend Environment + FastAPI Skeleton - 2026-08-17
#### Added
- Python backend package hierarchy (`backend/app`, `backend/app/core`, `backend/app/api/v1/endpoints`, `backend/tests`).
- Pydantic Settings configuration (`backend/app/core/config.py`) with environment-based overrides and CORS origin parsing.
- FastAPI main entrypoint (`backend/app/main.py`) with OpenAPI documentation routes (`/api/v1/docs`, `/api/v1/openapi.json`).
- Root endpoint `/` and health check endpoints (`/health`, `/api/v1/health`).
- Dependency specification in `backend/requirements.txt`.
- `.gitignore` for Python, Node, database, and IDE artifacts.
- Pytest test suite with TestClient fixtures in `backend/tests/test_health.py`.

### Initial Planning & Step 0 - 2026-08-17
#### Added
- Inspected workspace directory and verified clean environment.
- Formulated overall system architecture and domain models in [`ARCHITECTURE.md`](./ARCHITECTURE.md).
- Authored initial persistent tracking files:
  - [`PROJECT_STATUS.md`](./PROJECT_STATUS.md)
  - [`TODO.md`](./TODO.md)
  - [`ASSUMPTIONS.md`](./ASSUMPTIONS.md)
  - [`RISKS.md`](./RISKS.md)
  - [`ACCEPTANCE_CRITERIA.md`](./ACCEPTANCE_CRITERIA.md)
  - [`README.md`](./README.md)
- Defined mathematical formulations for Routing Algorithms A, B, C, and D.
- Formulated 10-step breakdown for Milestone 1 with strict verification criteria.

### Milestone 3 - 2D Visualizer MVP - 2026-08-21
#### Added
- React `SimulationPlayback` component with timeline scrubber and Play/Pause logic.
- Hooked `EditorCanvas` SVG drawing routine to read `simulationRun` frames and paint colored circles corresponding to agent demographic profiles.
- Integrated `startSimulation` API call to the `Run Simulation` button with polling mechanism until completion.

### Milestone 2 - Simulation Core & Pathfinding - 2026-08-21
#### Added
- `EvacuationSimulation` loop and backend logic.
- `Demographics` generator dynamically assigning traits (Adult, Child, Elderly, Disabled) and speeds to agents.
- A* / Dijkstra Multi-Source Flow Field algorithm running backwards from `EXIT` nodes to all parts of the topology.
- E2E testing of the simulation pipeline verifying valid sequence of frames and successful exit traversal.

### Milestone 4 - 3D Visualizer Completed - 2026-08-21
#### Added
- Full 3D rendering pipeline via `@react-three/fiber` and `@react-three/drei`.
- Extruded 3D rooms (`PlaneGeometry`), 3D walls (`BoxGeometry`), doors/exits (transparent bounding boxes).
- Multi-floor separation by 3-meter vertical height tracking.
- Dynamic 3D Agent models (`CylinderGeometry`) with heights adjusted for demographics and colors linked to profiles.
- Integrated seamless 2D/3D toggle button in the Editor Toolbar, allowing users to pause 2D simulation, flip to 3D, and continue playback.
