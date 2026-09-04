import pytest
from fastapi.testclient import TestClient
import uuid

pytestmark = pytest.mark.asyncio(loop_scope="function")


async def test_export_empty_building(client: TestClient):
    # Create empty building
    b_resp = client.post("/api/v1/buildings/", json={"name": "Export Building Empty", "total_floors": 1})
    assert b_resp.status_code == 201
    b_id = b_resp.json()["id"]

    # Export
    exp_resp = client.get(f"/api/v1/buildings/{b_id}/export")
    assert exp_resp.status_code == 200
    
    data = exp_resp.json()
    assert data["id"] == b_id
    assert data["name"] == "Export Building Empty"
    assert data["floors"] == []
    assert data["topologies"] == []


async def test_export_missing_building(client: TestClient):
    bad_id = str(uuid.uuid4())
    resp = client.get(f"/api/v1/buildings/{bad_id}/export")
    assert resp.status_code == 404
    assert "Building not found" in resp.json()["detail"]


async def test_export_populated_building(client: TestClient):
    # Create building
    b_resp = client.post("/api/v1/buildings/", json={"name": "Populated Building", "total_floors": 2})
    b_id = b_resp.json()["id"]

    # Create 2 floors
    f1_resp = client.post("/api/v1/floors/", json={"building_id": b_id, "floor_number": 1, "name": "F1"})
    f1_id = f1_resp.json()["id"]
    
    f2_resp = client.post("/api/v1/floors/", json={"building_id": b_id, "floor_number": 2, "name": "F2"})
    f2_id = f2_resp.json()["id"]

    # Create spatial elements for floor 1
    r_resp = client.post(
        "/api/v1/spatial/rooms/",
        json={"floor_id": f1_id, "name": "Room A", "room_type": "OFFICE"}
    )
    r_id = r_resp.json()["id"]
    
    w_resp = client.post(
        "/api/v1/spatial/walls/",
        json={"floor_id": f1_id, "start_x": 0.0, "start_y": 0.0, "end_x": 10.0, "end_y": 10.0}
    )
    w_id = w_resp.json()["id"]
    
    d_resp = client.post(
        "/api/v1/spatial/doors/",
        json={"floor_id": f1_id, "room_a_id": r_id, "position_x": 5.0, "position_y": 5.0, "width_meters": 1.0}
    )
    d_id = d_resp.json()["id"]
    
    s_resp = client.post(
        "/api/v1/spatial/stairs/",
        json={"floor_id": f1_id, "target_floor_id": f2_id, "position_x": 5.0, "position_y": 5.0}
    )
    s_id = s_resp.json()["id"]
    
    e_resp = client.post(
        "/api/v1/spatial/exits/",
        json={"floor_id": f1_id, "position_x": 0.0, "position_y": 5.0}
    )
    e_id = e_resp.json()["id"]

    # Export
    exp_resp = client.get(f"/api/v1/buildings/{b_id}/export")
    assert exp_resp.status_code == 200
    
    data = exp_resp.json()
    assert data["id"] == b_id
    assert len(data["floors"]) == 2
    
    f1_export = next(f for f in data["floors"] if f["id"] == f1_id)
    assert len(f1_export["rooms"]) == 1
    assert f1_export["rooms"][0]["id"] == r_id
    
    assert len(f1_export["walls"]) == 1
    assert f1_export["walls"][0]["id"] == w_id
    
    assert len(f1_export["doors"]) == 1
    assert f1_export["doors"][0]["id"] == d_id
    
    assert len(f1_export["stairs"]) == 1
    assert f1_export["stairs"][0]["id"] == s_id
    
    assert len(f1_export["exits"]) == 1
    assert f1_export["exits"][0]["id"] == e_id
    
    # Floor 2 should be empty
    f2_export = next(f for f in data["floors"] if f["id"] == f2_id)
    assert len(f2_export["rooms"]) == 0
    assert len(f2_export["walls"]) == 0
