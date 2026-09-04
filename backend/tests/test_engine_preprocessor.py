import pytest
import uuid
from app.schemas.export import BuildingExport, FloorExport
from app.schemas.spatial import RoomRead, WallRead, DoorRead, StairRead, ExitRead
from app.schemas.graph import GraphTopologyRead
from app.engine.graph.preprocessor import preprocess_building, PreprocessingError
from datetime import datetime

def make_uuid():
    return uuid.uuid4()

def make_dt():
    return datetime.utcnow()

def test_preprocess_valid_building():
    b_id = make_uuid()
    f_id = make_uuid()
    r_id = make_uuid()
    
    export = BuildingExport(
        id=b_id,
        name="Valid Building",
        total_floors=1,
        created_at=make_dt(),
        updated_at=make_dt(),
        floors=[
            FloorExport(
                id=f_id, building_id=b_id, floor_number=0, name="G",
                width_meters=50.0, height_meters=50.0, grid_cell_size=0.5,
                created_at=make_dt(), updated_at=make_dt(),
                rooms=[
                    RoomRead(id=r_id, floor_id=f_id, name="R1", room_type="OFFICE", geometry={}, is_accessible=True, created_at=make_dt(), updated_at=make_dt())
                ],
                walls=[
                    WallRead(id=make_uuid(), floor_id=f_id, start_x=0.0, start_y=0.0, end_x=10.0, end_y=10.0, is_combustible=False, created_at=make_dt(), updated_at=make_dt())
                ],
                doors=[
                    DoorRead(id=make_uuid(), floor_id=f_id, room_a_id=r_id, position_x=5.0, position_y=5.0, width_meters=1.0, is_open=True, created_at=make_dt(), updated_at=make_dt())
                ],
                stairs=[
                    StairRead(id=make_uuid(), floor_id=f_id, position_x=10.0, position_y=10.0, width_meters=1.5, is_upward=True, created_at=make_dt(), updated_at=make_dt())
                ],
                exits=[
                    ExitRead(id=make_uuid(), floor_id=f_id, position_x=20.0, position_y=0.0, width_meters=2.0, discharge_rate=1.5, is_usable=True, created_at=make_dt(), updated_at=make_dt())
                ]
            )
        ]
    )
    
    result = preprocess_building(export)
    assert result.id == b_id
    assert len(result.floors) == 1
    assert result.sorted_floors[0].id == f_id
    assert len(result.sorted_floors[0].walls) == 1
    assert len(result.sorted_floors[0].doors) == 1
    assert len(result.sorted_floors[0].stairs) == 1
    assert len(result.sorted_floors[0].exits) == 1
    assert len(result.sorted_floors[0].rooms) == 1

def test_invalid_floor_dimensions():
    b_id = make_uuid()
    f_id = make_uuid()
    
    export = BuildingExport(
        id=b_id,
        name="Invalid Building",
        total_floors=1,
        created_at=make_dt(),
        updated_at=make_dt(),
        floors=[
            FloorExport.model_construct(
                id=f_id, building_id=b_id, floor_number=0, name="G",
                width_meters=-5.0, height_meters=50.0, grid_cell_size=0.5,
                created_at=make_dt(), updated_at=make_dt(),
                rooms=[], walls=[], doors=[], stairs=[], exits=[]
            )
        ]
    )
    
    with pytest.raises(PreprocessingError, match="invalid dimensions"):
        preprocess_building(export)

def test_zero_length_wall():
    b_id = make_uuid()
    f_id = make_uuid()
    
    export = BuildingExport(
        id=b_id,
        name="Invalid Building",
        total_floors=1,
        created_at=make_dt(),
        updated_at=make_dt(),
        floors=[
            FloorExport(
                id=f_id, building_id=b_id, floor_number=0, name="G",
                width_meters=50.0, height_meters=50.0, grid_cell_size=0.5,
                created_at=make_dt(), updated_at=make_dt(),
                walls=[
                    WallRead(id=make_uuid(), floor_id=f_id, start_x=10.0, start_y=10.0, end_x=10.0, end_y=10.0, is_combustible=False, created_at=make_dt(), updated_at=make_dt())
                ]
            )
        ]
    )
    
    with pytest.raises(PreprocessingError, match="zero length"):
        preprocess_building(export)

def test_out_of_bounds_geometry():
    b_id = make_uuid()
    f_id = make_uuid()
    
    export = BuildingExport(
        id=b_id,
        name="Invalid Building",
        total_floors=1,
        created_at=make_dt(),
        updated_at=make_dt(),
        floors=[
            FloorExport(
                id=f_id, building_id=b_id, floor_number=0, name="G",
                width_meters=50.0, height_meters=50.0, grid_cell_size=0.5,
                created_at=make_dt(), updated_at=make_dt(),
                doors=[
                    DoorRead(id=make_uuid(), floor_id=f_id, position_x=100.0, position_y=5.0, width_meters=1.0, is_open=True, created_at=make_dt(), updated_at=make_dt())
                ]
            )
        ]
    )
    
    with pytest.raises(PreprocessingError, match="outside floor"):
        preprocess_building(export)

def test_missing_room_reference():
    b_id = make_uuid()
    f_id = make_uuid()
    
    export = BuildingExport(
        id=b_id,
        name="Invalid Building",
        total_floors=1,
        created_at=make_dt(),
        updated_at=make_dt(),
        floors=[
            FloorExport(
                id=f_id, building_id=b_id, floor_number=0, name="G",
                width_meters=50.0, height_meters=50.0, grid_cell_size=0.5,
                created_at=make_dt(), updated_at=make_dt(),
                doors=[
                    DoorRead(id=make_uuid(), floor_id=f_id, room_a_id=make_uuid(), position_x=10.0, position_y=5.0, width_meters=1.0, is_open=True, created_at=make_dt(), updated_at=make_dt())
                ]
            )
        ]
    )
    
    with pytest.raises(PreprocessingError, match="invalid room_a_id"):
        preprocess_building(export)
