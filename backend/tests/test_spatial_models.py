import pytest
import uuid
from sqlalchemy import select
from app.core.database import AsyncSessionLocal, init_db
from app.models.building import Building, Floor
from app.models.spatial import Room, Wall, Door, Stair, Exit
from app.schemas.spatial import RoomCreate, DoorCreate, ExitCreate, StairCreate, WallCreate
from pydantic import ValidationError

@pytest.mark.asyncio
async def test_spatial_elements_creation():
    """Verify ORM model instantiation and relationship to Floor."""
    await init_db()

    async with AsyncSessionLocal() as session:
        b = Building(name="Spatial Test Building")
        f = Floor(building=b, floor_number=1, name="Floor 1")
        f2 = Floor(building=b, floor_number=2, name="Floor 2")
        session.add(b)
        await session.commit()
        await session.refresh(f)
        await session.refresh(f2)

        # Create Spatial Elements
        r = Room(floor_id=f.id, name="Room 101")
        w = Wall(floor_id=f.id, start_x=0.0, start_y=0.0, end_x=10.0, end_y=0.0)
        d = Door(floor_id=f.id, room_a=r, position_x=5.0, position_y=0.0)
        s = Stair(floor_id=f.id, target_floor_id=f2.id, position_x=10.0, position_y=10.0)
        e = Exit(floor_id=f.id, position_x=0.0, position_y=10.0)

        session.add_all([r, w, d, s, e])
        await session.commit()
        # Check DB directly
        r_db = (await session.execute(select(Room).where(Room.floor_id == f.id))).scalars().all()
        w_db = (await session.execute(select(Wall).where(Wall.floor_id == f.id))).scalars().all()
        d_db = (await session.execute(select(Door).where(Door.floor_id == f.id))).scalars().all()
        s_db = (await session.execute(select(Stair).where(Stair.floor_id == f.id))).scalars().all()
        e_db = (await session.execute(select(Exit).where(Exit.floor_id == f.id))).scalars().all()

        assert len(r_db) == 1
        assert len(w_db) == 1
        assert len(d_db) == 1
        assert len(s_db) == 1
        assert len(e_db) == 1

        assert r_db[0].name == "Room 101"
        assert w_db[0].end_x == 10.0
        assert d_db[0].room_a_id == r.id
        assert s_db[0].target_floor_id == f2.id
        assert e_db[0].discharge_rate == 1.5

def test_spatial_schemas_validation():
    """Verify Pydantic schema validation."""
    
    # Room
    r = RoomCreate(name="Office", room_type="office")
    assert r.name == "Office"
    assert r.room_type == "office"
    
    with pytest.raises(ValidationError):
        RoomCreate(name="")

    # Door
    d = DoorCreate(position_x=1.0, position_y=2.0)
    assert d.width_meters == 1.0
    
    with pytest.raises(ValidationError):
        DoorCreate(position_x=1.0, position_y=2.0, width_meters=-1.0)
        
    # Stair
    s = StairCreate(position_x=5.0, position_y=5.0)
    assert s.width_meters == 1.5

    with pytest.raises(ValidationError):
        StairCreate(position_x=5.0, position_y=5.0, width_meters=0.0)
        
    # Exit
    e = ExitCreate(position_x=0.0, position_y=0.0)
    assert e.discharge_rate == 1.5
    
    with pytest.raises(ValidationError):
        ExitCreate(position_x=0.0, position_y=0.0, discharge_rate=-0.5)

    # Wall
    w = WallCreate(start_x=0.0, start_y=0.0, end_x=1.0, end_y=1.0)
    assert w.is_combustible is False
