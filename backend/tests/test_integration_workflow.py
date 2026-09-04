import pytest
import uuid

def test_full_building_to_graph_workflow(client):
    """
    Integration Test: M1-T9
    1. Create building & floor
    2. Create room, wall, door, exit
    3. Export building as JSON
    4. Delete original building
    5. Import building as JSON (restores it)
    6. Generate Graph for the restored building
    7. Retrieve Graph
    """
    
    # 1. Create Building & Floor
    b_resp = client.post("/api/v1/buildings/", json={"name": "Integration Test Building", "description": "Workflow test"})
    assert b_resp.status_code == 201
    b_id = b_resp.json()["id"]
    
    f_resp = client.post("/api/v1/floors/", json={
        "building_id": b_id,
        "floor_number": 1,
        "name": "Level 1",
        "elevation_z": 0.0,
        "grid_resolution": 0.5
    })
    assert f_resp.status_code == 201
    f_id = f_resp.json()["id"]
    
    # 2. Create spatial elements
    room_resp = client.post("/api/v1/spatial/rooms/", json={
        "floor_id": f_id,
        "name": "Lobby",
        "room_type": "general",
        "is_accessible": True,
        "geometry": {
            "type": "polygon",
            "coordinates": [{"x": 0, "y": 0}, {"x": 10, "y": 0}, {"x": 10, "y": 10}, {"x": 0, "y": 10}]
        }
    })
    assert room_resp.status_code == 201
    
    wall_resp = client.post("/api/v1/spatial/walls/", json={
        "floor_id": f_id,
        "start_x": 0, "start_y": 0,
        "end_x": 10, "end_y": 0,
        "is_combustible": False
    })
    assert wall_resp.status_code == 201
    
    door_resp = client.post("/api/v1/spatial/doors/", json={
        "floor_id": f_id,
        "position_x": 5, "position_y": 0,
        "width_meters": 1.0,
        "is_open": True
    })
    assert door_resp.status_code == 201
    
    exit_resp = client.post("/api/v1/spatial/exits/", json={
        "floor_id": f_id,
        "position_x": 10, "position_y": 5,
        "width_meters": 2.0,
        "discharge_rate": 1.5,
        "is_usable": True
    })
    assert exit_resp.status_code == 201
    
    # 3. Export Building
    export_resp = client.get(f"/api/v1/buildings/{b_id}/export")
    assert export_resp.status_code == 200
    export_data = export_resp.json()
    assert export_data["name"] == "Integration Test Building"
    assert len(export_data["floors"]) == 1
    assert len(export_data["floors"][0]["rooms"]) == 1
    
    # 4. Delete Original Building
    del_resp = client.delete(f"/api/v1/buildings/{b_id}")
    assert del_resp.status_code == 200
    
    # 5. Import Building
    import_resp = client.post("/api/v1/buildings/import", json=export_data)
    assert import_resp.status_code == 201
    imported_b_id = import_resp.json()["id"]
    assert imported_b_id == b_id # IDs should be preserved
    
    # 6. Generate Graph for imported building
    gen_resp = client.post(f"/api/v1/buildings/{imported_b_id}/generate-graph")
    assert gen_resp.status_code == 200, f"Graph generation failed: {gen_resp.text}"
    gen_data = gen_resp.json()
    
    # Verify graph structure
    assert "nodes" in gen_data
    assert "edges" in gen_data
    assert len(gen_data["nodes"]) > 0
    assert len(gen_data["edges"]) > 0
    
    # The exit should be a node
    exit_nodes = [n for n in gen_data["nodes"] if n["node_type"] == "EXIT"]
    assert len(exit_nodes) == 1
    
    # 7. Retrieve Graph
    get_graph_resp = client.get(f"/api/v1/buildings/{imported_b_id}/graph")
    assert get_graph_resp.status_code == 200
    get_graph_data = get_graph_resp.json()
    assert len(get_graph_data["nodes"]) == len(gen_data["nodes"])
    assert len(get_graph_data["edges"]) == len(gen_data["edges"])
