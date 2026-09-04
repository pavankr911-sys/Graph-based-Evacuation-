import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import uuid4

from app.schemas.building import BuildingCreate, BuildingUpdate, FloorCreate, FloorUpdate
from app.schemas.spatial import RoomCreate
from app.services import building, floor, room

pytestmark = pytest.mark.asyncio(loop_scope="function")

async def test_building_crud(session: AsyncSession):
    # Create
    b_in = BuildingCreate(name="Service Building", description="Test", total_floors=2)
    b = await building.create(session, obj_in=b_in)
    assert b.name == "Service Building"
    assert b.id is not None
    
    # Read
    b_loaded = await building.get(session, id=b.id)
    assert b_loaded is not None
    assert b_loaded.name == "Service Building"
    
    # List
    b_list = await building.get_multi(session, limit=1000)
    assert len(b_list) >= 1
    assert b.id in [item.id for item in b_list]
    
    # Update
    b_update = BuildingUpdate(name="Updated Building")
    b_updated = await building.update(session, db_obj=b, obj_in=b_update)
    assert b_updated.name == "Updated Building"
    
    # Delete
    b_deleted = await building.remove(session, id=b.id)
    assert b_deleted.id == b.id
    
    b_missing = await building.get(session, id=b.id)
    assert b_missing is None


async def test_floor_crud_and_parent_child(session: AsyncSession):
    # Parent building
    b_in = BuildingCreate(name="Parent Building", total_floors=1)
    b = await building.create(session, obj_in=b_in)
    
    # Create child floor
    f_in = FloorCreate(building_id=b.id, floor_number=1, name="First Floor", width_meters=10.0, height_meters=10.0)
    f = await floor.create(session, obj_in=f_in)
    assert f.building_id == b.id
    
    # get_by_building
    floors = await floor.get_by_building(session, building_id=b.id)
    assert len(floors) == 1
    assert floors[0].id == f.id
    
    # Create spatial element
    r_in = RoomCreate(floor_id=f.id, name="Test Room", room_type="OFFICE", geometry={"type": "Polygon"}, is_accessible=True)
    r = await room.create(session, obj_in=r_in)
    assert r.floor_id == f.id
    
    # Cascade check (simulate by removing building)
    await building.remove(session, id=b.id)
    
    f_missing = await floor.get(session, id=f.id)
    assert f_missing is None
    
    r_missing = await room.get(session, id=r.id)
    assert r_missing is None


async def test_not_found_handling(session: AsyncSession):
    missing_id = uuid4()
    
    b_missing = await building.get(session, id=missing_id)
    assert b_missing is None
    
    b_removed = await building.remove(session, id=missing_id)
    assert b_removed is None
