"use client";

import { useEditorStore } from "@/store/editorStore";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import { Room, Wall, Door, Stair, Exit } from "@/lib/editor/types";
import * as THREE from "three";
import { useMemo } from "react";

const FLOOR_HEIGHT = 3;

function RoomMesh({ room, activeFloorNumber }: { room: Room, activeFloorNumber: number }) {
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    if (room.geometry.coordinates.length < 3) return s;
    s.moveTo(room.geometry.coordinates[0].x, room.geometry.coordinates[0].y);
    for (let i = 1; i < room.geometry.coordinates.length; i++) {
      s.lineTo(room.geometry.coordinates[i].x, room.geometry.coordinates[i].y);
    }
    s.closePath();
    return s;
  }, [room]);

  return (
    <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, activeFloorNumber * FLOOR_HEIGHT + 0.01, 0]}>
      <shapeGeometry args={[shape]} />
      <meshStandardMaterial color="#3b82f6" transparent opacity={0.2} side={THREE.DoubleSide} />
    </mesh>
  );
}

function WallMesh({ wall, activeFloorNumber }: { wall: Wall, activeFloorNumber: number }) {
  const length = Math.hypot(wall.end_x - wall.start_x, wall.end_y - wall.start_y);
  const cx = (wall.start_x + wall.end_x) / 2;
  const cy = (wall.start_y + wall.end_y) / 2;
  const angle = Math.atan2(wall.end_y - wall.start_y, wall.end_x - wall.start_x);

  return (
    <mesh 
      position={[cx, activeFloorNumber * FLOOR_HEIGHT + 1.5, cy]} 
      rotation={[0, -angle, 0]}
    >
      <boxGeometry args={[length, 3, 0.2]} />
      <meshStandardMaterial color="#94a3b8" />
    </mesh>
  );
}

function AgentMesh({ agent, activeFloorNumber }: { agent: any, activeFloorNumber: number }) {
  let color = "#3498db";
  if (agent.profile === "ELDERLY") color = "#9b59b6";
  else if (agent.profile === "CHILD") color = "#f1c40f";
  else if (agent.profile === "DISABLED") color = "#e74c3c";
  
  // Height of agent based on profile (for visual variety)
  const h = agent.profile === "CHILD" ? 1.2 : 1.7;

  return (
    <mesh position={[agent.x, activeFloorNumber * FLOOR_HEIGHT + h/2, agent.y]}>
      <cylinderGeometry args={[0.2, 0.2, h, 8]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

export function EditorCanvas3D() {
  const { 
    activeFloorId, floors, getCurrentElements,
    simulationRun, playbackFrameIndex
  } = useEditorStore();

  const elements = getCurrentElements().filter(el => el.floor_id === activeFloorId);
  const activeFloor = floors.find(f => f.id === activeFloorId);
  const activeFloorNumber = activeFloor ? activeFloor.floor_number : 0;

  const currentFrame = simulationRun?.results?.frames?.[playbackFrameIndex];

  // Calculate center of all elements to point camera
  let cx = 0;
  let cy = 0;
  if (elements.length > 0) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    elements.forEach(el => {
      const eAny = el as any;
      if ('position_x' in eAny) {
        minX = Math.min(minX, eAny.position_x); maxX = Math.max(maxX, eAny.position_x);
        minY = Math.min(minY, eAny.position_y); maxY = Math.max(maxY, eAny.position_y);
      } else if ('start_x' in eAny) {
        minX = Math.min(minX, eAny.start_x, eAny.end_x); maxX = Math.max(maxX, eAny.start_x, eAny.end_x);
        minY = Math.min(minY, eAny.start_y, eAny.end_y); maxY = Math.max(maxY, eAny.start_y, eAny.end_y);
      } else if ('geometry' in eAny && eAny.geometry?.coordinates) {
        eAny.geometry.coordinates.forEach((c: any) => {
          minX = Math.min(minX, c.x); maxX = Math.max(maxX, c.x);
          minY = Math.min(minY, c.y); maxY = Math.max(maxY, c.y);
        });
      }
    });
    if (minX !== Infinity) {
      cx = (minX + maxX) / 2;
      cy = (minY + maxY) / 2;
    }
  }

  return (
    <div className="flex-1 relative bg-slate-900 cursor-move">
      <Canvas camera={{ position: [cx, 20, cy + 20], fov: 50 }}>
        <color attach="background" args={["#0f172a"]} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[cx + 10, 20, cy + 10]} intensity={1} castShadow />
        
        <Grid 
          position={[0, activeFloorNumber * FLOOR_HEIGHT, 0]} 
          args={[100, 100]} 
          cellColor="#334155" 
          sectionColor="#475569" 
          fadeDistance={50} 
        />

        {elements.filter(e => e.type === "ROOM").map(el => (
          <RoomMesh key={el.id} room={el as Room} activeFloorNumber={activeFloorNumber} />
        ))}

        {elements.filter(e => e.type === "WALL").map(el => (
          <WallMesh key={el.id} wall={el as Wall} activeFloorNumber={activeFloorNumber} />
        ))}

        {elements.filter(e => ["DOOR", "EXIT"].includes(e.type)).map(el => {
          const eAny = el as any;
          const isExit = el.type === "EXIT";
          return (
            <mesh key={el.id} position={[eAny.position_x, activeFloorNumber * FLOOR_HEIGHT + 1.5, eAny.position_y]}>
              <boxGeometry args={[eAny.width_meters || 1, 2.5, 0.3]} />
              <meshStandardMaterial color={isExit ? "#10b981" : "#f59e0b"} transparent opacity={0.5} />
            </mesh>
          );
        })}

        {currentFrame && currentFrame.agents
          .filter((a: any) => a.floor_number === activeFloorNumber && a.status !== "EXITED")
          .map((agent: any) => (
            <AgentMesh key={agent.id} agent={agent} activeFloorNumber={activeFloorNumber} />
        ))}

        <OrbitControls makeDefault target={[cx, activeFloorNumber * FLOOR_HEIGHT, cy]} />
      </Canvas>
      
      {/* HUD Info */}
      <div className="absolute bottom-4 left-4 bg-slate-800/80 backdrop-blur-sm px-3 py-1.5 rounded-md shadow-sm border border-slate-700 text-xs text-slate-300 font-mono">
        3D Preview Mode | Orbit: Left Click | Pan: Right Click
      </div>
    </div>
  );
}

