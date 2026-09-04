import uuid
import pytest
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.core.database import AsyncSessionLocal, init_db
from app.models.building import Building, Floor
from app.schemas.building import (
    BuildingCreate,
    BuildingDetailRead,
    BuildingRead,
    BuildingUpdate,
    FloorCreate,
    FloorRead,
    FloorUpdate,
)


@pytest.mark.asyncio
async def test_building_and_floor_orm_creation():
    """Verify ORM model instantiation, persistence, and primary key generation."""
    await init_db()

    async with AsyncSessionLocal() as session:
        b = Building(
            name="Engineering Complex Alpha",
            description="Main research and testing facility",
            total_floors=3,
            building_metadata={"occupancy_max": 450, "fire_rating": "Type I"},
        )
        session.add(b)
        await session.commit()
        await session.refresh(b)

        assert isinstance(b.id, uuid.UUID)
        assert b.name == "Engineering Complex Alpha"
        assert b.total_floors == 3
        assert b.created_at is not None
        assert b.updated_at is not None
        assert b.building_metadata["occupancy_max"] == 450

        # Create floors
        f0 = Floor(
            building_id=b.id,
            floor_number=0,
            name="Ground Floor",
            width_meters=60.0,
            height_meters=40.0,
            grid_cell_size=0.5,
            raw_geometry={"rooms": ["Room 101", "Lobby"]},
        )
        f1 = Floor(
            building_id=b.id,
            floor_number=1,
            name="Level 1 Labs",
            width_meters=60.0,
            height_meters=40.0,
            grid_cell_size=0.5,
            raw_geometry={"rooms": ["Lab 201"]},
        )
        session.add_all([f0, f1])
        await session.commit()
        await session.refresh(f0)
        await session.refresh(f1)

        assert isinstance(f0.id, uuid.UUID)
        assert f0.building_id == b.id
        assert f0.floor_number == 0
        assert f1.floor_number == 1


@pytest.mark.asyncio
async def test_building_floor_relationship_and_cascade():
    """Verify bidirectional relationship, floor ordering, and cascade delete."""
    await init_db()

    async with AsyncSessionLocal() as session:
        b = Building(name="Science Tower", total_floors=2)
        session.add(b)
        await session.flush()

        # Add floors in reverse order to verify order_by="Floor.floor_number"
        f1 = Floor(building_id=b.id, floor_number=1, name="First Floor")
        f0 = Floor(building_id=b.id, floor_number=0, name="Ground Floor")
        session.add_all([f1, f0])
        await session.commit()

    # Re-query building and verify floors relationship
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Building).where(Building.name == "Science Tower")
        )
        queried_b = result.scalar_one()
        assert len(queried_b.floors) == 2
        assert queried_b.floors[0].floor_number == 0
        assert queried_b.floors[1].floor_number == 1
        assert queried_b.floors[0].building.name == "Science Tower"

        building_id = queried_b.id

        # Delete building and verify cascade deletion of floors
        await session.delete(queried_b)
        await session.commit()

    # Verify floors are deleted
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Floor).where(Floor.building_id == building_id)
        )
        floors = result.scalars().all()
        assert len(floors) == 0


@pytest.mark.asyncio
async def test_duplicate_floor_number_constraint():
    """Verify unique constraint on (building_id, floor_number)."""
    await init_db()

    async with AsyncSessionLocal() as session:
        b = Building(name="Warehouse B", total_floors=1)
        session.add(b)
        await session.flush()

        f1 = Floor(building_id=b.id, floor_number=0, name="Floor A")
        f2 = Floor(building_id=b.id, floor_number=0, name="Floor B Duplicate")
        session.add_all([f1, f2])

        with pytest.raises(IntegrityError):
            await session.commit()
        await session.rollback()


def test_pydantic_building_schemas():
    """Verify Pydantic Building schema validation rules."""
    # Valid building
    valid_data = {
        "name": "Headquarters",
        "description": "Corporate center",
        "total_floors": 4,
        "building_metadata": {"zone": "Commercial"},
    }
    schema = BuildingCreate(**valid_data)
    assert schema.name == "Headquarters"
    assert schema.total_floors == 4

    # Invalid empty name
    with pytest.raises(ValidationError):
        BuildingCreate(name="", total_floors=1)

    # Invalid total_floors < 1
    with pytest.raises(ValidationError):
        BuildingCreate(name="Invalid Floors", total_floors=0)

    # Building update schema
    update_schema = BuildingUpdate(name="Renamed HQ", total_floors=5)
    assert update_schema.name == "Renamed HQ"
    assert update_schema.description is None


def test_pydantic_floor_schemas():
    """Verify Pydantic Floor schema validation rules."""
    valid_floor = {
        "floor_number": 2,
        "name": "Level 2",
        "width_meters": 75.5,
        "height_meters": 45.0,
        "grid_cell_size": 0.5,
        "raw_geometry": {"walls": []},
    }
    schema = FloorCreate(**valid_floor)
    assert schema.floor_number == 2
    assert schema.width_meters == 75.5

    # Invalid negative dimension
    with pytest.raises(ValidationError):
        FloorCreate(
            floor_number=0,
            name="Ground",
            width_meters=-10.0,
            height_meters=20.0,
        )

    # Invalid zero cell size
    with pytest.raises(ValidationError):
        FloorCreate(
            floor_number=0,
            name="Ground",
            width_meters=10.0,
            height_meters=10.0,
            grid_cell_size=0.0,
        )


@pytest.mark.asyncio
async def test_orm_to_pydantic_serialization():
    """Verify ORM models serialize seamlessly into Pydantic v2 Read schemas."""
    await init_db()

    async with AsyncSessionLocal() as session:
        b = Building(
            name="Hospital Wing",
            description="Emergency facility",
            total_floors=2,
        )
        session.add(b)
        await session.flush()

        f0 = Floor(
            building_id=b.id,
            floor_number=0,
            name="Triage",
            width_meters=40.0,
            height_meters=30.0,
        )
        f1 = Floor(
            building_id=b.id,
            floor_number=1,
            name="ICU",
            width_meters=40.0,
            height_meters=30.0,
        )
        session.add_all([f0, f1])
        await session.commit()
        await session.refresh(b)

    # Validate using Pydantic from_attributes
    read_schema = BuildingDetailRead.model_validate(b)
    assert read_schema.id == b.id
    assert read_schema.name == "Hospital Wing"
    assert len(read_schema.floors) == 2
    assert read_schema.floors[0].name == "Triage"
    assert read_schema.floors[1].name == "ICU"
