import { v4 as uuidv4 } from "uuid";
import { Floor, Room, Wall, Door, Stair, Exit } from "./types";

export function createSampleAcademicBuilding(): {
  buildingId: string;
  buildingName: string;
  floors: Floor[];
  elements: any[];
} {
  const buildingId = uuidv4();
  const floor0Id = uuidv4();
  const floor1Id = uuidv4();

  const floors: Floor[] = [
    {
      id: floor0Id,
      floor_number: 0,
      name: "Ground Floor",
      grid_resolution: 0.5,
    },
    {
      id: floor1Id,
      floor_number: 1,
      name: "Level 1 (Upper Floor)",
      grid_resolution: 0.5,
    },
  ];

  const elements: any[] = [];

  // ==========================================
  // LEVEL 0: GROUND FLOOR
  // ==========================================
  // Outer boundary walls: 24m wide (x: 2 to 26), 16m tall (y: 2 to 18)
  const f0OuterWalls = [
    { start_x: 2, start_y: 2, end_x: 26, end_y: 2 }, // Top
    { start_x: 26, start_y: 2, end_x: 26, end_y: 18 }, // Right
    { start_x: 26, start_y: 18, end_x: 2, end_y: 18 }, // Bottom
    { start_x: 2, start_y: 18, end_x: 2, end_y: 2 }, // Left
    // Central Corridor Horizontals: Corridor runs from x:2 to 26, y: 9 to 11 (2m wide)
    { start_x: 2, start_y: 9, end_x: 26, end_y: 9 }, // Corridor North Wall
    { start_x: 2, start_y: 11, end_x: 26, end_y: 11 }, // Corridor South Wall
    // Room Dividing Partitions (North Wing)
    { start_x: 14, start_y: 2, end_x: 14, end_y: 9 },
    // Room Dividing Partitions (South Wing)
    { start_x: 14, start_y: 11, end_x: 14, end_y: 18 },
  ];

  f0OuterWalls.forEach((w) => {
    elements.push({
      id: uuidv4(),
      floor_id: floor0Id,
      type: "WALL",
      start_x: w.start_x,
      start_y: w.start_y,
      end_x: w.end_x,
      end_y: w.end_y,
      is_combustible: false,
    } as Wall);
  });

  // Rooms (Ground Floor)
  const f0Rooms = [
    {
      name: "Lecture Hall 101",
      coords: [{ x: 2, y: 2 }, { x: 14, y: 2 }, { x: 14, y: 9 }, { x: 2, y: 9 }],
    },
    {
      name: "Computer Science Lab",
      coords: [{ x: 14, y: 2 }, { x: 26, y: 2 }, { x: 26, y: 9 }, { x: 14, y: 9 }],
    },
    {
      name: "Administrative Office",
      coords: [{ x: 2, y: 11 }, { x: 14, y: 11 }, { x: 14, y: 18 }, { x: 2, y: 18 }],
    },
    {
      name: "Seminar Hall",
      coords: [{ x: 14, y: 11 }, { x: 26, y: 11 }, { x: 26, y: 18 }, { x: 14, y: 18 }],
    },
  ];

  f0Rooms.forEach((r) => {
    elements.push({
      id: uuidv4(),
      floor_id: floor0Id,
      type: "ROOM",
      name: r.name,
      room_type: "academic",
      geometry: { type: "polygon", coordinates: r.coords },
      is_accessible: true,
    } as Room);
  });

  // Doors into Central Corridor (Ground Floor)
  elements.push(
    { id: uuidv4(), floor_id: floor0Id, type: "DOOR", position_x: 8, position_y: 9, width_meters: 1.2, is_open: true } as Door,
    { id: uuidv4(), floor_id: floor0Id, type: "DOOR", position_x: 20, position_y: 9, width_meters: 1.2, is_open: true } as Door,
    { id: uuidv4(), floor_id: floor0Id, type: "DOOR", position_x: 8, position_y: 11, width_meters: 1.2, is_open: true } as Door,
    { id: uuidv4(), floor_id: floor0Id, type: "DOOR", position_x: 20, position_y: 11, width_meters: 1.2, is_open: true } as Door
  );

  // Exterior Discharging Exits (Strictly Ground Floor!)
  // Exit A on West end of corridor, Exit B on East end of corridor
  elements.push(
    { id: uuidv4(), floor_id: floor0Id, type: "EXIT", position_x: 2, position_y: 10, width_meters: 2.0, discharge_rate: 1.5, is_usable: true } as Exit,
    { id: uuidv4(), floor_id: floor0Id, type: "EXIT", position_x: 26, position_y: 10, width_meters: 2.0, discharge_rate: 1.5, is_usable: true } as Exit
  );

  // Central Vertical Staircase Shaft (Discharges into Ground Floor corridor at x: 14, y: 10)
  elements.push({
    id: uuidv4(),
    floor_id: floor0Id,
    type: "STAIR",
    position_x: 14,
    position_y: 10,
    width_meters: 1.5,
    is_upward: false,
  } as Stair);

  // Fire Hazard in West Corridor near Room 101 door (triggers intelligent diversion to Exit B)
  elements.push({
    id: uuidv4(),
    floor_id: floor0Id,
    type: "HAZARD",
    position_x: 6,
    position_y: 10,
    intensity: 1.0,
  } as any);

  // ==========================================
  // LEVEL 1: UPPER FLOOR (Staircase Egress)
  // ==========================================
  // Outer boundary walls match Level 0
  f0OuterWalls.forEach((w) => {
    elements.push({
      id: uuidv4(),
      floor_id: floor1Id,
      type: "WALL",
      start_x: w.start_x,
      start_y: w.start_y,
      end_x: w.end_x,
      end_y: w.end_y,
      is_combustible: false,
    } as Wall);
  });

  // Level 1 Rooms
  const f1Rooms = [
    {
      name: "Engineering Classroom 201",
      coords: [{ x: 2, y: 2 }, { x: 14, y: 2 }, { x: 14, y: 9 }, { x: 2, y: 9 }],
    },
    {
      name: "Electronics Lab 202",
      coords: [{ x: 14, y: 2 }, { x: 26, y: 2 }, { x: 26, y: 9 }, { x: 14, y: 9 }],
    },
    {
      name: "Central Digital Library",
      coords: [{ x: 2, y: 11 }, { x: 14, y: 11 }, { x: 14, y: 18 }, { x: 2, y: 18 }],
    },
    {
      name: "Faculty Conference Room",
      coords: [{ x: 14, y: 11 }, { x: 26, y: 11 }, { x: 26, y: 18 }, { x: 14, y: 18 }],
    },
  ];

  f1Rooms.forEach((r) => {
    elements.push({
      id: uuidv4(),
      floor_id: floor1Id,
      type: "ROOM",
      name: r.name,
      room_type: "academic",
      geometry: { type: "polygon", coordinates: r.coords },
      is_accessible: true,
    } as Room);
  });

  // Level 1 Doors into Corridor
  elements.push(
    { id: uuidv4(), floor_id: floor1Id, type: "DOOR", position_x: 8, position_y: 9, width_meters: 1.2, is_open: true } as Door,
    { id: uuidv4(), floor_id: floor1Id, type: "DOOR", position_x: 20, position_y: 9, width_meters: 1.2, is_open: true } as Door,
    { id: uuidv4(), floor_id: floor1Id, type: "DOOR", position_x: 8, position_y: 11, width_meters: 1.2, is_open: true } as Door,
    { id: uuidv4(), floor_id: floor1Id, type: "DOOR", position_x: 20, position_y: 11, width_meters: 1.2, is_open: true } as Door
  );

  // Central Vertical Staircase Shaft (Aligned EXACTLY with Level 0 shaft at x: 14, y: 10)
  elements.push({
    id: uuidv4(),
    floor_id: floor1Id,
    type: "STAIR",
    position_x: 14,
    position_y: 10,
    width_meters: 1.5,
    is_upward: false,
  } as Stair);

  // NOTICE: No exterior exits on Level 1 (NFPA compliance: upper floor occupants descend via stairs!)

  return {
    buildingId,
    buildingName: "University Academic Wing (2 Floors)",
    floors,
    elements,
  };
}
