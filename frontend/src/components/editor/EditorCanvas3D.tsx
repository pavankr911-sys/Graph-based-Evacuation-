"use client";

import React, { useMemo, useRef, useState, useCallback, useEffect } from "react";
import { useEditorStore } from "@/store/editorStore";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import { Room, Wall, Exit, Floor } from "@/lib/editor/types";
import { ZoomIn, ZoomOut, Maximize2, Layers, Compass, GripHorizontal, RotateCcw } from "lucide-react";
import { useDraggableWidget } from "@/lib/editor/useDraggableWidget";
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

// --- ADVANCED 3D CAMERA CONTROLLER (CURSOR-CENTRIC ZOOM + SMOOTH PRESETS) ---
function AdvancedCameraController({
  cx,
  cy,
  buildingBounds,
  activeFloorNumber,
  bridgeRef,
}: {
  cx: number;
  cy: number;
  buildingBounds: { minX: number; maxX: number; minY: number; maxY: number };
  activeFloorNumber: number;
  bridgeRef: React.MutableRefObject<any>;
}) {
  const { camera, gl, raycaster } = useThree();
  const controlsRef = useRef<any>(null);

  // Transition state for smooth camera gliding
  const transitionRef = useRef({
    active: false,
    desiredCamPos: new THREE.Vector3(),
    desiredTarget: new THREE.Vector3(),
  });

  const activeElevation = activeFloorNumber * FLOOR_HEIGHT;

  const smoothTransition = useCallback(
    (camPos: [number, number, number], target: [number, number, number]) => {
      transitionRef.current.desiredCamPos.set(...camPos);
      transitionRef.current.desiredTarget.set(...target);
      transitionRef.current.active = true;
    },
    []
  );

  const getBuildingSpan = useCallback(() => {
    const spanX =
      buildingBounds.maxX !== -Infinity && buildingBounds.minX !== Infinity
        ? Math.max(16, buildingBounds.maxX - buildingBounds.minX)
        : 30;
    const spanY =
      buildingBounds.maxY !== -Infinity && buildingBounds.minY !== Infinity
        ? Math.max(16, buildingBounds.maxY - buildingBounds.minY)
        : 20;
    return Math.max(spanX, spanY);
  }, [buildingBounds]);

  const fitBuilding = useCallback(() => {
    const span = getBuildingSpan();
    const dist = span * 1.25 + 12;
    smoothTransition(
      [cx + dist * 0.65, activeElevation + dist * 0.85, cy + dist * 0.75],
      [cx, activeElevation, cy]
    );
  }, [cx, cy, activeElevation, getBuildingSpan, smoothTransition]);

  const focusFloor = useCallback(() => {
    const span = getBuildingSpan();
    const dist = span * 0.8 + 8;
    smoothTransition(
      [cx, activeElevation + dist * 0.9, cy + dist * 0.85],
      [cx, activeElevation, cy]
    );
  }, [cx, cy, activeElevation, getBuildingSpan, smoothTransition]);

  const setPreset = useCallback(
    (preset: "iso" | "top" | "front" | "side") => {
      const span = getBuildingSpan();
      const dist = span * 1.1 + 10;
      switch (preset) {
        case "top":
          smoothTransition(
            [cx, activeElevation + dist * 1.4, cy + 0.001],
            [cx, activeElevation, cy]
          );
          break;
        case "front":
          smoothTransition(
            [cx, activeElevation + 5, cy + dist * 1.2],
            [cx, activeElevation, cy]
          );
          break;
        case "side":
          smoothTransition(
            [cx + dist * 1.2, activeElevation + 5, cy],
            [cx, activeElevation, cy]
          );
          break;
        case "iso":
        default:
          fitBuilding();
          break;
      }
    },
    [cx, cy, activeElevation, getBuildingSpan, smoothTransition, fitBuilding]
  );

  const zoomIn = useCallback(() => {
    if (!controlsRef.current) return;
    const target = controlsRef.current.target as THREE.Vector3;
    const dir = new THREE.Vector3().subVectors(target, camera.position);
    const dist = dir.length();
    if (dist > 3.0) {
      const step = Math.max(2.5, dist * 0.25);
      smoothTransition(
        [
          camera.position.x + dir.x * (step / dist),
          camera.position.y + dir.y * (step / dist),
          camera.position.z + dir.z * (step / dist),
        ],
        [target.x, target.y, target.z]
      );
    }
  }, [camera, smoothTransition]);

  const zoomOut = useCallback(() => {
    if (!controlsRef.current) return;
    const target = controlsRef.current.target as THREE.Vector3;
    const dir = new THREE.Vector3().subVectors(target, camera.position);
    const dist = dir.length();
    if (dist < 220.0) {
      const step = Math.max(3.0, dist * 0.28);
      smoothTransition(
        [
          camera.position.x - dir.x * (step / dist),
          camera.position.y - dir.y * (step / dist),
          camera.position.z - dir.z * (step / dist),
        ],
        [target.x, target.y, target.z]
      );
    }
  }, [camera, smoothTransition]);

  // Expose methods to bridge ref for UI buttons
  useEffect(() => {
    bridgeRef.current = {
      zoomIn,
      zoomOut,
      fitBuilding,
      focusFloor,
      setPreset,
    };
  }, [bridgeRef, zoomIn, zoomOut, fitBuilding, focusFloor, setPreset]);

  // Smooth frame interpolation loop (60 FPS easing)
  useFrame((_, delta) => {
    if (transitionRef.current.active && controlsRef.current) {
      const t = Math.min(1.0, delta * 7.5);
      camera.position.lerp(transitionRef.current.desiredCamPos, t);
      controlsRef.current.target.lerp(transitionRef.current.desiredTarget, t);
      controlsRef.current.update();

      if (
        camera.position.distanceTo(transitionRef.current.desiredCamPos) < 0.08 &&
        controlsRef.current.target.distanceTo(transitionRef.current.desiredTarget) < 0.08
      ) {
        camera.position.copy(transitionRef.current.desiredCamPos);
        controlsRef.current.target.copy(transitionRef.current.desiredTarget);
        controlsRef.current.update();
        transitionRef.current.active = false;
      }
    }
  });

  // Cursor-Centric Zoom (Zoom wherever pointer points) + Double Click Focus
  useEffect(() => {
    const domElement = gl.domElement;

    const handleWheel = (e: WheelEvent) => {
      if (!controlsRef.current || transitionRef.current.active) return;

      const rect = domElement.getBoundingClientRect();
      const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
      const floorPlane = new THREE.Plane(
        new THREE.Vector3(0, 1, 0),
        -activeElevation
      );
      const hitPoint = new THREE.Vector3();
      const hasIntersection = raycaster.ray.intersectPlane(floorPlane, hitPoint);

      if (hasIntersection) {
        const isZoomIn = e.deltaY < 0;
        const curDist = camera.position.distanceTo(controlsRef.current.target);

        if (isZoomIn && curDist > 2.5) {
          // Pull controls target slightly toward pointer hit point (adaptive cursor center)
          controlsRef.current.target.lerp(hitPoint, 0.10);
          const camToHit = new THREE.Vector3().subVectors(hitPoint, camera.position);
          const moveStep = Math.min(camToHit.length() * 0.12, 4.0);
          camera.position.addScaledVector(camToHit.normalize(), moveStep);
          controlsRef.current.update();
        } else if (!isZoomIn && curDist < 220) {
          const camToHit = new THREE.Vector3().subVectors(hitPoint, camera.position);
          const moveStep = Math.min(camToHit.length() * 0.12, 4.5);
          camera.position.addScaledVector(camToHit.normalize(), -moveStep);
          controlsRef.current.update();
        }
      }
    };

    const handleDblClick = (e: MouseEvent) => {
      const rect = domElement.getBoundingClientRect();
      const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
      const floorPlane = new THREE.Plane(
        new THREE.Vector3(0, 1, 0),
        -activeElevation
      );
      const hitPoint = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(floorPlane, hitPoint)) {
        // Smoothly glide into clicked spot
        smoothTransition(
          [hitPoint.x + 8, activeElevation + 12, hitPoint.z + 10],
          [hitPoint.x, activeElevation, hitPoint.z]
        );
      }
    };

    domElement.addEventListener("wheel", handleWheel, { passive: true });
    domElement.addEventListener("dblclick", handleDblClick);
    return () => {
      domElement.removeEventListener("wheel", handleWheel);
      domElement.removeEventListener("dblclick", handleDblClick);
    };
  }, [gl, camera, raycaster, activeElevation, smoothTransition]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      target={[cx, activeElevation, cy]}
      minDistance={2.5}
      maxDistance={250}
      maxPolarAngle={Math.PI / 2 - 0.02}
      dampingFactor={0.08}
      enableDamping
    />
  );
}

export function EditorCanvas3D() {
  const cameraBridgeRef = useRef<any>(null);
  const [activePreset, setActivePreset] = useState<"iso" | "top" | "front" | "side">("iso");

  const { ref, style, dragHandleProps, resetPosition, position } = useDraggableWidget({
    id: "canvas3d-camera-widget"
  });

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

        <AdvancedCameraController
          cx={cx}
          cy={cy}
          buildingBounds={buildingBounds}
          activeFloorNumber={activeFloorNumber}
          bridgeRef={cameraBridgeRef}
        />
      </Canvas>

      {/* Floating 3D Navigation, Camera Presets & Zoom Controls Widget */}
      <div 
        ref={ref}
        style={style}
        data-no-canvas-click="true"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className="absolute top-4 right-4 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 text-white rounded-xl shadow-2xl p-2.5 z-20 flex flex-col space-y-2.5 select-none"
      >
        <div 
          {...dragHandleProps}
          className="flex items-center justify-between border-b border-slate-700/80 pb-2 px-1 cursor-grab active:cursor-grabbing"
          title="Drag header to move anywhere • Double-click to reset position"
        >
          <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-200">
            <GripHorizontal size={14} className="text-slate-400" />
            <Compass size={14} className="text-indigo-400" />
            <span>3D View & Zoom</span>
          </div>
          <div className="flex items-center space-x-1" data-no-drag="true">
            {position && (
              <button
                onClick={resetPosition}
                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-indigo-300 rounded transition-colors"
                title="Reset position to default top-right"
              >
                <RotateCcw size={12} />
              </button>
            )}
            <span className="text-[10px] text-slate-400 font-mono">L{activeFloorNumber}</span>
          </div>
        </div>

        {/* Step Zoom & Fit Buttons */}
        <div className="grid grid-cols-4 gap-1">
          <button
            onClick={() => cameraBridgeRef.current?.zoomIn()}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 rounded-lg flex items-center justify-center transition-all cursor-pointer border border-slate-700/60"
            title="Zoom In (+)"
          >
            <ZoomIn size={15} />
          </button>
          <button
            onClick={() => cameraBridgeRef.current?.zoomOut()}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 rounded-lg flex items-center justify-center transition-all cursor-pointer border border-slate-700/60"
            title="Zoom Out (-)"
          >
            <ZoomOut size={15} />
          </button>
          <button
            onClick={() => cameraBridgeRef.current?.fitBuilding()}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 rounded-lg flex items-center justify-center transition-all cursor-pointer border border-slate-700/60"
            title="Fit Building to Screen (Home)"
          >
            <Maximize2 size={15} />
          </button>
          <button
            onClick={() => cameraBridgeRef.current?.focusFloor()}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-indigo-400 hover:text-indigo-300 rounded-lg flex items-center justify-center transition-all cursor-pointer border border-slate-700/60"
            title={`Focus on Level ${activeFloorNumber}`}
          >
            <Layers size={15} />
          </button>
        </div>

        {/* Camera Angle Presets */}
        <div className="grid grid-cols-2 gap-1 pt-0.5 border-t border-slate-800 text-[11px] font-semibold">
          {[
            { id: "iso", label: "3D Iso" },
            { id: "top", label: "Top (Plan)" },
            { id: "front", label: "Front" },
            { id: "side", label: "Side" },
          ].map((preset) => (
            <button
              key={preset.id}
              onClick={() => {
                setActivePreset(preset.id as any);
                cameraBridgeRef.current?.setPreset(preset.id);
              }}
              className={`px-2 py-1 rounded-lg text-center transition-all cursor-pointer ${
                activePreset === preset.id
                  ? "bg-indigo-600 text-white shadow-xs font-bold"
                  : "bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Pointer Tip */}
        <div className="text-[10px] text-slate-400 text-center border-t border-slate-800/80 pt-1.5 leading-tight">
          Scroll = Zoom to cursor<br />Double-click = Focus room
        </div>
      </div>

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
