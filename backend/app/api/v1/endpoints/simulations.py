import uuid
from typing import Any, Optional, Dict, List
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db, AsyncSessionLocal
from app.models.simulation import SimulationRun
from app.models.building import Building
from app.schemas.simulation import (
    SimulationConfigCreate,
    SimulationRunRead,
    ComparisonConfigCreate,
    ComparisonResultRead
)
from app.services import topology as topology_service
from app.engine.simulation.core import EvacuationSimulation

router = APIRouter()

ALGORITHM_NAMES = {
    "ALGO_A": "Algorithm A (Shortest Path)",
    "ALGO_B": "Algorithm B (Safety / Hazard-Aware)",
    "ALGO_C": "Algorithm C (Load / Queue-Aware)",
    "ALGO_D": "Algorithm D (Predictive Multi-Factor)"
}

LATEST_COMPARISON: Any = None

async def ensure_building_topology(db: AsyncSession, building_id: uuid.UUID):
    """Returns active graph topology or automatically generates it if missing."""
    topologies = await topology_service.get_by_building(db, building_id=building_id)
    if topologies:
        return await topology_service.get_with_elements(db, id=topologies[-1].id)
    
    from app.services import building
    from app.services import (
        room as room_service, wall as wall_service, door as door_service,
        stair as stair_service, exit as exit_service
    )
    from app.schemas.export import BuildingExport, FloorExport
    from app.engine.graph.preprocessor import preprocess_building
    from app.engine.graph.rasterizer import rasterize_building
    from app.engine.graph.generator import GraphGenerator, persist_graph

    b = await building.get_with_floors(db, id=building_id)
    if not b:
        raise HTTPException(status_code=404, detail="Building not found")
        
    export_data = BuildingExport.model_validate(b)
    export_data.floors = []
    for f in b.floors:
        fd = FloorExport.model_validate(f)
        fd.rooms = await room_service.get_by_floor(db, floor_id=f.id)
        fd.walls = await wall_service.get_by_floor(db, floor_id=f.id)
        fd.doors = await door_service.get_by_floor(db, floor_id=f.id)
        fd.stairs = await stair_service.get_by_floor(db, floor_id=f.id)
        fd.exits = await exit_service.get_by_floor(db, floor_id=f.id)
        export_data.floors.append(fd)
        
    preprocessed = preprocess_building(export_data)
    raster = rasterize_building(preprocessed)
    generator = GraphGenerator(preprocessed, raster)
    topo_create, nodes_map, edges_map = generator.generate()
    topo = await persist_graph(db, topo_create, nodes_map, edges_map)
    return await topology_service.get_with_elements(db, id=topo.id)

async def run_simulation_task(sim_id: uuid.UUID, config: SimulationConfigCreate):
    async with AsyncSessionLocal() as db:
        # Fetch simulation record
        sim_record = await db.get(SimulationRun, sim_id)
        if not sim_record:
            return
        
        try:
            # Fetch or auto-generate the building's active graph topology
            topology_with_elements = await ensure_building_topology(db, sim_record.building_id)
            
            # Instantiate and run
            sim = EvacuationSimulation(topology=topology_with_elements, config=config)
            results = await sim.run()
            
            # Update record
            sim_record.status = "COMPLETED"
            sim_record.results = results
            db.add(sim_record)
            await db.commit()
        except Exception as e:
            sim_record.status = "FAILED"
            sim_record.error_message = str(e)
            db.add(sim_record)
            await db.commit()

@router.post("/{building_id}/simulations", response_model=SimulationRunRead)
async def create_simulation(
    building_id: uuid.UUID,
    config: SimulationConfigCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    Start a new evacuation simulation for a building.
    """
    building = await db.get(Building, building_id)
    if not building:
        raise HTTPException(status_code=404, detail="Building not found")
        
    # Create PENDING record
    sim_record = SimulationRun(
        building_id=building_id,
        config=config.model_dump(),
        status="PENDING"
    )
    db.add(sim_record)
    await db.commit()
    await db.refresh(sim_record)
    
    # Start background task with independent DB session
    background_tasks.add_task(run_simulation_task, sim_record.id, config)
    
    return sim_record

@router.get("/simulations", response_model=list[SimulationRunRead])
async def list_simulations(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100
) -> Any:
    """
    List all simulation runs.
    """
    from sqlalchemy import select
    query = select(SimulationRun).order_by(SimulationRun.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/{building_id}/simulations/compare", response_model=ComparisonResultRead)
async def compare_simulations(
    building_id: uuid.UUID,
    config: ComparisonConfigCreate,
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    Run a fair head-to-head race comparing algorithms on identical occupant starting positions.
    """
    global LATEST_COMPARISON
    building = await db.get(Building, building_id)
    if not building:
        raise HTTPException(status_code=404, detail="Building not found")

    topology_with_elements = await ensure_building_topology(db, building_id)
    
    # Generate identical initial agent pool for completely fair scientific benchmark
    shared_agents = EvacuationSimulation.generate_shared_agents(topology_with_elements, config.occupant_count)
    
    metrics_result = {}
    
    for algo_code in config.algorithms:
        algo_config = SimulationConfigCreate(
            occupant_count=config.occupant_count,
            tick_rate_hz=config.tick_rate_hz,
            max_time_sec=config.max_time_sec,
            hazard_ignition_nodes=config.hazard_ignition_nodes,
            hazard_spread_rate=config.hazard_spread_rate,
            routing_algorithm=algo_code
        )
        
        sim = EvacuationSimulation(
            topology=topology_with_elements,
            config=algo_config,
            initial_agents=shared_agents
        )
        run_res = await sim.run()
        
        # Save individual SimulationRun record so each run can be viewed/replayed
        sim_record = SimulationRun(
            building_id=building_id,
            config=algo_config.model_dump(),
            status="COMPLETED",
            results=run_res
        )
        db.add(sim_record)
        await db.commit()
        await db.refresh(sim_record)
        
        m = run_res.get("metrics", {})
        metrics_result[algo_code] = {
            "algorithm": algo_code,
            "algorithm_name": ALGORITHM_NAMES.get(algo_code, algo_code),
            "simulation_id": str(sim_record.id),
            "total_evacuation_time": m.get("total_evacuation_time", 0.0),
            "evacuated_count": m.get("evacuated_count", 0),
            "trapped_count": m.get("trapped_count", 0),
            "casualties": m.get("casualties", 0),
            "avg_evacuation_time": m.get("avg_evacuation_time", 0.0),
            "evacuation_curve": m.get("evacuation_curve", [])
        }
    
    # Determine winner: Prioritize lowest casualties, then highest evacuated, then fastest time
    winner = min(
        config.algorithms,
        key=lambda code: (
            metrics_result[code]["casualties"],
            -metrics_result[code]["evacuated_count"],
            metrics_result[code]["total_evacuation_time"]
        )
    )
    
    winner_name = ALGORITHM_NAMES.get(winner, winner)
    winner_m = metrics_result[winner]
    algo_a_m = metrics_result.get("ALGO_A")
    
    if algo_a_m and winner != "ALGO_A":
        time_diff = algo_a_m["total_evacuation_time"] - winner_m["total_evacuation_time"]
        time_pct = (
            round((time_diff / algo_a_m["total_evacuation_time"]) * 100, 1)
            if algo_a_m["total_evacuation_time"] > 0 else 0
        )
        saved_lives = algo_a_m["casualties"] - winner_m["casualties"]
        summary = (
            f"{winner_name} outperformed Baseline A by evacuating {winner_m['evacuated_count']} occupants "
            f"in {winner_m['total_evacuation_time']}s ({time_pct}% faster)"
        )
        if saved_lives > 0:
            summary += f" while preventing {saved_lives} casualties in active fire zones."
        else:
            summary += " with 0 casualties."
    else:
        summary = f"{winner_name} achieved total evacuation in {winner_m['total_evacuation_time']}s with {winner_m['casualties']} casualties."

    comparison_payload = {
        "building_id": str(building_id),
        "occupant_count": config.occupant_count,
        "metrics": metrics_result,
        "winner": winner,
        "summary": summary
    }
    LATEST_COMPARISON = comparison_payload
    return comparison_payload

@router.get("/simulations/latest-comparison", response_model=Optional[ComparisonResultRead])
async def get_latest_comparison():
    """Retrieve the most recent head-to-head algorithm comparison."""
    return LATEST_COMPARISON

@router.get("/simulations/{id}", response_model=SimulationRunRead)
async def get_simulation(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    Get simulation status and results.
    """
    sim = await db.get(SimulationRun, id)
    if not sim:
        raise HTTPException(status_code=404, detail="Simulation not found")
    return sim
