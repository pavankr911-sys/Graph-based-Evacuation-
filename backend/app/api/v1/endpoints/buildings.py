from typing import Any, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.building import BuildingRead, BuildingCreate, BuildingUpdate, BuildingDetailRead
from app.schemas.export import BuildingExport, FloorExport
from app.services import building
from app.services import (
    floor as floor_service,
    room as room_service,
    wall as wall_service,
    door as door_service,
    stair as stair_service,
    exit as exit_service,
    topology as topology_service,
)
from app.services.importer import import_building
from app.engine.cad.digitizer import digitize_blueprint

router = APIRouter()


@router.post("/digitize-blueprint")
async def digitize_blueprint_endpoint(
    file: UploadFile = File(...),
    width_meters: float = Form(50.0),
    height_meters: float = Form(30.0),
    floor_id: Optional[str] = Form(None),
) -> Any:
    """
    Digitize an uploaded 2D CAD floorplan/sketch into vector walls and rooms using OpenCV.
    """
    try:
        content = await file.read()
        result = digitize_blueprint(
            image_bytes=content,
            width_meters=width_meters,
            height_meters=height_meters,
            floor_id=floor_id
        )
        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=f"Failed to digitize blueprint: {str(e)}")


@router.post("/", response_model=BuildingRead, status_code=status.HTTP_201_CREATED)
async def create_building(
    *,
    db: AsyncSession = Depends(get_db),
    building_in: BuildingCreate,
) -> Any:
    """
    Create new building.
    """
    new_building = await building.create(db, obj_in=building_in)
    return new_building


@router.get("/", response_model=List[BuildingRead])
async def read_buildings(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve buildings.
    """
    buildings = await building.get_multi(db, skip=skip, limit=limit)
    return buildings


@router.get("/{building_id}", response_model=BuildingDetailRead)
async def read_building(
    *,
    db: AsyncSession = Depends(get_db),
    building_id: UUID,
) -> Any:
    """
    Get building by ID.
    """
    b = await building.get_with_floors(db, id=building_id)
    if not b:
        raise HTTPException(status_code=404, detail="Building not found")
    return b


@router.get("/{building_id}/export", response_model=BuildingExport)
async def export_building(
    *,
    db: AsyncSession = Depends(get_db),
    building_id: UUID,
) -> Any:
    """
    Export the complete building configuration including floors, spatial elements, and graph topologies.
    """
    b = await building.get_with_floors(db, id=building_id)
    if not b:
        raise HTTPException(status_code=404, detail="Building not found")
        
    export_data = BuildingExport.model_validate(b)
    
    # Fetch topologies
    topologies = await topology_service.get_by_building(db, building_id=building_id)
    export_data.topologies = topologies
    
    export_data.floors = []
    
    # Fetch elements per floor
    for f in b.floors:
        floor_data = FloorExport.model_validate(f)
        
        floor_data.rooms = await room_service.get_by_floor(db, floor_id=f.id)
        floor_data.walls = await wall_service.get_by_floor(db, floor_id=f.id)
        floor_data.doors = await door_service.get_by_floor(db, floor_id=f.id)
        floor_data.stairs = await stair_service.get_by_floor(db, floor_id=f.id)
        floor_data.exits = await exit_service.get_by_floor(db, floor_id=f.id)
        
        export_data.floors.append(floor_data)
        
    return export_data


@router.post("/import", response_model=BuildingRead, status_code=status.HTTP_201_CREATED)
async def import_building_endpoint(
    *,
    db: AsyncSession = Depends(get_db),
    export_data: BuildingExport,
) -> Any:
    """
    Import a complete building configuration including floors, spatial elements, and graph topologies.
    """
    return await import_building(db, export_data)


@router.put("/{building_id}", response_model=BuildingRead)
async def update_building(
    *,
    db: AsyncSession = Depends(get_db),
    building_id: UUID,
    building_in: BuildingUpdate,
) -> Any:
    """
    Update a building.
    """
    b = await building.get(db, id=building_id)
    if not b:
        raise HTTPException(status_code=404, detail="Building not found")
    b = await building.update(db, db_obj=b, obj_in=building_in)
    return b


@router.delete("/{building_id}", response_model=BuildingRead)
async def delete_building(
    *,
    db: AsyncSession = Depends(get_db),
    building_id: UUID,
) -> Any:
    """
    Delete a building.
    """
    b = await building.get(db, id=building_id)
    if not b:
        raise HTTPException(status_code=404, detail="Building not found")
    b = await building.remove(db, id=building_id)
    return b

from app.engine.graph.preprocessor import preprocess_building
from app.engine.graph.rasterizer import rasterize_building
from app.engine.graph.generator import GraphGenerator, persist_graph
from app.engine.graph.validator import GraphValidator
from app.schemas.graph import GraphTopologyRead, GraphNodeRead, GraphEdgeRead

class GraphResponse(GraphTopologyRead):
    nodes: List[GraphNodeRead]
    edges: List[GraphEdgeRead]

@router.post("/{building_id}/generate-graph", response_model=GraphResponse)
async def generate_building_graph(
    *,
    db: AsyncSession = Depends(get_db),
    building_id: UUID,
) -> Any:
    """
    Generate and validate navigation graph from floorplan.
    """
    b = await building.get_with_floors(db, id=building_id)
    if not b:
        raise HTTPException(status_code=404, detail="Building not found")
        
    export_data = BuildingExport.model_validate(b)
    
    export_data.floors = []
    for f in b.floors:
        floor_data = FloorExport.model_validate(f)
        floor_data.rooms = await room_service.get_by_floor(db, floor_id=f.id)
        floor_data.walls = await wall_service.get_by_floor(db, floor_id=f.id)
        floor_data.doors = await door_service.get_by_floor(db, floor_id=f.id)
        floor_data.stairs = await stair_service.get_by_floor(db, floor_id=f.id)
        floor_data.exits = await exit_service.get_by_floor(db, floor_id=f.id)
        export_data.floors.append(floor_data)
        
    try:
        preprocessed = preprocess_building(export_data)
        raster = rasterize_building(preprocessed)
        generator = GraphGenerator(preprocessed, raster)
        topo_create, nodes_map, edges_map = generator.generate()
        
        topo = await persist_graph(db, topo_create, nodes_map, edges_map)
        
        topo_with_elements = await topology_service.get_with_elements(db, id=topo.id)
        
        # val = GraphValidator(topo_with_elements, topo_with_elements.nodes, topo_with_elements.edges)
        # val.validate()
            
        resp = GraphResponse.model_validate(topo_with_elements)
        resp.nodes = topo_with_elements.nodes
        resp.edges = topo_with_elements.edges
        return resp
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=f"Graph generation failed: {str(e)}")

@router.get("/{building_id}/graph", response_model=GraphResponse)
async def get_building_graph(
    *,
    db: AsyncSession = Depends(get_db),
    building_id: UUID,
) -> Any:
    """
    Get serialized topological graph (nodes, edges, capacities).
    """
    topologies = await topology_service.get_by_building(db, building_id=building_id)
    if not topologies:
        raise HTTPException(status_code=404, detail="Graph not found for this building")
        
    topo = topologies[0] # Get the latest or only topology
    topo_with_elements = await topology_service.get_with_elements(db, id=topo.id)
    
    resp = GraphResponse.model_validate(topo_with_elements)
    resp.nodes = topo_with_elements.nodes
    resp.edges = topo_with_elements.edges
    return resp
