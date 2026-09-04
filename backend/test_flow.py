import httpx
import time
import uuid

API_BASE = "http://localhost:8000/api/v1"
client = httpx.Client(base_url=API_BASE, timeout=60.0)

b_id = str(uuid.uuid4())
f_id = str(uuid.uuid4())
r_id = str(uuid.uuid4())
w_id = str(uuid.uuid4())
d_id = str(uuid.uuid4())
e_id = str(uuid.uuid4())

payload = {
    "id": b_id,
    "name": "E2E Test Building",
    "total_floors": 1,
    "floors": [{
        "id": f_id,
        "building_id": b_id,
        "floor_number": 0,
        "name": "Ground",
        "width_meters": 100,
        "height_meters": 100,
        "grid_cell_size": 0.5,
        "rooms": [{
            "id": r_id,
            "floor_id": f_id,
            "name": "Room 1",
            "room_type": "OFFICE",
            "geometry": {"coordinates": [{"x": 0, "y": 0}, {"x": 10, "y": 0}, {"x": 10, "y": 10}, {"x": 0, "y": 10}]}
        }],
        "walls": [{
            "id": w_id,
            "floor_id": f_id,
            "start_x": 0,
            "start_y": 0,
            "end_x": 10,
            "end_y": 10,
            "is_combustible": False
        }],
        "doors": [{
            "id": d_id,
            "floor_id": f_id,
            "position_x": 5,
            "position_y": 10,
            "width_meters": 1,
            "is_open": True
        }],
        "stairs": [],
        "exits": [{
            "id": e_id,
            "floor_id": f_id,
            "position_x": 10,
            "position_y": 5,
            "width_meters": 2,
            "discharge_rate": 1,
            "is_usable": True
        }]
    }]
}

print("1. Importing building...")
resp = client.post("/buildings/import", json=payload)
if resp.status_code != 201:
    print(f"FAILED IMPORT: {resp.text}")
    exit(1)
building_id = resp.json()["id"]
print(f"Imported building: {building_id}")

print("2. Generating graph...")
resp = client.post(f"/buildings/{building_id}/generate-graph")
if resp.status_code != 200:
    print(f"FAILED GRAPH: {resp.text}")
    exit(1)
graph = resp.json()
print(f"Generated graph with {len(graph['nodes'])} nodes")

print("3. Starting Simulation...")
resp = client.post(f"/buildings/{building_id}/simulations", json={
    "occupant_count": 20,
    "tick_rate_hz": 5,
    "max_time_sec": 60
})
if resp.status_code not in (200, 201):
    print(f"FAILED SIM: {resp.text}")
    exit(1)
sim_id = resp.json()["id"]

print("4. Polling simulation status...")
for _ in range(10):
    resp = client.get(f"/buildings/simulations/{sim_id}")
    status = resp.json()["status"]
    if status in ["COMPLETED", "FAILED"]:
        break
    time.sleep(1)

if status == "COMPLETED":
    print(f"Simulation completed with {len(resp.json()['results']['frames'])} frames!")
else:
    print("Simulation failed!")
