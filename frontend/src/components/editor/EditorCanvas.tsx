"use client";

import { useEditorStore } from "@/store/editorStore";
import { Point, EditorElement, Room, Wall, Door, Stair, Exit } from "@/lib/editor/types";
import { useCallback, useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";

export function EditorCanvas() {
  const { 
    activeFloorId, activeTool, gridSnapping, gridResolution, 
    getCurrentElements, addElement, updateElement, setSelectedElementId, selectedElementId,
    undo, redo, setActiveTool, graph, setSelectedGraphNodeId, setSelectedGraphEdgeId, selectedGraphNodeId, selectedGraphEdgeId,
    simulationRun, playbackFrameIndex, showGraphOverlay
  } = useEditorStore();

  const elements = getCurrentElements().filter(el => el.floor_id === activeFloorId);
  const activeFloor = useEditorStore(s => s.floors.find(f => f.id === activeFloorId));
  const activeFloorNumber = activeFloor ? activeFloor.floor_number : -1;

  
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
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo, setActiveTool, graph, setSelectedGraphNodeId, setSelectedGraphEdgeId, selectedGraphNodeId, selectedGraphEdgeId]);

  const handlePointerDown = (e: React.PointerEvent) => {
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
        addElement({ ...baseObj, type: "STAIR", position_x: snapped.x, position_y: snapped.y, width_meters: 1.5, is_upward: false } as Stair);
      } else if (activeTool === "EXIT") {
        addElement({ ...baseObj, type: "EXIT", position_x: snapped.x, position_y: snapped.y, width_meters: 2.0, discharge_rate: 1.5, is_usable: true } as Exit);
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
            </defs>
            <rect x="-1000" y="-1000" width="2000" height="2000" fill="url(#grid)" />
            {/* Origin Axes */}
            <line x1="-1000" y1="0" x2="1000" y2="0" className="stroke-red-300 stroke-[0.1]" />
            <line x1="0" y1="-1000" x2="0" y2="1000" className="stroke-green-300 stroke-[0.1]" />
          </g>

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

          {/* Point Elements (Doors, Stairs, Exits) */}
          {elements.filter(e => ["DOOR", "STAIR", "EXIT"].includes(e.type)).map(el => {
            const eAny = el as any;
            const isExit = el.type === "EXIT";
            const isDoor = el.type === "DOOR";
            const fill = isExit ? "#10b981" : (isDoor ? "#f59e0b" : "#64748b");
            const size = 0.8;
            
            return (
              <rect
                key={el.id}
                x={eAny.position_x - size/2}
                y={eAny.position_y - size/2}
                width={size}
                height={size}
                fill={fill}
                rx={0.1}
                className={`stroke-white stroke-[0.1] ${activeTool === 'SELECT' ? 'cursor-pointer' : 'pointer-events-none'}`}
                onPointerDown={(e) => handleElementClick(e, el.id)}
              />
            );
          })}

          
          {/* Graph Edges */}
          {showGraphOverlay && graph && graph.edges.map(edge => {
            const sourceNode = graph.nodes.find(n => n.id === edge.source_node_id);
            const targetNode = graph.nodes.find(n => n.id === edge.target_node_id);
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
          })}

          {/* Graph Nodes */}
          {showGraphOverlay && graph && graph.nodes.filter(n => n.floor_number === activeFloorNumber).map(node => {
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
          })}

          {/* Simulation Agents */}
          {simulationRun && simulationRun.results?.frames && simulationRun.results.frames[playbackFrameIndex] && (
            <g className="agents-layer">
              {simulationRun.results.frames[playbackFrameIndex].agents
                .filter((a: any) => a.floor_number === activeFloorNumber && a.status !== "EXITED")
                .map((agent: any) => {
                  let fill = "#3498db"; // ADULT
                  if (agent.profile === "ELDERLY") fill = "#9b59b6";
                  else if (agent.profile === "CHILD") fill = "#f1c40f";
                  else if (agent.profile === "DISABLED") fill = "#e74c3c";
                  
                  return (
                    <circle
                      key={agent.id}
                      cx={agent.x}
                      cy={agent.y}
                      r={0.3}
                      fill={fill}
                      className="stroke-white stroke-[0.05] transition-all duration-200"
                    />
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
          
          {/* Tool Cursor Preview (for point elements) */}
          {!isDrawing && activeFloorId && ["DOOR", "STAIR", "EXIT"].includes(activeTool) && (
            <circle cx={mousePos.x} cy={mousePos.y} r={0.5} className="fill-none stroke-slate-400 stroke-[0.1] stroke-dasharray-[0.2,0.2]" />
          )}
        </g>
      </svg>
      
      {/* HUD Info */}
      <div className="absolute bottom-4 left-4 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-md shadow-sm border border-slate-200 text-xs text-slate-600 font-mono">
        X: {mousePos.x.toFixed(1)}m | Y: {mousePos.y.toFixed(1)}m | Zoom: {zoom.toFixed(1)}
      </div>
    </div>
  );
}
