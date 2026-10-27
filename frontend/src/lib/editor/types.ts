export type ToolType = "SELECT" | "ROOM" | "WALL" | "DOOR" | "STAIR" | "EXIT" | "HAZARD";

export interface Point {
  x: number;
  y: number;
}

export interface BuildingElement {
  id: string;
  floor_id: string;
}

export interface Room extends BuildingElement {
  type: "ROOM";
  name: string;
  room_type: string;
  geometry: {
    type: "polygon" | "rectangle";
    coordinates: Point[];
  };
  is_accessible: boolean;
}

export interface Wall extends BuildingElement {
  type: "WALL";
  start_x: number;
  start_y: number;
  end_x: number;
  end_y: number;
  is_combustible: boolean;
}

export interface Door extends BuildingElement {
  type: "DOOR";
  position_x: number;
  position_y: number;
  width_meters: number;
  is_open: boolean;
}

export interface Stair extends BuildingElement {
  type: "STAIR";
  position_x: number;
  position_y: number;
  width_meters: number;
  is_upward: boolean;
}

export interface Exit extends BuildingElement {
  type: "EXIT";
  position_x: number;
  position_y: number;
  width_meters: number;
  discharge_rate: number;
  is_usable: boolean;
}

export interface Hazard extends BuildingElement {
  type: "HAZARD";
  position_x: number;
  position_y: number;
  intensity: number;
}

export type EditorElement = Room | Wall | Door | Stair | Exit | Hazard;

export interface Floor {
  id: string;
  name: string;
  floor_number: number;
  grid_resolution: number;
}


export interface GraphNode {
  id: string;
  floor_number: number;
  x: number;
  y: number;
  z: number;
  node_type: string;
  capacity_persons: number;
  base_cost: number;
}

export interface GraphEdge {
  id: string;
  source_node_id: string;
  target_node_id: string;
  length_meters: number;
  max_flow_rate: number;
  width_meters: number;
  bidirectional: boolean;
  base_traversal_time: number;
}

export interface GraphTopology {
  id: string;
  building_id: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}
