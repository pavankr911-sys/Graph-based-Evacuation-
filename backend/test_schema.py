
from app.schemas.export import BuildingExport

payload = {
    "name": "Test",
    "total_floors": 1,
    "floors": [{
        "floor_number": 0,
        "name": "Ground",
        "width_meters": 100,
        "height_meters": 100,
        "grid_cell_size": 0.5,
        "rooms": [{
            "name": "Room 1",
            "room_type": "OFFICE",
            "geometry": {}
        }],
        "walls": [{
            "start_x": 0,
            "start_y": 0,
            "end_x": 10,
            "end_y": 10,
            "is_combustible": False
        }],
        "doors": [{
            "position_x": 5,
            "position_y": 5,
            "width_meters": 1,
            "is_open": True
        }],
        "stairs": [{
            "position_x": 1,
            "position_y": 1,
            "width_meters": 2,
            "is_upward": True
        }],
        "exits": [{
            "position_x": 10,
            "position_y": 10,
            "width_meters": 2,
            "discharge_rate": 1,
            "is_usable": True
        }]
    }]
}

try:
    b = BuildingExport.model_validate(payload)
    print("VALIDATION SUCCESS!")
except Exception as e:
    print("ERROR:")
    print(e)

