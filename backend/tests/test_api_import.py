import pytest
from fastapi.testclient import TestClient
import uuid

pytestmark = pytest.mark.asyncio(loop_scope="function")


async def test_import_roundtrip(client: TestClient):
    # 1. Create a building to export
    b_resp = client.post("/api/v1/buildings/", json={"name": "To Be Exported", "total_floors": 2})
    b_id = b_resp.json()["id"]

    f_resp = client.post("/api/v1/floors/", json={"building_id": b_id, "floor_number": 1, "name": "Ground"})
    f_id = f_resp.json()["id"]
    
    r_resp = client.post("/api/v1/spatial/rooms/", json={"floor_id": f_id, "name": "Room A", "room_type": "OFFICE"})
    r_id = r_resp.json()["id"]
    
    # 2. Export it
    exp_resp = client.get(f"/api/v1/buildings/{b_id}/export")
    assert exp_resp.status_code == 200
    export_json = exp_resp.json()
    
    # 3. Delete the original building
    del_resp = client.delete(f"/api/v1/buildings/{b_id}")
    assert del_resp.status_code == 200
    
    # 4. Import the JSON back
    imp_resp = client.post("/api/v1/buildings/import", json=export_json)
    assert imp_resp.status_code == 201
    
    # 5. Verify it was restored perfectly
    re_exp_resp = client.get(f"/api/v1/buildings/{b_id}/export")
    assert re_exp_resp.status_code == 200
    re_export_json = re_exp_resp.json()
    
    # Structurally they should be identical
    assert export_json == re_export_json
    
    # Let's ensure the room is actually queryable via its own API
    r_check = client.get(f"/api/v1/spatial/rooms/{r_id}")
    assert r_check.status_code == 200
    assert r_check.json()["name"] == "Room A"


async def test_import_collision(client: TestClient):
    # Create building
    b_resp = client.post("/api/v1/buildings/", json={"name": "Collision Test", "total_floors": 1})
    b_id = b_resp.json()["id"]
    
    # Export it
    exp_resp = client.get(f"/api/v1/buildings/{b_id}/export")
    export_json = exp_resp.json()
    
    # Attempt to import it WITHOUT deleting the original
    imp_resp = client.post("/api/v1/buildings/import", json=export_json)
    assert imp_resp.status_code == 409
    assert "already exists" in imp_resp.json()["detail"]


async def test_import_malformed_rolls_back(client: TestClient):
    new_b_id = str(uuid.uuid4())
    malformed_json = {
        "id": new_b_id,
        "name": "Malformed Building",
        "total_floors": 1,
        "created_at": "2026-08-18T10:00:00Z",
        "updated_at": "2026-08-18T10:00:00Z",
        "floors": [
            {
                "id": str(uuid.uuid4()),
                "building_id": new_b_id,
                "floor_number": 1,
                "name": "Floor 1",
                "width_meters": 10.0,
                "height_meters": 10.0,
                "grid_cell_size": 0.5,
                "created_at": "2026-08-18T10:00:00Z",
                "updated_at": "2026-08-18T10:00:00Z",
                "rooms": [
                    {
                        "id": str(uuid.uuid4()),
                        "floor_id": str(uuid.uuid4()), # BAD PARENT REFERENCE - Violates FK
                        "name": "Bad Room",
                        "room_type": "OFFICE",
                        "geometry": {},
                        "is_accessible": True,
                        "created_at": "2026-08-18T10:00:00Z",
                        "updated_at": "2026-08-18T10:00:00Z",
                    }
                ],
                "walls": [], "doors": [], "stairs": [], "exits": []
            }
        ],
        "topologies": []
    }
    
    imp_resp = client.post("/api/v1/buildings/import", json=malformed_json)
    assert imp_resp.status_code == 400
    
    # Ensure it rolled back (building shouldn't exist)
    check_resp = client.get(f"/api/v1/buildings/{new_b_id}")
    assert check_resp.status_code == 404
