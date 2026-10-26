"use client";

import { useEditorStore } from "@/store/editorStore";
import { Point, EditorElement, Room, Wall, Door, Stair, Exit } from "@/lib/editor/types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { Flame, Trash2, ListStart } from "lucide-react";

export function EditorCanvas() {
  const { 
    activeFloorId, activeTool, gridSnapping, gridResolution, 
    getCurrentElements, addElement, updateElement, setSelectedElementId, selectedElementId,
    undo, redo, setActiveTool, graph, setSelectedGraphNodeId, setSelectedGraphEdgeId, selectedGraphNodeId, selectedGraphEdgeId,
    simulationRun, playbackFrameIndex, showGraphOverlay, blueprintImage, blueprintOpacity,
    showExitIntelligence, floors, getActiveBlueprint, getActiveBlueprintOpacity,
    deleteElement, clearHazards, hazardSpreadRate, setHazardSpreadRate
  } = useEditorStore();

  const elements = getCurrentElements().filter(el => el.floor_id === activeFloorId);
  const activeFloor = useEditorStore(s => s.floors.find(f => f.id === activeFloorId));
  const activeFloorNumber = activeFloor ? activeFloor.floor_number : -1;

  const currentFrame = simulationRun?.results?.frames?.[playbackFrameIndex];
  const activeBlueprint = getActiveBlueprint();
  const activeBlueprintOpacity = getActiveBlueprintOpacity();

  // Ghost outline of stairs on the floor directly below (ensures vertical shafts align easily)
  const lowerFloorStairs = useMemo(() => {
    if (activeFloorNumber <= 0) return [];
    const lowerFloor = floors.find(f => f.floor_number === activeFloorNumber - 1);
    if (!lowerFloor) return [];
    return getCurrentElements().filter(el => el.type === "STAIR" && el.floor_id === lowerFloor.id) as Stair[];
  }, [floors, activeFloorNumber, getCurrentElements]);

  // Sorted exits on this floor for consistent A/B/C tagging across 2D, 3D, and HUD
  const sortedFloorExits = useMemo(() => {
    return (elements.filter(e => e.type === "EXIT" && e.floor_id === activeFloorId) as Exit[])
      .sort((a, b) => a.position_x !== b.position_x ? a.position_x - b.position_x : a.position_y - b.position_y);
  }, [elements, activeFloorId]);

  const exitTagMap = useMemo(() => {
    const map = new Map<string, string>();
    sortedFloorExits.forEach((ex, idx) => {
      map.set(ex.id, String.fromCharCode(65 + idx));
    });
    return map;
  }, [sortedFloorExits]);

  // Real-time Exit Intelligence map for in-canvas floating badges
  const exitStatsMap = useMemo(() => {
    if (!currentFrame) return new Map<string, { tag: string; queueCount: number; clearedCount: number; status: string; bg: string; stroke: string; dot: string; isBottleneck: boolean }>();
    const activeAgents = currentFrame.agents?.filter((a: any) => a.floor_number === activeFloorNumber && a.status !== "EXITED" && a.status !== "TRAPPED") || [];
    const evacuatedAgents = currentFrame.agents?.filter((a: any) => a.status === "EXITED") || [];

    const map = new Map<string, { tag: string; queueCount: number; clearedCount: number; status: string; bg: string; stroke: string; dot: string; isBottleneck: boolean }>();
    for (const ex of sortedFloorExits) {
      const tag = exitTagMap.get(ex.id) || "A";
      const targeting = activeAgents.filter((a: any) => {
        if (a.target_exit_id && a.target_exit_id === ex.id) return true;
        let closestDist = Infinity;
        let closestId = null;
        for (const other of sortedFloorExits) {
          const d = Math.hypot(a.x - other.position_x, a.y - other.position_y);
          if (d < closestDist) {
            closestDist = d;
            closestId = other.id;
          }
        }
        return closestId === ex.id;
      });

      const cleared = evacuatedAgents.filter((a: any) => {
        if (a.exit_node_id && a.exit_node_id === ex.id) return true;
        let closestDist = Infinity;
        let closestId = null;
        for (const other of sortedFloorExits) {
          const d = Math.hypot(a.x - other.position_x, a.y - other.position_y);
          if (d < closestDist) {
            closestDist = d;
            closestId = other.id;
          }
        }
        return closestId === ex.id;
      });

      const q = targeting.length;
      const c = cleared.length;
      const isBottleneck = q >= 7;
      const status = isBottleneck ? "BOTTLENECK" : q >= 3 ? "MODERATE" : "FREE";
      const bg = isBottleneck ? "#7f1d1d" : q >= 3 ? "#78350f" : "#064e3b";
      const stroke = isBottleneck ? "#ef4444" : q >= 3 ? "#f59e0b" : "#10b981";
      const dot = isBottleneck ? "#ef4444" : q >= 3 ? "#fbbf24" : "#34d399";

      map.set(ex.id, { tag, queueCount: q, clearedCount: c, status, bg, stroke, dot, isBottleneck });
    }
    return map;
  }, [currentFrame, sortedFloorExits, exitTagMap, activeFloorNumber]);

  // Pre-index graph nodes for O(1) edge lookup (eliminates 160M operations per frame)
  const graphNodeMap = useMemo(() => {
    if (!graph?.nodes) return new Map();
    return new Map(graph.nodes.map(n => [n.id, n]));
  }, [graph?.nodes]);

  // Memoized Graph Edges (only recomputes when graph/floor/selection changes, NOT on animation frame)
  const renderedGraphEdges = useMemo(() => {
    if (!showGraphOverlay || !graph?.edges) return null;
    return graph.edges.map(edge => {
      const sourceNode = graphNodeMap.get(edge.source_node_id);
      const targetNode = graphNodeMap.get(edge.target_node_id);
      if (!sourceNode || !targetNode) return null;

      const isSourceActive = sourceNode.floor_number === activeFloorNumber;
      const isTargetActive = targetNode.floor_number === activeFloorNumber;
      if (!isSourceActive && !isTargetActive) return null;

      const isSelected = selectedGraphEdgeId === edge.id;
      const isStair = sourceNode.floor_number !== targetNode.floor_number;

      return (
        <line
          key={edge.id}
          x1={sourceNode.x} y1={sourceNode.y}
          x2={targetNode.x} y2={targetNode.y}
          className={`cursor-pointer transition-colors ${isStair ? 'stroke-purple-400 stroke-dasharray-[0.5,0.5]' : 'stroke-purple-500'} ${isSelected ? 'stroke-[0.3]' : 'stroke-[0.1] opacity-60 hover:opacity-100 hover:stroke-[0.15]'}`}
          onClick={(e) => { e.stopPropagation(); setSelectedGraphEdgeId(edge.id); }}
        />
      );
    });
  }, [showGraphOverlay, graph?.edges, graphNodeMap, activeFloorNumber, selectedGraphEdgeId]);

  // Memoized Graph Nodes
  const renderedGraphNodes = useMemo(() => {
    if (!showGraphOverlay || !graph?.nodes) return null;
    return graph.nodes.filter(n => n.floor_number === activeFloorNumber).map(node => {
      const isSelected = selectedGraphNodeId === node.id;
      let fill = "fill-slate-400";
      if (node.node_type === "EXIT") fill = "fill-emerald-500";
      else if (node.node_type === "STAIR") fill = "fill-purple-500";
      else if (node.node_type === "DOOR") fill = "fill-amber-500";

      return (
        <circle
          key={node.id}
          cx={node.x} cy={node.y}
          r={isSelected ? 0.3 : 0.2}
          className={`cursor-pointer transition-all ${fill} ${isSelected ? 'stroke-white stroke-[0.1]' : 'opacity-80 hover:opacity-100 hover:r-[0.25]'}`}
          onClick={(e) => { e.stopPropagation(); setSelectedGraphNodeId(node.id); }}
        />
      );
    });
  }, [showGraphOverlay, graph?.nodes, activeFloorNumber, selectedGraphNodeId]);

  
  const svgRef = useRef<SVGSVGElement>(null);
  
  // Viewport state
  const [zoom, setZoom] = useState(20); // pixels per meter
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Point>({ x: 0, y: 0 });

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [mousePos, setMousePos] = useState<Point>({ x: 0, y: 0 });

  const getSnappedPoint = (p: Point): Point => {
    if (!gridSnapping) return p;
    return {
      x: Math.round(p.x / gridResolution) * gridResolution,
      y: Math.round(p.y / gridResolution) * gridResolution
    };
  };

  const getEventPoint = (e: React.MouseEvent | MouseEvent): Point => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const rawX = (e.clientX - rect.left - pan.x) / zoom;
    const rawY = (e.clientY - rect.top - pan.y) / zoom;
    return { x: rawX, y: rawY };
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsDrawing(false);
        setCurrentPoints([]);
        setActiveTool("SELECT");
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        if (e.shiftKey) redo();
        else undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        redo();
      }
      // Tool shortcuts
      if (!e.ctrlKey && !e.metaKey) {
        switch(e.key.toLowerCase()) {
          case 'v': setActiveTool('SELECT'); break;
          case 'r': setActiveTool('ROOM'); break;
          case 'w': setActiveTool('WALL'); break;
          case 'd': setActiveTool('DOOR'); break;
          case 's': setActiveTool('STAIR'); break;
          case 'e': setActiveTool('EXIT'); break;
          case 'h': setActiveTool('HAZARD'); break;
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo, setActiveTool, graph, setSelectedGraphNodeId, setSelectedGraphEdgeId, selectedGraphNodeId, selectedGraphEdgeId]);

  const handlePointerDown = (e: React.PointerEvent) => {
    // Prevent element placement or canvas actions when clicking on UI buttons or overlays
    const targetEl = e.target as HTMLElement | null;
    if (targetEl && (targetEl.closest("button") || targetEl.closest("[data-no-canvas-click]") || targetEl.tagName === "BUTTON")) {
      return;
    }

    if (e.button === 1 || (e.button === 0 && e.altKey)) { // Middle click or Alt+Left for pan
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    if (e.button !== 0 || !activeFloorId) return; // Only left click

    const p = getEventPoint(e);
    const snapped = getSnappedPoint(p);

    if (activeTool === "SELECT") {
      setSelectedElementId(null);
      setSelectedGraphNodeId(null);
      setSelectedGraphEdgeId(null);
      return;
    }

    if (activeTool === "WALL" || activeTool === "ROOM") {
      setIsDrawing(true);
      setCurrentPoints([snapped]);
    } else {
      // Point elements (Door, Stair, Exit)
      const baseObj = { id: uuidv4(), floor_id: activeFloorId };
      if (activeTool === "DOOR") {
        addElement({ ...baseObj, type: "DOOR", position_x: snapped.x, position_y: snapped.y, width_meters: 1.0, is_open: true } as Door);
      } else if (activeTool === "STAIR") {
        let placeX = snapped.x;
        let placeY = snapped.y;
        // Auto-snap to lower floor stair shaft if clicked within 1.8m
        if (lowerFloorStairs.length > 0) {
          let closestDist = Infinity;
          let closestStair: Stair | null = null;
          for (const s of lowerFloorStairs) {
            const d = Math.hypot(s.position_x - snapped.x, s.position_y - snapped.y);
            if (d < closestDist) {
              closestDist = d;
              closestStair = s;
            }
          }
          if (closestStair && closestDist <= 1.8) {
            placeX = closestStair.position_x;
            placeY = closestStair.position_y;
          }
        }
        addElement({ ...baseObj, type: "STAIR", position_x: placeX, position_y: placeY, width_meters: 1.5, is_upward: false } as Stair);
      } else if (activeTool === "EXIT") {
        if (activeFloorNumber > 0) {
          alert(
            `🚪 Exterior Building Discharge Notice:\n\n` +
            `In multi-story building architecture, exterior exit doors discharge to safety exclusively on the Ground Floor (Level 0).\n\n` +
            `On Floor ${activeFloorNumber}, please place a Staircase (S) to connect occupants down to the Ground Floor exits.`
          );
          return;
        }
        addElement({ ...baseObj, type: "EXIT", position_x: snapped.x, position_y: snapped.y, width_meters: 2.0, discharge_rate: 1.5, is_usable: true } as Exit);
      } else if (activeTool === "HAZARD") {
        // Toggle behavior: if clicking near an existing hazard on this floor, extinguish/remove it
        const existingHazard = elements.find(
          (el) => el.type === "HAZARD" && Math.hypot((el as any).position_x - snapped.x, (el as any).position_y - snapped.y) <= 0.8
        );
        if (existingHazard) {
          deleteElement(existingHazard.id);
        } else {
          addElement({ ...baseObj, type: "HAZARD", position_x: snapped.x, position_y: snapped.y, intensity: 1.0 } as any);
        }
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      return;
    }

    const p = getEventPoint(e);
    setMousePos(getSnappedPoint(p));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsPanning(false);
    if (isDrawing && activeFloorId && (activeTool === "WALL" || activeTool === "ROOM")) {
      const p = getEventPoint(e);
      const snapped = getSnappedPoint(p);
      
      if (currentPoints.length > 0) {
        const start = currentPoints[0];
        if (start.x !== snapped.x || start.y !== snapped.y) {
          const baseObj = { id: uuidv4(), floor_id: activeFloorId };
          if (activeTool === "WALL") {
            addElement({ ...baseObj, type: "WALL", start_x: start.x, start_y: start.y, end_x: snapped.x, end_y: snapped.y, is_combustible: false } as Wall);
          } else if (activeTool === "ROOM") {
            const coords = [
              { x: start.x, y: start.y },
              { x: snapped.x, y: start.y },
              { x: snapped.x, y: snapped.y },
              { x: start.x, y: snapped.y }
            ];
            addElement({ ...baseObj, type: "ROOM", name: "New Room", room_type: "general", geometry: { type: "polygon", coordinates: coords }, is_accessible: true } as Room);
          }
        }
      }
      setIsDrawing(false);
      setCurrentPoints([]);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(5, Math.min(100, zoom * zoomFactor));
      
      // Keep mouse position fixed while zooming
      if (svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const newPanX = mouseX - (mouseX - pan.x) * (newZoom / zoom);
        const newPanY = mouseY - (mouseY - pan.y) * (newZoom / zoom);
        
        setPan({ x: newPanX, y: newPanY });
      }
      setZoom(newZoom);
    }
  };

  const handleElementClick = (e: React.MouseEvent, id: string) => {
    if (activeTool === "SELECT") {
      e.stopPropagation();
      setSelectedElementId(id);
    }
  };

  return (
    <div className="flex-1 bg-slate-50 relative overflow-hidden" 
         onPointerDown={handlePointerDown} 
         onPointerMove={handlePointerMove} 
         onPointerUp={handlePointerUp}
         onWheel={handleWheel}
         style={{ touchAction: 'none' }}>
      
      <svg ref={svgRef} className="w-full h-full cursor-crosshair">
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* Grid */}
          <g className="text-slate-200 stroke-current stroke-[0.05]">
            {/* Simple infinite grid representation by expanding a large rect with a pattern, but for SVG it's easier to use a defs pattern */}
            <defs>
              <pattern id="grid" width={gridResolution} height={gridResolution} patternUnits="userSpaceOnUse">
                <path d={`M ${gridResolution} 0 L 0 0 0 ${gridResolution}`} fill="none" />
              </pattern>
              {/* Fire gradients and filters for Interactive Fire Ignition Brush */}
              <radialGradient id="fireCoreGradient" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="35%" stopColor="#fb923c" />
                <stop offset="75%" stopColor="#ea580c" />
                <stop offset="100%" stopColor="#b91c1c" />
              </radialGradient>
              <radialGradient id="fireAuraGradient" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(249, 115, 22, 0.55)" />
                <stop offset="60%" stopColor="rgba(239, 68, 68, 0.25)" />
                <stop offset="100%" stopColor="rgba(239, 68, 68, 0)" />
              </radialGradient>
            </defs>
            <rect x="-1000" y="-1000" width="2000" height="2000" fill="url(#grid)" />
            {/* Origin Axes */}
            <line x1="-1000" y1="0" x2="1000" y2="0" className="stroke-red-300 stroke-[0.1]" />
            <line x1="0" y1="-1000" x2="0" y2="1000" className="stroke-green-300 stroke-[0.1]" />
          </g>

          {/* Blueprint Background for Active Floor */}
            {activeBlueprint && (
              <image href={activeBlueprint} x="-10" y="-10" width="20" height="20" opacity={activeBlueprintOpacity} preserveAspectRatio="xMidYMid slice" className="pointer-events-none" />
            )}

          {/* Vertical Shaft Alignment Guide: Ghost outline of stairs from the floor below */}
          {lowerFloorStairs.map((stair) => (
            <g key={`ghost-stair-${stair.id}`} className="pointer-events-none select-none opacity-50">
              <rect
                x={stair.position_x - 0.75}
                y={stair.position_y - 0.75}
                width={1.5}
                height={1.5}
                fill="#f3e8ff"
                stroke="#a855f7"
                strokeWidth={0.08}
                strokeDasharray="0.3 0.15"
                rx={0.2}
              />
              <text
                x={stair.position_x}
                y={stair.position_y - 0.9}
                textAnchor="middle"
                fill="#9333ea"
                fontSize="0.32"
                fontWeight="bold"
                fontFamily="sans-serif"
              >
                ⤓ STAIR BELOW
              </text>
            </g>
          ))}

            {/* Rooms */}
          {elements.filter(e => e.type === "ROOM").map(el => {
            const room = el as Room;
            const c = room.geometry.coordinates;
            const isSelected = selectedElementId === room.id;
            return (
              <polygon 
                key={room.id}
                points={c.map(p => `${p.x},${p.y}`).join(" ")}
                className={`fill-blue-100 fill-opacity-50 stroke-[0.1] transition-colors ${activeTool === 'SELECT' ? 'cursor-pointer' : 'pointer-events-none'} ${isSelected ? 'stroke-blue-600' : 'stroke-blue-300 hover:stroke-blue-400'}`}
                onPointerDown={(e) => handleElementClick(e, room.id)}
              />
            );
          })}

          {/* Walls */}
          {elements.filter(e => e.type === "WALL").map(el => {
            const wall = el as Wall;
            const isSelected = selectedElementId === wall.id;
            return (
              <line 
                key={wall.id}
                x1={wall.start_x} y1={wall.start_y}
                x2={wall.end_x} y2={wall.end_y}
                className={`stroke-[0.3] stroke-linecap-round transition-colors ${activeTool === 'SELECT' ? 'cursor-pointer' : 'pointer-events-none'} ${isSelected ? 'stroke-blue-600' : 'stroke-slate-800 hover:stroke-slate-600'}`}
                onPointerDown={(e) => handleElementClick(e, wall.id)}
              />
            );
          })}

          {/* Placed Fire Hazard Ignition Points */}
          {elements.filter(e => e.type === "HAZARD").map((el, idx) => {
            const h = el as any;
            const isSelected = selectedElementId === el.id;
            return (
              <g 
                key={el.id}
                className="cursor-pointer group"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  if (activeTool === "HAZARD") {
                    deleteElement(el.id);
                  } else {
                    setSelectedElementId(el.id);
                  }
                }}
              >
                {/* Pulsing Outer Heat Aura */}
                <circle
                  cx={h.position_x}
                  cy={h.position_y}
                  r={1.3}
                  fill="url(#fireAuraGradient)"
                  className="animate-pulse pointer-events-none"
                />
                
                {/* Flame Base Disc */}
                <circle
                  cx={h.position_x}
                  cy={h.position_y}
                  r={0.65}
                  fill="url(#fireCoreGradient)"
                  stroke={isSelected ? "#38bdf8" : "#fed7aa"}
                  strokeWidth={isSelected ? 0.15 : 0.08}
                />

                {/* Flame Silhouette Glyph */}
                <path
                  d="M0 -0.42 C0.12 -0.2 0.35 -0.1 0.35 0.15 C0.35 0.35 0.2 0.48 0 0.48 C-0.2 0.48 -0.35 0.35 -0.35 0.15 C-0.35 -0.05 -0.18 -0.22 0 -0.42 Z"
                  transform={`translate(${h.position_x}, ${h.position_y}) scale(0.75)`}
                  fill="#ffffff"
                  className="pointer-events-none"
                />

                {/* Floating Ignition Node Identification Badge */}
                <g transform={`translate(${h.position_x}, ${h.position_y - 1.15})`} className="pointer-events-none select-none">
                  <rect
                    x="-1.8"
                    y="-0.35"
                    width="3.6"
                    height="0.7"
                    rx="0.35"
                    fill="#7f1d1d"
                    stroke="#f87171"
                    strokeWidth="0.06"
                    opacity="0.95"
                  />
                  <text
                    x="0"
                    y="0.1"
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="0.3"
                    fontWeight="900"
                    fontFamily="monospace"
                  >
                    {`🔥 IGNITION #${idx + 1}`}
                  </text>
                </g>
              </g>
            );
          })}

          {/* Architectural Staircases / Vertical Egress Shafts */}
          {elements.filter(e => e.type === "STAIR").map((el, idx) => {
            const stair = el as Stair;
            const isSelected = selectedElementId === stair.id;
            const w = stair.width_meters || 1.5;
            const hasLowerStair = lowerFloorStairs.some(ls => Math.hypot(ls.position_x - stair.position_x, ls.position_y - stair.position_y) <= 1.8);
            const isGround = activeFloorNumber <= 0;
            const shaftTag = String.fromCharCode(65 + idx);
            const statusColor = isGround ? "#a855f7" : hasLowerStair ? "#22c55e" : "#f97316";

            return (
              <g 
                key={stair.id}
                className="cursor-pointer group"
                onPointerDown={(e) => handleElementClick(e, stair.id)}
              >
                {/* Stairwell Outer Perimeter */}
                <rect
                  x={stair.position_x - w/2}
                  y={stair.position_y - w/2}
                  width={w}
                  height={w}
                  fill="#faf5ff"
                  stroke={isSelected ? "#38bdf8" : "#9333ea"}
                  strokeWidth={isSelected ? 0.16 : 0.08}
                  rx={0.15}
                />
                {/* Architectural Step Treads */}
                {[-0.32, -0.12, 0.08, 0.28].map((off, sIdx) => (
                  <line
                    key={`tread-${sIdx}`}
                    x1={stair.position_x - (w/2 - 0.15)}
                    y1={stair.position_y + off * w}
                    x2={stair.position_x + (w/2 - 0.15)}
                    y2={stair.position_y + off * w}
                    stroke="#c084fc"
                    strokeWidth={0.06}
                    className="pointer-events-none"
                  />
                ))}
                {/* Center Directional Indicator */}
                <text
                  x={stair.position_x}
                  y={stair.position_y + 0.12}
                  textAnchor="middle"
                  fill="#6b21a8"
                  fontSize="0.38"
                  fontWeight="900"
                  fontFamily="sans-serif"
                  className="pointer-events-none select-none"
                >
                  {isGround ? "⤒ UP" : "⤓ DOWN"}
                </text>

                {/* Floating Stair Shaft Tag & Vertical Connection Status */}
                <g transform={`translate(${stair.position_x}, ${stair.position_y - (w/2 + 0.55)})`} className="pointer-events-none select-none">
                  <rect
                    x="-2.3"
                    y="-0.35"
                    width="4.6"
                    height="0.7"
                    rx="0.35"
                    fill="#0f172a"
                    stroke={statusColor}
                    strokeWidth="0.08"
                    opacity="0.95"
                  />
                  <text
                    x="0"
                    y="0.12"
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="0.3"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    {isGround 
                      ? `🪜 STAIR ${shaftTag} (LEADS UP)`
                      : hasLowerStair 
                        ? `✓ STAIR ${shaftTag} ⤓ TO GROUND` 
                        : `⚠️ STAIR ${shaftTag} (NO LOWER SHAFT)`}
                  </text>
                </g>
              </g>
            );
          })}

          {/* Point Elements (Doors & Exits) */}
          {elements.filter(e => ["DOOR", "EXIT"].includes(e.type)).map(el => {
            const eAny = el as any;
            const isExit = el.type === "EXIT";
            const isDoor = el.type === "DOOR";
            const fill = isExit ? "#10b981" : "#f59e0b";
            const size = 0.8;
            const intel = isExit ? exitStatsMap.get(el.id) : null;
            
            return (
              <g key={el.id}>
                <rect
                  x={eAny.position_x - size/2}
                  y={eAny.position_y - size/2}
                  width={size}
                  height={size}
                  fill={fill}
                  rx={0.1}
                  className={`stroke-white stroke-[0.1] ${activeTool === 'SELECT' ? 'cursor-pointer' : 'pointer-events-none'}`}
                  onPointerDown={(e) => handleElementClick(e, el.id)}
                />

                {/* Floating Real-Time Exit Identification & Intelligence Badge */}
                {isExit && (
                  <g transform={`translate(${eAny.position_x}, ${eAny.position_y - 1.25})`} className="pointer-events-none select-none">
                    {showExitIntelligence && simulationRun && intel ? (
                      <>
                        <rect
                          x="-2.5"
                          y="-0.45"
                          width="5.0"
                          height="0.8"
                          rx="0.4"
                          fill={intel.bg}
                          stroke={intel.stroke}
                          strokeWidth="0.08"
                          className={intel.isBottleneck ? "animate-pulse" : ""}
                        />
                        <rect
                          x="-2.35"
                          y="-0.35"
                          width="0.8"
                          height="0.6"
                          rx="0.2"
                          fill="#ffffff"
                        />
                        <text
                          x="-1.95"
                          y="0.08"
                          textAnchor="middle"
                          fill="#0f172a"
                          fontSize="0.38"
                          fontWeight="900"
                          fontFamily="monospace"
                        >
                          {intel.tag}
                        </text>
                        <text
                          x="0.25"
                          y="0.08"
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize="0.34"
                          fontWeight="bold"
                          fontFamily="monospace"
                        >
                          {`👥 ${intel.queueCount}  ✓ ${intel.clearedCount}`}
                        </text>
                      </>
                    ) : (
                      <>
                        <rect
                          x="-1.4"
                          y="-0.4"
                          width="2.8"
                          height="0.7"
                          rx="0.35"
                          fill="#0f172a"
                          stroke="#10b981"
                          strokeWidth="0.06"
                          opacity="0.9"
                        />
                        <text
                          x="0"
                          y="0.08"
                          textAnchor="middle"
                          fill="#34d399"
                          fontSize="0.32"
                          fontWeight="bold"
                          fontFamily="monospace"
                        >
                          {`🚪 EXIT ${exitTagMap.get(el.id) || ""}`}
                        </text>
                      </>
                    )}
                  </g>
                )}
              </g>
            );
          })}

          
          {/* Memoized Graph Edges (O(1) lookups, 0 recomputations on animation ticks) */}
          {renderedGraphEdges}

          {/* Memoized Graph Nodes */}
          {renderedGraphNodes}

          {/* Simulation Hazards (Fire/Smoke) */}
          {simulationRun && simulationRun.results?.frames && simulationRun.results.frames[playbackFrameIndex] && (
            <g className="hazards-layer">
              {simulationRun.results.frames[playbackFrameIndex].hazards?.map((h: any) => (
                <circle
                  key={`hazard-${h.node_id}`}
                  cx={h.x}
                  cy={h.y}
                  r={1.0 * h.intensity}
                  fill="#ef4444"
                  opacity={Math.min(0.8, h.intensity)}
                  className="transition-all duration-200 pointer-events-none"
                  style={{ filter: "blur(2px)" }}
                />
              ))}
            </g>
          )}

          {/* Outdoor Evacuation Assembly / Gathering Zone */}
          {simulationRun && activeFloorNumber === 0 && (
            (() => {
              const ap = simulationRun?.results?.assembly_point || { x: 25, y: 35, radius: 4.5 };
              const exitedCount = simulationRun.results?.frames?.[playbackFrameIndex]?.agents?.filter((a: any) => a.status === "EXITED").length || 0;
              return (
                <g id="assembly-point-zone" className="pointer-events-none select-none">
                  <circle
                    cx={ap.x}
                    cy={ap.y}
                    r={ap.radius || 4.5}
                    fill="rgba(16, 185, 129, 0.08)"
                    stroke="#10b981"
                    strokeWidth={0.15}
                    strokeDasharray="0.6 0.3"
                  />
                  <circle
                    cx={ap.x}
                    cy={ap.y}
                    r={0.4}
                    fill="#10b981"
                  />
                  <text
                    x={ap.x}
                    y={ap.y - (ap.radius || 4.5) - 0.4}
                    textAnchor="middle"
                    fill="#059669"
                    fontSize="0.8"
                    fontWeight="bold"
                  >
                    🟢 EVACUATION ASSEMBLY POINT (MUSTER ZONE){exitedCount > 0 ? ` • ${exitedCount} SAFE` : ""}
                  </text>
                </g>
              );
            })()
          )}

          {/* Simulation Agents (Both in-building and gathered outside in assembly area) */}
          {simulationRun && simulationRun.results?.frames && simulationRun.results.frames[playbackFrameIndex] && (
            <g className="agents-layer">
              {simulationRun.results.frames[playbackFrameIndex].agents
                .filter((a: any) => {
                  if (activeFloorNumber === 0) {
                    // On Ground floor, show ground occupants and outdoor gathered evacuees
                    return a.floor_number === 0 || a.status === "EXITED";
                  }
                  // On upper floors, only show non-exited occupants inside that floor
                  return a.floor_number === activeFloorNumber && a.status !== "EXITED";
                })
                .map((agent: any) => {
                  const isExited = agent.status === "EXITED";
                  let fill = isExited ? "#10b981" : "#3498db"; // ADULT
                  if (!isExited) {
                    if (agent.profile === "ELDERLY") fill = "#9b59b6";
                    else if (agent.profile === "CHILD") fill = "#f1c40f";
                    else if (agent.profile === "DISABLED") fill = "#e74c3c";
                  }
                  
                  return (
                    <g key={agent.id}>
                      <circle
                        cx={agent.x}
                        cy={agent.y}
                        r={isExited ? 0.34 : 0.3}
                        fill={fill}
                        className="stroke-white stroke-[0.05] transition-all duration-200"
                      />
                      {isExited && (
                        <circle
                          cx={agent.x}
                          cy={agent.y}
                          r={0.12}
                          fill="#ffffff"
                        />
                      )}
                    </g>
                  );
                })}
            </g>
          )}

          {/* Drawing Preview */}
          {isDrawing && currentPoints.length > 0 && activeTool === "WALL" && (
            <line 
              x1={currentPoints[0].x} y1={currentPoints[0].y}
              x2={mousePos.x} y2={mousePos.y}
              className="stroke-slate-400 stroke-[0.3] stroke-dasharray-[0.5,0.5]"
            />
          )}
          {isDrawing && currentPoints.length > 0 && activeTool === "ROOM" && (
            <rect
              x={Math.min(currentPoints[0].x, mousePos.x)}
              y={Math.min(currentPoints[0].y, mousePos.y)}
              width={Math.abs(mousePos.x - currentPoints[0].x)}
              height={Math.abs(mousePos.y - currentPoints[0].y)}
              className="fill-blue-50 stroke-blue-400 stroke-[0.1] stroke-dasharray-[0.5,0.5]"
            />
          )}
          
          {/* Interactive Fire Tool Cursor Preview Reticle */}
          {!isDrawing && activeFloorId && activeTool === "HAZARD" && (
            <g transform={`translate(${mousePos.x}, ${mousePos.y})`} className="pointer-events-none">
              <circle r={0.9} fill="rgba(239, 68, 68, 0.15)" stroke="#f97316" strokeWidth={0.08} strokeDasharray="0.3 0.15" />
              <circle r={0.2} fill="#ef4444" />
              <line x1="-1.1" y1="0" x2="1.1" y2="0" stroke="#f97316" strokeWidth={0.04} strokeDasharray="0.1 0.1" />
              <line x1="0" y1="-1.1" x2="0" y2="1.1" stroke="#f97316" strokeWidth={0.04} strokeDasharray="0.1 0.1" />
              <rect x="-2.2" y="1.05" width="4.4" height="0.6" rx="0.3" fill="#0f172a" opacity="0.92" stroke="#ea580c" strokeWidth="0.04" />
              <text x="0" y="1.46" textAnchor="middle" fill="#fde047" fontSize="0.28" fontWeight="bold" fontFamily="monospace">
                🔥 CLICK TO IGNITE / TOGGLE
              </text>
            </g>
          )}

          {/* Standard Tool Cursor Preview (for doors, stairs, exits) */}
          {!isDrawing && activeFloorId && ["DOOR", "STAIR", "EXIT"].includes(activeTool) && (
            <circle cx={mousePos.x} cy={mousePos.y} r={0.5} className="fill-none stroke-slate-400 stroke-[0.1] stroke-dasharray-[0.2,0.2]" />
          )}
        </g>
      </svg>
      
      {/* Floating Interactive Fire Ignition Brush HUD Banner */}
      {activeTool === "HAZARD" && (
        <div 
          data-no-canvas-click="true"
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md border border-orange-500/40 text-white px-4 py-2.5 rounded-xl shadow-2xl z-20 flex items-center space-x-4 animate-in fade-in slide-in-from-top-3 select-none"
        >
          <div className="flex items-center space-x-2.5 border-r border-slate-700 pr-4">
            <span className="p-2 bg-gradient-to-tr from-amber-500 to-red-600 text-white rounded-lg shadow-sm">
              <Flame size={18} className="animate-pulse" />
            </span>
            <div>
              <div className="text-xs font-bold text-orange-300 uppercase tracking-wider flex items-center gap-2">
                Fire Ignition Brush
                <span className="text-[10px] bg-red-600/80 px-2 py-0.5 rounded-full font-mono text-white font-bold">
                  {elements.filter(e => e.type === "HAZARD").length} on floor
                </span>
              </div>
              <div className="text-[11px] text-slate-300">
                Click floor to place fire. Click fire node to extinguish.
              </div>
            </div>
          </div>

          {/* Spread Rate Selector */}
          <div className="flex items-center space-x-1.5 border-r border-slate-700 pr-4 text-xs">
            <span className="text-slate-400 text-[11px] font-medium">Spread Speed:</span>
            {[
              { label: "Slow", val: 0.05 },
              { label: "Normal", val: 0.15 },
              { label: "Fast", val: 0.30 },
              { label: "Inferno", val: 0.50 }
            ].map((preset) => (
              <button
                key={preset.label}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  setHazardSpreadRate(preset.val);
                }}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                  (hazardSpreadRate || 0.15) === preset.val
                    ? "bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-xs"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
                }`}
                title={`Set hazard spread rate to ${preset.val}`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Extinguish All & Done buttons */}
          <div className="flex items-center space-x-2">
            {elements.filter(e => e.type === "HAZARD").length > 0 && (
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  clearHazards();
                }}
                className="px-2.5 py-1 bg-red-600/80 hover:bg-red-600 text-white text-xs font-semibold rounded-lg transition-colors flex items-center space-x-1 cursor-pointer shadow-xs active:scale-95"
                title="Extinguish all fire sources on building"
              >
                <Trash2 size={13} />
                <span>Extinguish All</span>
              </button>
            )}
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                setActiveTool("SELECT");
              }}
              className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold rounded-lg transition-colors border border-slate-600 cursor-pointer shadow-xs active:scale-95"
            >
              Done (V)
            </button>
          </div>
        </div>
      )}

      {/* Floating Staircase Shaft Placement HUD Banner */}
      {activeTool === "STAIR" && (
        <div 
          data-no-canvas-click="true"
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md border border-purple-500/40 text-white px-4 py-2.5 rounded-xl shadow-2xl z-20 flex items-center space-x-4 animate-in fade-in slide-in-from-top-3 select-none"
        >
          <div className="flex items-center space-x-2.5 border-r border-slate-700 pr-4">
            <span className="p-2 bg-gradient-to-tr from-purple-500 to-indigo-600 text-white rounded-lg shadow-sm">
              <ListStart size={18} />
            </span>
            <div>
              <div className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-2">
                Staircase Shaft Placement Active
                <span className="text-[10px] bg-purple-600/80 px-2 py-0.5 rounded-full font-mono text-white font-bold">
                  {elements.filter(e => e.type === "STAIR").length} on floor
                </span>
              </div>
              <div className="text-[11px] text-slate-300">
                {activeFloorNumber > 0 
                  ? "Click near ghost stair below to auto-align. Upper floor occupants use stairs to reach Ground exits."
                  : "Place stairs on Ground Floor. Upper floor stairs placed directly above will connect vertically."}
              </div>
            </div>
          </div>

          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setActiveTool("SELECT");
            }}
            className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold rounded-lg transition-colors border border-slate-600 cursor-pointer shadow-xs active:scale-95"
          >
            Done (V)
          </button>
        </div>
      )}

      {/* Warning Notice: Upper Floor Lacks Staircase */}
      {activeFloorNumber > 0 && elements.filter(e => e.type === "STAIR").length === 0 && elements.length > 0 && activeTool !== "STAIR" && (
        <div 
          data-no-canvas-click="true"
          className="absolute top-4 left-4 bg-amber-950/90 backdrop-blur-md border border-amber-500/60 text-amber-200 px-3.5 py-2.5 rounded-xl shadow-lg z-20 flex items-center space-x-3 text-xs animate-in fade-in slide-in-from-top-2"
        >
          <span className="text-lg">⚠️</span>
          <div>
            <div className="font-bold text-amber-300">Level {activeFloorNumber} Has No Staircase</div>
            <div className="text-[11px] text-amber-200/80">
              Occupants on this floor cannot evacuate down to Ground Floor exits without stairs.
            </div>
          </div>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setActiveTool("STAIR");
            }}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer shadow-xs active:scale-95"
          >
            + Add Stair (S)
          </button>
        </div>
      )}

      {/* HUD Info */}
      <div data-no-canvas-click="true" onPointerDown={(e) => e.stopPropagation()} className="absolute bottom-4 left-4 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-md shadow-sm border border-slate-200 text-xs text-slate-600 font-mono select-none">
        X: {mousePos.x.toFixed(1)}m | Y: {mousePos.y.toFixed(1)}m | Zoom: {zoom.toFixed(1)}
      </div>
    </div>
  );
}
