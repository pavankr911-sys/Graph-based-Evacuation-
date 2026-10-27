import { EditorElement, Floor, GraphTopology, Room, Wall, Door, Stair, Exit } from "../editor/types";
import { v4 as uuidv4 } from "uuid";

const API_BASE = "http://localhost:8000/api/v1";

export interface BuildingExportPayload {
  id: string;
  name: string;
  total_floors: number;
  floors: FloorExportPayload[];
}

export interface FloorExportPayload {
  id: string;
  building_id: string;
  floor_number: number;
  name: string;
  width_meters: number;
  height_meters: number;
  grid_cell_size: number;
  rooms: any[];
  walls: any[];
  doors: any[];
  stairs: any[];
  exits: any[];
}

export async function loadBuilding(buildingId: string) {
  const response = await fetch(`${API_BASE}/buildings/${buildingId}/export`);
  if (!response.ok) {
    throw new Error(`Failed to load building: ${response.statusText}`);
  }
  return await response.json();
}

export async function saveBuilding(buildingId: string, name: string, floors: Floor[], elements: EditorElement[]) {
  // Fix for legacy 'floor-0' IDs in active browser sessions
  const MAPPED_FLOORS: Record<string, string> = {};
  
  const sanitizedFloors = floors.map(f => {
    let id = f.id;
    if (id === 'floor-0') {
      id = "00000000-0000-0000-0000-000000000000"; // Dummy UUID for legacy floor
      MAPPED_FLOORS[f.id] = id;
    }
    return { ...f, id };
  });

  const sanitizedElements = elements.map(el => {
    let floor_id = el.floor_id;
    if (MAPPED_FLOORS[floor_id]) {
      floor_id = MAPPED_FLOORS[floor_id];
    }
    return { ...el, floor_id };
  });

  // Transform editor state back to BuildingExport payload
  const payload: BuildingExportPayload = {
    id: buildingId,
    name: name,
    total_floors: sanitizedFloors.length,
    floors: sanitizedFloors.map(f => {
      const floorElements = sanitizedElements.filter(el => el.floor_id === f.id);
      let max_x = 10;
      let max_y = 10;
      floorElements.forEach(el => {
        if ('position_x' in el) {
          max_x = Math.max(max_x, (el as any).position_x + 5);
          max_y = Math.max(max_y, (el as any).position_y + 5);
        }
        if ('start_x' in el) {
          max_x = Math.max(max_x, (el as any).start_x + 5, (el as any).end_x + 5);
          max_y = Math.max(max_y, (el as any).start_y + 5, (el as any).end_y + 5);
        }
        if ('geometry' in el && (el as any).geometry?.coordinates) {
          (el as any).geometry.coordinates.forEach((coord: any) => {
             max_x = Math.max(max_x, coord.x + 5);
             max_y = Math.max(max_y, coord.y + 5);
          });
        }
      });
      
      return {
        id: f.id,
        building_id: buildingId,
        floor_number: f.floor_number,
        name: f.name,
        width_meters: Math.ceil(max_x),
        height_meters: Math.ceil(max_y),
        grid_cell_size: f.grid_resolution,
        rooms: floorElements.filter(e => e.type === "ROOM").map(e => {
          const r = e as Room;
          return { id: r.id, floor_id: r.floor_id, name: r.name, room_type: r.room_type, geometry: r.geometry, is_accessible: r.is_accessible };
        }),
        walls: floorElements.filter(e => e.type === "WALL").map(e => {
          const w = e as Wall;
          return { id: w.id, floor_id: w.floor_id, start_x: w.start_x, start_y: w.start_y, end_x: w.end_x, end_y: w.end_y, is_combustible: w.is_combustible };
        }),
        doors: floorElements.filter(e => e.type === "DOOR").map(e => {
          const d = e as Door;
          return { id: d.id, floor_id: d.floor_id, position_x: d.position_x, position_y: d.position_y, width_meters: d.width_meters, is_open: d.is_open };
        }),
        stairs: floorElements.filter(e => e.type === "STAIR").map(e => {
          const s = e as Stair;
          return { id: s.id, floor_id: s.floor_id, position_x: s.position_x, position_y: s.position_y, width_meters: s.width_meters, is_upward: s.is_upward };
        }),
        exits: floorElements.filter(e => e.type === "EXIT").map(e => {
          const ex = e as Exit;
          return { id: ex.id, floor_id: ex.floor_id, position_x: ex.position_x, position_y: ex.position_y, width_meters: ex.width_meters, discharge_rate: ex.discharge_rate, is_usable: ex.is_usable };
        }),
      };
    })
  };

  const response = await fetch(`${API_BASE}/buildings/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("API Validation Error details:", errorText);
    throw new Error(`Failed to save building: ${response.statusText}`);
  }
  return await response.json();
}

export async function generateGraph(buildingId: string): Promise<GraphTopology> {
  const response = await fetch(`${API_BASE}/buildings/${buildingId}/generate-graph`, {
    method: "POST",
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(`Failed to generate graph: ${err.detail || response.statusText}`);
  }
  return await response.json();
}

export async function startSimulation(buildingId: string, payload: any) {
  const response = await fetch(`${API_BASE}/buildings/${buildingId}/simulations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(`Failed to start simulation: ${err.detail || response.statusText}`);
  }
  return await response.json();
}

export async function getSimulation(simId: string) {
  const response = await fetch(`${API_BASE}/buildings/simulations/${simId}`);
  if (!response.ok) {
    const err = await response.json();
    throw new Error(`Failed to fetch simulation: ${err.detail || response.statusText}`);
  }
  return await response.json();
}

export async function getBuildings() {
  const response = await fetch(`${API_BASE}/buildings`);
  if (!response.ok) {
    throw new Error(`Failed to fetch buildings: ${response.statusText}`);
  }
  return await response.json();
}

export async function deleteBuilding(id: string) {
  const response = await fetch(`${API_BASE}/buildings/${id}`, {
    method: "DELETE"
  });
  if (!response.ok) {
    throw new Error(`Failed to delete building: ${response.statusText}`);
  }
  return await response.json();
}

export async function getBuilding(id: string) {
  try {
    const res = await fetch(`${API_BASE}/buildings/${id}/export`);
    if (res.ok) return await res.json();
  } catch (e) {
    // fallback
  }
  const fallback = await fetch(`${API_BASE}/buildings/${id}`);
  if (!fallback.ok) throw new Error("Failed to load building");
  return await fallback.json();
}

export async function compareAlgorithms(buildingId: string, payload: any) {
  const response = await fetch(`${API_BASE}/buildings/${buildingId}/simulations/compare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(`Failed to compare algorithms: ${err.detail || response.statusText}`);
  }
  return await response.json();
}

export async function getLatestComparison() {
  const response = await fetch(`${API_BASE}/buildings/simulations/latest-comparison`);
  if (!response.ok) return null;
  return await response.json();
}

export async function digitizeBlueprint(file: File, widthMeters = 50.0, heightMeters = 30.0, floorId?: string) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("width_meters", widthMeters.toString());
  formData.append("height_meters", heightMeters.toString());
  if (floorId) {
    formData.append("floor_id", floorId);
  }

  const response = await fetch(`${API_BASE}/buildings/digitize-blueprint`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(`Failed to digitize blueprint: ${err.detail || response.statusText}`);
  }
  return await response.json();
}


