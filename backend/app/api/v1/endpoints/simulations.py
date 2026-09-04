import uuid
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.simulation import SimulationRun
from app.models.building import Building
from app.schemas.simulation import SimulationConfigCreate, SimulationRunRead
from app.services import topology as topology_service
from app.engine.simulation.core import EvacuationSimulation

router = APIRouter()

async def run_simulation_task(sim_id: uuid.UUID, db: AsyncSession, config: SimulationConfigCreate):
    # Fetch simulation record
    sim_record = await db.get(SimulationRun, sim_id)
    if not sim_record:
        return
    
    try:
        # Fetch the building's active graph topology
        topologies = await topology_service.get_by_building(db, building_id=sim_record.building_id)
        if not topologies:
            raise Exception("No graph topology found for building.")
            
        topology = topologies[-1] # use latest
        topology_with_elements = await topology_service.get_with_elements(db, id=topology.id)
        
        # Instantiate and run
        sim = EvacuationSimulation(topology=topology_with_elements, config=config)
        results = await sim.run()
        
        # Update record
        sim_record.status = "COMPLETED"
        sim_record.results = {"frames": results}
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
    
    # Start background task
    background_tasks.add_task(run_simulation_task, sim_record.id, db, config)
    
    return sim_record

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
