import pytest
from fastapi.testclient import TestClient
import uuid

pytestmark = pytest.mark.asyncio(loop_scope="function")

async def setup_building_floor(client: TestClient):
    # Create building
    b_resp = client.post("/api/v1/buildings/", json={"name": "Test Building", "total_floors": 1})
    b_id = b_resp.json()["id"]

    # Create floor
    f_resp = client.post(
        "/api/v1/floors/",
        json={"building_id": b_id, "floor_number": 1, "name": "Floor 1", "width_meters": 20.0, "height_meters": 30.0}
    )
    f_id = f_resp.json()["id"]
    return b_id, f_id

async def test_room_crud(client: TestClient):
    _, f_id = await setup_building_floor(client)
    
    # Create
    resp = client.post(
        "/api/v1/spatial/rooms/",
        json={"floor_id": f_id, "name": "Room A", "room_type": "OFFICE", "geometry": {"type": "Polygon"}, "is_accessible": True}
    )
    assert resp.status_code == 201
    r_id = resp.json()["id"]
    
    # Read
    resp = client.get(f"/api/v1/spatial/rooms/{r_id}")
    assert resp.status_code == 200
    assert resp.json()["name"] == "Room A"
    
    # List by floor
    resp = client.get(f"/api/v1/spatial/rooms/?floor_id={f_id}")
    assert resp.status_code == 200
    assert len(resp.json()) >= 1
    
    # Update
    resp = client.put(f"/api/v1/spatial/rooms/{r_id}", json={"name": "Room A Updated"})
    assert resp.status_code == 200
    assert resp.json()["name"] == "Room A Updated"
    
    # Delete
    resp = client.delete(f"/api/v1/spatial/rooms/{r_id}")
    assert resp.status_code == 200
    
    resp = client.get(f"/api/v1/spatial/rooms/{r_id}")
    assert resp.status_code == 404

async def test_wall_crud(client: TestClient):
    _, f_id = await setup_building_floor(client)
    
    resp = client.post(
        "/api/v1/spatial/walls/",
        json={"floor_id": f_id, "start_x": 0.0, "start_y": 0.0, "end_x": 10.0, "end_y": 10.0}
    )
    assert resp.status_code == 201
    w_id = resp.json()["id"]
    
    resp = client.get(f"/api/v1/spatial/walls/{w_id}")
    assert resp.status_code == 200
    
    resp = client.delete(f"/api/v1/spatial/walls/{w_id}")
    assert resp.status_code == 200

async def test_door_crud(client: TestClient):
    _, f_id = await setup_building_floor(client)
    
    r_resp = client.post(
        "/api/v1/spatial/rooms/",
        json={"floor_id": f_id, "name": "Room", "room_type": "OFFICE", "geometry": {"type": "Polygon"}, "is_accessible": True}
    )
    r_id = r_resp.json()["id"]

    resp = client.post(
        "/api/v1/spatial/doors/",
        json={"floor_id": f_id, "room_a_id": r_id, "position_x": 5.0, "position_y": 5.0, "width_meters": 1.0}
    )
    assert resp.status_code == 201
    d_id = resp.json()["id"]
    
    resp = client.get(f"/api/v1/spatial/doors/{d_id}")
    assert resp.status_code == 200
    
    resp = client.delete(f"/api/v1/spatial/doors/{d_id}")
    assert resp.status_code == 200

async def test_stair_crud(client: TestClient):
    _, f_id = await setup_building_floor(client)
    
    resp = client.post(
        "/api/v1/spatial/stairs/",
        json={"floor_id": f_id, "position_x": 5.0, "position_y": 5.0, "width_meters": 1.5, "is_upward": True}
    )
    assert resp.status_code == 201
    s_id = resp.json()["id"]
    
    resp = client.get(f"/api/v1/spatial/stairs/{s_id}")
    assert resp.status_code == 200
    
    resp = client.delete(f"/api/v1/spatial/stairs/{s_id}")
    assert resp.status_code == 200

async def test_exit_crud(client: TestClient):
    _, f_id = await setup_building_floor(client)
    
    resp = client.post(
        "/api/v1/spatial/exits/",
        json={"floor_id": f_id, "position_x": 0.0, "position_y": 5.0, "width_meters": 2.0}
    )
    assert resp.status_code == 201
    e_id = resp.json()["id"]
    
    resp = client.get(f"/api/v1/spatial/exits/{e_id}")
    assert resp.status_code == 200
    
    resp = client.delete(f"/api/v1/spatial/exits/{e_id}")
    assert resp.status_code == 200

async def test_invalid_parent_references(client: TestClient):
    bad_id = str(uuid.uuid4())
    resp = client.post(
        "/api/v1/spatial/rooms/",
        json={"floor_id": bad_id, "name": "Room A", "room_type": "OFFICE", "geometry": {"type": "Polygon"}, "is_accessible": True}
    )
    assert resp.status_code == 404
    assert "Floor not found" in resp.json()["detail"]
