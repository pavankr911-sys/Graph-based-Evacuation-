import pytest
from fastapi.testclient import TestClient

pytestmark = pytest.mark.asyncio(loop_scope="function")

async def test_create_building(client: TestClient):
    response = client.post(
        "/api/v1/buildings/",
        json={"name": "API Building", "description": "Test via API", "total_floors": 3}
    )
    assert response.status_code == 201, response.text
    data = response.json()
    assert data["name"] == "API Building"
    assert "id" in data
    return data["id"]

async def test_read_building(client: TestClient):
    # First create
    building_id = await test_create_building(client)
    
    response = client.get(f"/api/v1/buildings/{building_id}")
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["id"] == building_id
    assert data["name"] == "API Building"
    assert "floors" in data

async def test_list_buildings(client: TestClient):
    await test_create_building(client)
    response = client.get("/api/v1/buildings/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert any(b["name"] == "API Building" for b in data)

async def test_update_building(client: TestClient):
    building_id = await test_create_building(client)
    response = client.put(
        f"/api/v1/buildings/{building_id}",
        json={"name": "API Building Updated"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "API Building Updated"

async def test_delete_building(client: TestClient):
    building_id = await test_create_building(client)
    response = client.delete(f"/api/v1/buildings/{building_id}")
    assert response.status_code == 200
    
    # Verify deleted
    response = client.get(f"/api/v1/buildings/{building_id}")
    assert response.status_code == 404

async def test_floor_crud(client: TestClient):
    # Create building
    b_resp = client.post("/api/v1/buildings/", json={"name": "Floor Test Building", "total_floors": 5})
    b_id = b_resp.json()["id"]

    # Create floor
    f_resp = client.post(
        "/api/v1/floors/",
        json={"building_id": b_id, "floor_number": 1, "name": "Ground Floor", "width_meters": 20.0, "height_meters": 30.0}
    )
    assert f_resp.status_code == 201, f_resp.text
    f_id = f_resp.json()["id"]
    
    # Read floor
    f_read = client.get(f"/api/v1/floors/{f_id}")
    assert f_read.status_code == 200
    assert f_read.json()["name"] == "Ground Floor"
    
    # List floors by building
    f_list = client.get(f"/api/v1/floors/?building_id={b_id}")
    assert f_list.status_code == 200
    assert len(f_list.json()) == 1
    assert f_list.json()[0]["id"] == f_id
    
    # Update floor
    f_update = client.put(f"/api/v1/floors/{f_id}", json={"name": "Updated Ground Floor"})
    assert f_update.status_code == 200
    assert f_update.json()["name"] == "Updated Ground Floor"
    
    # Delete floor
    f_del = client.delete(f"/api/v1/floors/{f_id}")
    assert f_del.status_code == 200
    
    f_read2 = client.get(f"/api/v1/floors/{f_id}")
    assert f_read2.status_code == 404

async def test_validation_errors(client: TestClient):
    response = client.post("/api/v1/buildings/", json={"description": "Missing name"})
    assert response.status_code == 422
    
    response = client.post("/api/v1/floors/", json={"building_id": "not-a-uuid", "floor_number": 1})
    assert response.status_code == 422
