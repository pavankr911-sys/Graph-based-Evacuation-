"use client";

import React, { useMemo, useRef } from "react";
import { useEditorStore } from "@/store/editorStore";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import { Room, Wall, Exit, Floor } from "@/lib/editor/types";
import * as THREE from "three";

const FLOOR_HEIGHT = 3;

// --- PRE-ALLOCATED STATIC GEOMETRIES (0 runtime allocation) ---
const flameConeGeo = new THREE.ConeGeometry(1, 1, 10);
const flameCoreGeo = new THREE.SphereGeometry(1, 8, 8);
const flameRingGeo = new THREE.RingGeometry(0.05, 1, 16);
const smokeGeo = new THREE.SphereGeometry(1, 6, 6);
const agentCylinderGeo = new THREE.CylinderGeometry(0.2, 0.2, 1, 8);
const stairBoxGeo = new THREE.BoxGeometry(1.5, 3.0, 1.5);

// --- PRE-ALLOCATED REUSABLE FLAME MATERIALS (Additive blending, depthWrite=false) ---
const outerFlameMat = new THREE.MeshBasicMaterial({
  color: "#ea580c",
  transparent: true,
  opacity: 0.25,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  side: THREE.DoubleSide,
});

const midFlameMat = new THREE.MeshBasicMaterial({
  color: "#f59e0b",
  transparent: true,
  opacity: 0.42,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  side: THREE.DoubleSide,
});

const innerFlameMat = new THREE.MeshBasicMaterial({
  color: "#fde047",
  transparent: true,
  opacity: 0.65,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});

const coreFlameMat = new THREE.MeshBasicMaterial({
  color: "#ffffff",
  transparent: true,
  opacity: 0.85,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});

const smokeMat = new THREE.MeshBasicMaterial({
  color: "#334155",
  transparent: true,
  opacity: 0.15,
  depthWrite: false,
});

const groundGlowMat = new THREE.MeshBasicMaterial({
  color: "#f97316",
  transparent: true,
  opacity: 0.3,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});

const stairMaterial = new THREE.MeshStandardMaterial({
  color: "#8b5cf6",
  transparent: true,
  opacity: 0.65,
});

const doorMaterial = new THREE.MeshStandardMaterial({
  color: "#f59e0b",
  transparent: true,
  opacity: 0.6,
});

const exitMaterial = new THREE.MeshStandardMaterial({
  color: "#10b981",
  transparent: true,
  opacity: 0.6,
});

const agentMaterials: Record<string, THREE.MeshStandardMaterial> = {
  ADULT: new THREE.MeshStandardMaterial({ color: "#3498db" }),
  ELDERLY: new THREE.MeshStandardMaterial({ color: "#9b59b6" }),
  CHILD: new THREE.MeshStandardMaterial({ color: "#f1c40f" }),
  DISABLED: new THREE.MeshStandardMaterial({ color: "#e74c3c" }),
};

const exitedAgentMaterial = new THREE.MeshStandardMaterial({
  color: "#10b981",
  roughness: 0.3,
  metalness: 0.1,
});

// --- STATIC MULTI-STORY BUILDING STRUCTURE (Renders all floors stacked vertically or active floor) ---
const BuildingStructure = React.memo(function BuildingStructure({
  floors,
  allElements,
  isStacked,
  activeFloorId,
  buildingBounds,
}: {
  floors: Floor[];
  allElements: any[];
  isStacked: boolean;
  activeFloorId: string | null;
  buildingBounds: { minX: number; maxX: number; minY: number; maxY: number };
}) {
  const renderedFloors = isStacked
    ? floors
    : floors.filter((f) => f.id === activeFloorId);

  return (
    <group>
      {renderedFloors.map((floor) => {
        const floorNumber = floor.floor_number;
        const floorElevation = floorNumber * FLOOR_HEIGHT;
        const floorElements = allElements.filter((el) => el.floor_id === floor.id);
        const isActive = floor.id === activeFloorId;

        return (
          <group key={`floor-3d-${floor.id}`}>
            {/* Multi-story Floor Slab / Foundation Plate */}
            {buildingBounds.minX !== Infinity && (
              <mesh
                position={[
                  (buildingBounds.minX + buildingBounds.maxX) / 2,
                  floorElevation - 0.05,
                  (buildingBounds.minY + buildingBounds.maxY) / 2,
                ]}
              >
                <boxGeometry
                  args={[
                    Math.max(12, buildingBounds.maxX - buildingBounds.minX + 4),
                    0.1,
                    Math.max(12, buildingBounds.maxY - buildingBounds.minY + 4),
                  ]}
                />
                <meshStandardMaterial
                  color={isActive ? "#334155" : "#1e293b"}
                  roughness={0.7}
                  transparent
                  opacity={isActive ? 0.85 : 0.55}
                />
              </mesh>
            )}

            {/* Rooms */}
            {floorElements
              .filter((e) => e.type === "ROOM")
              .map((el) => {
                const room = el as Room;
                const coords = room.geometry?.coordinates || [];
                if (coords.length < 3) return null;

                const shape = new THREE.Shape();
                shape.moveTo(coords[0].x, coords[0].y);
                for (let i = 1; i < coords.length; i++) {
                  shape.lineTo(coords[i].x, coords[i].y);
                }
                shape.closePath();

                return (
                  <mesh
                    key={el.id}
                    rotation={[Math.PI / 2, 0, 0]}
                    position={[0, floorElevation + 0.01, 0]}
                  >
                    <shapeGeometry args={[shape]} />
                    <meshStandardMaterial
                      color={isActive ? "#3b82f6" : "#60a5fa"}
                      transparent
                      opacity={isActive ? 0.3 : 0.15}
                      side={THREE.DoubleSide}
                    />
                  </mesh>
                );
              })}

            {/* Walls */}
            {floorElements
              .filter((e) => e.type === "WALL")
              .map((el) => {
                const wall = el as Wall;
                const length = Math.hypot(wall.end_x - wall.start_x, wall.end_y - wall.start_y);
                const cx = (wall.start_x + wall.end_x) / 2;
                const cy = (wall.start_y + wall.end_y) / 2;
                const angle = Math.atan2(wall.end_y - wall.start_y, wall.end_x - wall.start_x);

                return (
                  <mesh
                    key={el.id}
                    position={[cx, floorElevation + 1.5, cy]}
                    rotation={[0, -angle, 0]}
                  >
                    <boxGeometry args={[length, 3, 0.2]} />
                    <meshStandardMaterial
                      color={isActive ? "#94a3b8" : "#64748b"}
                      transparent={!isActive && isStacked}
                      opacity={!isActive && isStacked ? 0.65 : 1.0}
                    />
                  </mesh>
                );
              })}

            {/* Doors & Exits */}
            {floorElements
              .filter((e) => ["DOOR", "EXIT"].includes(e.type))
              .map((el) => {
                const isExit = el.type === "EXIT";
                return (
                  <mesh
                    key={el.id}
                    position={[el.position_x, floorElevation + 1.25, el.position_y]}
                    material={isExit ? exitMaterial : doorMaterial}
                  >
                    <boxGeometry args={[el.width_meters || 1, 2.5, 0.3]} />
                  </mesh>
                );
              })}

            {/* Stairs - Vertical Multi-Floor Shaft Block */}
            {floorElements
              .filter((e) => e.type === "STAIR")
              .map((el) => (
                <group key={el.id} position={[el.position_x, floorElevation + 1.5, el.position_y]}>
                  <mesh geometry={stairBoxGeo} material={stairMaterial} />
                  <mesh position={[0, 0, 0]}>
                    <boxGeometry args={[1.52, 0.12, 1.52]} />
                    <meshBasicMaterial color="#c084fc" />
                  </mesh>
                </group>
              ))}
          </group>
        );
      })}
    </group>
  );
});

// --- SINGLE FAST FLAME NODE ---
function FastFlame({
  x,
  y,
  z,
  intensity = 1.0,
  heightScale = 1.3,
}: {
  x: number;
  y: number;
  z: number;
  intensity?: number;
  heightScale?: number;
}) {
  const r = 0.55 * Math.max(0.4, intensity);
  const h = heightScale * Math.max(0.4, intensity);

  return (
    <group position={[x, y, z]}>
      {/* Ground heat ring */}
      <mesh
        geometry={flameRingGeo}
        material={groundGlowMat}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.02, 0]}
        scale={[r * 1.15, r * 1.15, 1]}
      />
      {/* Outer translucent flame veil */}
      <mesh
        geometry={flameConeGeo}
        material={outerFlameMat}
        position={[0, h * 0.48, 0]}
        scale={[r * 0.95, h, r * 0.95]}
      />
      {/* Mid dancing plume */}
      <mesh
        geometry={flameConeGeo}
        material={midFlameMat}
        position={[0, h * 0.42, 0]}
        rotation={[0, Math.PI / 4, 0]}
        scale={[r * 0.65, h * 0.85, r * 0.65]}
      />
      {/* Inner luminous tongue */}
      <mesh
        geometry={flameConeGeo}
        material={innerFlameMat}
        position={[0, h * 0.34, 0]}
        scale={[r * 0.42, h * 0.62, r * 0.42]}
      />
      {/* Incandescent white core */}
      <mesh
        geometry={flameCoreGeo}
        material={coreFlameMat}
        position={[0, h * 0.18, 0]}
        scale={[r * 0.24, r * 0.24, r * 0.24]}
      />
      {/* Faint smoke */}
      {intensity > 0.4 && (
        <mesh
          geometry={smokeGeo}
          material={smokeMat}
          position={[0, h * 1.05, 0]}
          scale={[r * 0.35, r * 0.35, r * 0.35]}
        />
      )}
    </group>
  );
}

// --- GLOBAL MASTER FLAME LIGHTING CONTROLLER ---
function AnimatedFlamesContainer({
  children,
  centerX,
  centerY,
  hasFlames,
}: {
  children: React.ReactNode;
  centerX: number;
  centerY: number;
  hasFlames: boolean;
}) {
  const lightRef = useRef<THREE.PointLight>(null);

  // Subtle ambient flicker on the cast light only; flame meshes remain firmly grounded
  useFrame((state) => {
    if (!hasFlames) return;
    const t = state.clock.getElapsedTime() * 4.0;
    if (lightRef.current) {
      lightRef.current.intensity = 2.0 * (0.88 + 0.16 * Math.sin(t * 2.5) + 0.08 * Math.cos(t * 4.1));
    }
  });

  return (
    <group>
      {children}
      {hasFlames && (
        <pointLight
          ref={lightRef}
          color="#f97316"
          intensity={2.0}
          distance={18}
          decay={2}
          position={[centerX, 2.5, centerY]}
        />
      )}
    </group>
  );
}

// --- AGENT MESH WITH SHARED GEOMETRY ---
function AgentMesh({
  agent,
  activeFloorNumber,
}: {
  agent: any;
  activeFloorNumber: number;
}) {
  const isExited = agent.status === "EXITED";
  const h = agent.profile === "CHILD" ? 1.2 : 1.7;
  const mat = isExited ? exitedAgentMaterial : (agentMaterials[agent.profile] || agentMaterials.ADULT);

  return (
    <mesh
      position={[agent.x, (isExited ? 0 : activeFloorNumber) * FLOOR_HEIGHT + h / 2, agent.y]}
      geometry={agentCylinderGeo}
      material={mat}
      scale={[1, h, 1]}
    />
  );
}

export function EditorCanvas3D() {
  const {
    activeFloorId,
    floors,
    getCurrentElements,
    simulationRun,
    playbackFrameIndex,
    showExitIntelligence,
    is3DStackedView,
    setIs3DStackedView,
    activeTool,
    setActiveTool,
  } = useEditorStore();

  const allElements = getCurrentElements();
  const elements = allElements.filter((el) => el.floor_id === activeFloorId);
  const activeFloor = floors.find((f) => f.id === activeFloorId);
  const activeFloorNumber = activeFloor ? activeFloor.floor_number : 0;

  const currentFrame = simulationRun?.results?.frames?.[playbackFrameIndex];

  // Building bounding box calculation across all floors
  const buildingBounds = useMemo(() => {
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    allElements.forEach((el) => {
      const eAny = el as any;
      if ("position_x" in eAny) {
        minX = Math.min(minX, eAny.position_x);
        maxX = Math.max(maxX, eAny.position_x);
        minY = Math.min(minY, eAny.position_y);
        maxY = Math.max(maxY, eAny.position_y);
      } else if ("start_x" in eAny) {
        minX = Math.min(minX, eAny.start_x, eAny.end_x);
        maxX = Math.max(maxX, eAny.start_x, eAny.end_x);
        minY = Math.min(minY, eAny.start_y, eAny.end_y);
        maxY = Math.max(maxY, eAny.start_y, eAny.end_y);
      } else if ("geometry" in eAny && eAny.geometry?.coordinates) {
        eAny.geometry.coordinates.forEach((c: any) => {
          minX = Math.min(minX, c.x);
          maxX = Math.max(maxX, c.x);
          minY = Math.min(minY, c.y);
          maxY = Math.max(maxY, c.y);
        });
      }
    });
    return {
      minX,
      maxX,
      minY,
      maxY,
      cx: minX !== Infinity ? (minX + maxX) / 2 : 25,
      cy: minY !== Infinity ? (minY + maxY) / 2 : 15,
    };
  }, [allElements]);

  const { cx, cy } = buildingBounds;

  const placedHazards = useMemo(() => {

    const hazards = is3DStackedView

      ? allElements.filter((e) => e.type === "HAZARD")

      : elements.filter((e) => e.type === "HAZARD");

    return hazards.map((h: any) => {

      const fl = floors.find((f) => f.id === h.floor_id);

      const floorNum = fl !== undefined ? fl.floor_number : activeFloorNumber;

      return { ...h, floor_number: floorNum };

    });

  }, [allElements, elements, is3DStackedView, floors, activeFloorNumber]);
  const simHazards = currentFrame?.hazards || [];
  const hasFlames = placedHazards.length > 0 || simHazards.length > 0;

  // Sort floor exits deterministically (left to right, top to bottom) matching 2D and HUD
  const floorExits = useMemo(() => {
    return (elements.filter((e) => e.type === "EXIT") as Exit[])
      .sort((a, b) => a.position_x !== b.position_x ? a.position_x - b.position_x : a.position_y - b.position_y);
  }, [elements]);

  // Compute live 3D exit beacon status
  const exit3DStats = useMemo(() => {
    if (!currentFrame || floorExits.length === 0) return [];
    const activeAgents = currentFrame.agents?.filter(
      (a: any) => a.floor_number === activeFloorNumber && a.status !== "EXITED" && a.status !== "TRAPPED"
    ) || [];

    return floorExits.map((ex, idx) => {
      const tag = String.fromCharCode(65 + idx);
      const targeting = activeAgents.filter((a: any) => {
        if (a.target_exit_id && a.target_exit_id === ex.id) return true;
        let closestDist = Infinity;
        let closestId = null;
        for (const other of floorExits) {
          const d = Math.hypot(a.x - other.position_x, a.y - other.position_y);
          if (d < closestDist) {
            closestDist = d;
            closestId = other.id;
          }
        }
        return closestId === ex.id;
      });

      const q = targeting.length;
      const isBottleneck = q >= 7;
      const color = isBottleneck ? "#ef4444" : q >= 3 ? "#f59e0b" : "#10b981";
      return { id: ex.id, tag, x: ex.position_x, y: ex.position_y, queue: q, color, isBottleneck };
    });
  }, [currentFrame, floorExits, activeFloorNumber]);

  const bottleneckCount = exit3DStats.filter(e => e.isBottleneck).length;

  return (
    <div className="flex-1 relative bg-slate-900 cursor-move">
      <Canvas
        camera={{ position: [cx, 22, cy + 22], fov: 50 }}
        gl={{ powerPreference: "high-performance", antialias: true }}
      >
        <color attach="background" args={["#0f172a"]} />
        <ambientLight intensity={0.65} />
        <directionalLight position={[cx + 15, 25, cy + 15]} intensity={1.0} />

        {/* Lightweight 1-Draw-Call Native Grid */}
        <gridHelper
          args={[100, 50, "#475569", "#1e293b"]}
          position={[0, activeFloorNumber * FLOOR_HEIGHT, 0]}
        />

        {/* 1. Multi-Story Building Structure (Stack of all floors or isolated active floor) */}
        <BuildingStructure
          floors={floors}
          allElements={allElements}
          isStacked={is3DStackedView}
          activeFloorId={activeFloorId}
          buildingBounds={buildingBounds}
        />

        {/* 2. Optimized Animated Flames (1 shared animation loop, 0 runtime GPU allocations) */}
        <AnimatedFlamesContainer
          centerX={cx}
          centerY={cy}
          hasFlames={hasFlames}
        >
          {/* User-Placed Fire Hazards (Pre-simulation) */}
          {placedHazards.map((el: any) => (
            <group key={el.id} position={[el.position_x, el.floor_number * FLOOR_HEIGHT, el.position_y]}>
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
                <circleGeometry args={[0.9, 24]} />
                <meshBasicMaterial color="#ef4444" transparent opacity={0.4} />
              </mesh>
              <FastFlame
                x={0}
                y={0}
                z={0}
                intensity={el.intensity || 1.0}
                heightScale={1.5}
              />
            </group>
          ))}

          {/* Dynamic Simulation Live Fire Spread (Multi-story accurate elevation) */}
          {simHazards.map((h: any) => (
            <FastFlame
              key={`sim-hazard-${h.node_id}`}
              x={h.x}
              y={(h.floor_number !== undefined ? h.floor_number : activeFloorNumber) * FLOOR_HEIGHT}
              z={h.y}
              intensity={Math.max(0.2, h.intensity || 0.5)}
              heightScale={1.2}
            />
          ))}
        </AnimatedFlamesContainer>

        {/* 3. Moving Multi-Story Agents (Descending stairs across floors to ground exits & outdoor assembly) */}
        {currentFrame &&
          currentFrame.agents
            .filter(
              (a: any) =>
                a.status === "EXITED" ||
                is3DStackedView ||
                a.floor_number === activeFloorNumber
            )
            .map((agent: any) => (
              <AgentMesh
                key={agent.id}
                agent={agent}
                activeFloorNumber={agent.floor_number ?? activeFloorNumber}
              />
            ))}

        {/* 4. Outdoor Evacuation Assembly / Gathering Zone */}
        {simulationRun && (
          (() => {
            const ap = simulationRun?.results?.assembly_point || {
              x: (buildingBounds.minX + buildingBounds.maxX) / 2,
              y: buildingBounds.maxY + 7.5,
              radius: 4.5
            };
            const exitedCount = currentFrame?.agents?.filter((a: any) => a.status === "EXITED").length || 0;

            return (
              <group position={[ap.x, 0.05, ap.y]}>
                {/* Ground Disc Pad */}
                <mesh rotation={[-Math.PI / 2, 0, 0]}>
                  <circleGeometry args={[ap.radius || 4.5, 32]} />
                  <meshBasicMaterial color="#10b981" transparent opacity={0.16} />
                </mesh>
                {/* Outer Border Ring */}
                <mesh rotation={[-Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[(ap.radius || 4.5) - 0.15, ap.radius || 4.5, 32]} />
                  <meshBasicMaterial color="#10b981" transparent opacity={0.8} />
                </mesh>
                {/* Center Beacon Pillar */}
                <mesh position={[0, 1.0, 0]}>
                  <cylinderGeometry args={[0.08, 0.08, 2.0, 12]} />
                  <meshStandardMaterial color="#059669" />
                </mesh>
                <mesh position={[0, 2.1, 0]}>
                  <sphereGeometry args={[0.25, 16, 16]} />
                  <meshBasicMaterial color="#34d399" />
                </mesh>

                {/* Floating 3D Assembly Area Sign */}
                <Html position={[0, 2.6, 0]} center distanceFactor={28}>
                  <div className="bg-emerald-950/90 text-emerald-100 font-bold text-xs px-3 py-1 rounded-full shadow-2xl border border-emerald-400 whitespace-nowrap flex items-center space-x-2 backdrop-blur-md pointer-events-none select-none">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="tracking-wide text-white">ASSEMBLY POINT (MUSTER ZONE)</span>
                    {exitedCount > 0 && (
                      <span className="bg-emerald-700 text-white font-mono px-2 py-0.5 rounded-full text-[10px]">
                        👥 {exitedCount} SAFE
                      </span>
                    )}
                  </div>
                </Html>
              </group>
            );
          })()
        )}

        {/* Dynamic 3D Exit Status Beacons & Floating HTML Tags */}
        {floorExits.map((ex, idx) => {
          const stat = exit3DStats.find(s => s.id === ex.id);
          const tag = stat?.tag || String.fromCharCode(65 + idx);
          const color = stat?.color || "#10b981";
          const isBottleneck = stat?.isBottleneck || false;
          const queue = stat?.queue || 0;

          return (
            <group key={`exit-beacon-${ex.id}`} position={[ex.position_x, activeFloorNumber * FLOOR_HEIGHT + 3.2, ex.position_y]}>
              <mesh>
                <sphereGeometry args={[0.28, 12, 12]} />
                <meshBasicMaterial color={color} />
              </mesh>
              <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.38, 0.55, 16]} />
                <meshBasicMaterial color={color} transparent opacity={0.65} side={THREE.DoubleSide} />
              </mesh>

              {/* Floating 3D Exit Identifier Badge */}
              <Html position={[0, 0.8, 0]} center distanceFactor={20}>
                <div className={`px-2 py-0.5 rounded-full text-xs font-bold font-mono shadow-xl border flex items-center space-x-1.5 backdrop-blur-md pointer-events-none select-none transition-all ${
                  isBottleneck
                    ? "bg-red-950/90 text-red-100 border-red-500 animate-pulse ring-2 ring-red-500/50"
                    : "bg-slate-950/90 text-emerald-300 border-emerald-500/80"
                }`}>
                  <span className={`w-2 h-2 rounded-full ${isBottleneck ? "bg-red-400" : "bg-emerald-400"}`} />
                  <span className="tracking-wide text-white">EXIT {tag}</span>
                  {showExitIntelligence && simulationRun && queue > 0 && (
                    <span className="text-amber-300 bg-slate-800 px-1.5 py-0.2 rounded text-[10px]">
                      👥 {queue}
                    </span>
                  )}
                </div>
              </Html>
            </group>
          );
        })}

        <OrbitControls makeDefault target={[cx, activeFloorNumber * FLOOR_HEIGHT, cy]} />
      </Canvas>

      {/* HUD Info */}
      <div className="absolute bottom-4 left-4 bg-slate-800/90 backdrop-blur-sm px-3.5 py-2 rounded-md shadow-lg border border-slate-700 text-xs text-slate-300 font-mono flex items-center space-x-3 z-10">
        <button
          onClick={() => setIs3DStackedView(!is3DStackedView)}
          className={`px-2.5 py-1 rounded text-xs font-semibold font-sans border transition-all flex items-center space-x-1 cursor-pointer ${
            is3DStackedView
              ? "bg-indigo-600 text-white border-indigo-500 shadow"
              : "bg-slate-700 text-slate-200 border-slate-600 hover:bg-slate-600"
          }`}
          title="Toggle Multi-Story Stacked Building vs Active Floor Only"
        >
          <span>{is3DStackedView ? "🏢 Multi-Story Stack (All Floors)" : "🔍 Active Floor Only"}</span>
        </button>
        <span className="text-slate-400">|</span>
        <span>{floors.length} Floors Total</span>
        <span className="text-slate-400">|</span>
        {placedHazards.length > 0 && !simulationRun && (
          <span className="text-orange-400 font-semibold flex items-center">
            🔥 {placedHazards.length} Placed Ignition Sources
          </span>
        )}
        {simHazards.length > 0 && (
          <span className="text-amber-400 font-semibold flex items-center">
            🔥 {simHazards.length} Active Fire Zones
          </span>
        )}
        {showExitIntelligence && floorExits.length > 0 && (
          <span className={`font-semibold flex items-center ${bottleneckCount > 0 ? "text-red-400 animate-pulse" : "text-emerald-400"}`}>
            🚪 {floorExits.length} Exits ({bottleneckCount > 0 ? `⚠️ ${bottleneckCount} Bottleneck` : "All Flowing"})
          </span>
        )}
      </div>
    </div>
  );
}
