"use client";

import { useEditorStore } from "@/store/editorStore";
import { 
  Building, Plus, Copy, Trash2, Wand2, Upload, Eye, EyeOff, 
  Magnet, Save, Play, Loader2, Trophy, Users, ChevronDown, Check, Swords
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { saveBuilding, generateGraph, digitizeBlueprint } from "@/lib/api/client";
import { v4 as uuidv4 } from "uuid";

export function EditorTopbar() {
  const router = useRouter();
  const { 
    floors, activeFloorId, setActiveFloor, gridSnapping, setGridSnapping,
    buildingId, buildingName, setBuildingInfo, getCurrentElements, setGraph,
    is3DMode, setIs3DMode, graph, showGraphOverlay, setShowGraphOverlay, 
    addElements, addFloor, deleteFloor, duplicateFloorStructure,
    setFloorBlueprint, setFloorBlueprintOpacity, getActiveBlueprint, getActiveBlueprintOpacity,
    simulationOccupantCount, setSimulationOccupantCount,
    hazardSpreadRate
  } = useEditorStore();

  const activeFloor = floors.find((f) => f.id === activeFloorId);
  const activeFloorNumber = activeFloor ? activeFloor.floor_number : 0;
  const activeBlueprint = getActiveBlueprint();
  const activeBlueprintOpacity = getActiveBlueprintOpacity();
  
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDigitizing, setIsDigitizing] = useState(false);
  const [isRunningRace, setIsRunningRace] = useState(false);
  const [raceStatusText, setRaceStatusText] = useState("");
  const [isBlueprintMenuOpen, setIsBlueprintMenuOpen] = useState(false);

  const blueprintMenuRef = useRef<HTMLDivElement>(null);

  // Close blueprint popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (blueprintMenuRef.current && !blueprintMenuRef.current.contains(e.target as Node)) {
        setIsBlueprintMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAutoDigitize = async (file: File) => {
    setIsDigitizing(true);
    try {
      const targetFloorId = activeFloorId || floors[0]?.id;
      const targetFloor = floors.find((f) => f.id === targetFloorId);
      const floorTitle = targetFloor ? `${targetFloor.name} (Level ${targetFloor.floor_number})` : "Current Floor";

      // 1. Load as background reference for active floor
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result && targetFloorId) {
          setFloorBlueprint(targetFloorId, ev.target.result as string);
          setFloorBlueprintOpacity(targetFloorId, 0.35);
        }
      };
      reader.readAsDataURL(file);

      // 2. Call OpenCV digitizer backend for target floor
      const result = await digitizeBlueprint(file, 50.0, 30.0, targetFloorId);
      
      const newElements: any[] = [];
      if (result.walls && result.walls.length > 0) {
        newElements.push(...result.walls.map((w: any) => ({ ...w, floor_id: targetFloorId })));
      }
      if (result.rooms && result.rooms.length > 0) {
        newElements.push(...result.rooms.map((r: any) => ({ ...r, floor_id: targetFloorId })));
      }

      if (newElements.length > 0) {
        addElements(newElements);
        alert(`Auto-Digitization Complete for ${floorTitle}!\nExtracted ${result.walls.length} walls and ${result.rooms.length} rooms.\nClick '3D' to view in your Multi-Story Digital Twin!`);
      } else {
        alert("No clear walls or rooms could be detected in this image. Try an image with higher contrast or clear black lines.");
      }
    } catch (e: any) {
      alert(`Digitization error: ${e.message}`);
    } finally {
      setIsDigitizing(false);
      setIsBlueprintMenuOpen(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const idToSave = buildingId || uuidv4();
      const elements = getCurrentElements();
      await saveBuilding(idToSave, buildingName, floors, elements);
      if (!buildingId) {
        setBuildingInfo(idToSave, buildingName);
      }
      alert("Building saved successfully.");
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateGraph = async () => {
    if (!buildingId) {
      alert("Please save the building first before generating the graph.");
      return;
    }
    
    setIsGenerating(true);
    try {
      const elements = getCurrentElements();
      await saveBuilding(buildingId, buildingName, floors, elements);
      const newGraph = await generateGraph(buildingId);
      setGraph(newGraph);
      setShowGraphOverlay(true);
      alert(`Graph generated successfully!\nNodes: ${newGraph.nodes.length} | Edges: ${newGraph.edges.length}`);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRunSimulation = async () => {
    if (!buildingId) {
      alert("Please save and generate graph first.");
      return;
    }
    try {
      setIsGenerating(true);
      const { startSimulation, getSimulation } = await import("@/lib/api/client");
      
      const elements = getCurrentElements();
      await saveBuilding(buildingId, buildingName, floors, elements);

      // Map hazard elements to nearest graph nodes
      const hazardNodes: string[] = [];
      if (graph) {
        const hazards = elements.filter((el: any) => el.type === "HAZARD");
        hazards.forEach((h: any) => {
          const targetFloor = floors.find((f: any) => f.id === h.floor_id);
          const targetFloorNum = targetFloor !== undefined ? targetFloor.floor_number : 0;
          const floorNodes = graph.nodes.filter((n: any) => n.floor_number === targetFloorNum);
          const candidateNodes = floorNodes.length > 0 ? floorNodes : graph.nodes;

          let nearestNode = null;
          let minDist = Infinity;
          candidateNodes.forEach((n: any) => {
            const dist = Math.hypot(n.x - h.position_x, n.y - h.position_y);
            if (dist < minDist) {
              minDist = dist;
              nearestNode = n.id;
            }
          });
          if (nearestNode && !hazardNodes.includes(nearestNode)) {
            hazardNodes.push(nearestNode);
          }
        });
      }
      
      const runInfo = await startSimulation(buildingId, { 
        occupant_count: simulationOccupantCount, 
        tick_rate_hz: 5, 
        max_time_sec: 120,
        hazard_ignition_nodes: hazardNodes,
        hazard_spread_rate: hazardSpreadRate || 0.15,
        routing_algorithm: "ALGO_D"
      });
      let sim = runInfo;
      
      while (sim.status === "PENDING" || sim.status === "RUNNING") {
        await new Promise(r => setTimeout(r, 1000));
        sim = await getSimulation(sim.id);
      }
      
      if (sim.status === "FAILED") {
        alert("Simulation failed: " + sim.error_message);
      } else {
        useEditorStore.getState().setSimulationRun(sim);
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRun4HeadToHead = async () => {
    if (!buildingId) {
      alert("Please save the building first.");
      return;
    }
    setIsRunningRace(true);
    setRaceStatusText("Launching 4-Algorithm Head-to-Head Race...");
    try {
      const elements = getCurrentElements();
      await saveBuilding(buildingId, buildingName, floors, elements);

      // Collect hazard ignition nodes
      const hazardNodes: string[] = [];
      if (graph) {
        const hazards = elements.filter((el: any) => el.type === "HAZARD");
        hazards.forEach((h: any) => {
          const targetFloor = floors.find((f: any) => f.id === h.floor_id);
          const targetFloorNum = targetFloor !== undefined ? targetFloor.floor_number : 0;
          const floorNodes = graph.nodes.filter((n: any) => n.floor_number === targetFloorNum);
          const candidateNodes = floorNodes.length > 0 ? floorNodes : graph.nodes;

          let nearestNode = null;
          let minDist = Infinity;
          candidateNodes.forEach((n: any) => {
            const dist = Math.hypot(n.x - h.position_x, n.y - h.position_y);
            if (dist < minDist) {
              minDist = dist;
              nearestNode = n.id;
            }
          });
          if (nearestNode && !hazardNodes.includes(nearestNode)) {
            hazardNodes.push(nearestNode);
          }
        });
      }

      const { compareAlgorithms } = await import("@/lib/api/client");
      const payload = {
        occupant_count: simulationOccupantCount,
        tick_rate_hz: 5.0,
        max_time_sec: 120,
        hazard_ignition_nodes: hazardNodes,
        hazard_spread_rate: hazardSpreadRate || 0.15,
        algorithms: ["ALGO_A", "ALGO_B", "ALGO_C", "ALGO_D"]
      };

      setRaceStatusText("Running Dijkstra, Safety-Aware, Load-Aware, & Predictive...");
      const comparison = await compareAlgorithms(buildingId, payload);
      
      if (typeof window !== "undefined") {
        localStorage.setItem("latest_comparison", JSON.stringify(comparison));
      }

      router.push(`/simulations?buildingId=${buildingId}&race=true`);
    } catch (err: any) {
      alert(`Comparative race failed: ${err.message}`);
    } finally {
      setIsRunningRace(false);
      setRaceStatusText("");
    }
  };

  return (
    <div className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-3 shrink-0 shadow-xs z-10 overflow-x-auto scrollbar-none gap-2 select-none">
      
      {/* 1. Left Cluster: Building Name & Multi-Floor Navigation */}
      <div className="flex items-center space-x-2 shrink-0">
        <input 
          type="text" 
          value={buildingName} 
          onChange={(e) => setBuildingInfo(buildingId || "", e.target.value)} 
          className="font-bold text-slate-800 text-xs border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none bg-slate-50 px-2.5 py-1.5 rounded-lg w-32 sm:w-40 transition-colors" 
          placeholder="Building Name..." 
          title="Click to rename building" 
        />

        {/* Multi-Floor Management */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
          <Building size={14} className="text-indigo-600 ml-1 shrink-0" />
          <select 
            className="bg-transparent border-none text-xs font-bold text-slate-700 outline-none cursor-pointer pr-1"
            value={activeFloorId || ""}
            onChange={(e) => setActiveFloor(e.target.value)}
          >
            {floors.map((f) => (
              <option key={f.id} value={f.id}>
                {f.floor_number === 0 ? "L0: Ground" : `L${f.floor_number}: ${f.name}`}
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              const newId = addFloor();
              const newFloor = useEditorStore.getState().floors.find((f) => f.id === newId);
              alert(`Created ${newFloor?.name || "New Floor"}!`);
            }}
            className="p-1 text-indigo-700 hover:bg-indigo-100 rounded transition-colors cursor-pointer"
            title="Add Next Floor Level (e.g. Floor 1, Floor 2)"
          >
            <Plus size={14} />
          </button>

          {activeFloor && activeFloor.floor_number > 0 && (
            <button
              onClick={() => {
                const lowerFloor = floors.find((f) => f.floor_number === activeFloor.floor_number - 1);
                if (lowerFloor && activeFloorId) {
                  if (confirm(`Duplicate walls & stairs from ${lowerFloor.name} to ${activeFloor.name}?`)) {
                    duplicateFloorStructure(lowerFloor.id, activeFloorId);
                    alert(`Copied structure from ${lowerFloor.name}!`);
                  }
                }
              }}
              className="p-1 text-slate-600 hover:bg-slate-200 rounded transition-colors cursor-pointer"
              title="Copy outer walls & stairs from floor below"
            >
              <Copy size={13} />
            </button>
          )}

          {floors.length > 1 && (
            <button
              onClick={() => {
                if (activeFloorId && confirm(`Delete ${activeFloor?.name}? Elements on this floor will be deleted.`)) {
                  deleteFloor(activeFloorId);
                }
              }}
              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
              title="Delete Active Floor"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>
      
      {/* 2. Middle Cluster: Blueprint Tools, 2D/3D, Snap, Save, Graph */}
      <div className="flex items-center space-x-1.5 shrink-0">
        {/* Compact Blueprint & CAD Popover Menu (Saves 350px of horizontal topbar space!) */}
        <div className="relative" ref={blueprintMenuRef}>
          <button
            onClick={() => setIsBlueprintMenuOpen(!isBlueprintMenuOpen)}
            className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              activeBlueprint 
                ? "bg-purple-50 text-purple-700 border-purple-300 shadow-2xs" 
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
            title="Blueprint & CAD Sketch Tools"
          >
            <Wand2 size={13} className={activeBlueprint ? "text-purple-600" : "text-slate-500"} />
            <span>Blueprint</span>
            {activeBlueprint && <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />}
            <ChevronDown size={12} className="text-slate-400 ml-0.5" />
          </button>

          {isBlueprintMenuOpen && (
            <div className="absolute top-full left-0 mt-1.5 w-64 bg-white rounded-xl shadow-2xl border border-slate-200 p-3 z-50 flex flex-col space-y-2.5 animate-in fade-in slide-in-from-top-1">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-1.5">
                Level {activeFloorNumber} Blueprint Tools
              </div>

              {/* ⚡ Auto-Digitize (OpenCV Vision) */}
              <label 
                className={`flex items-center justify-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-bold text-white transition-all cursor-pointer shadow-xs ${
                  isDigitizing
                    ? "bg-purple-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                }`}
              >
                {isDigitizing ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Analyzing Image...</span>
                  </>
                ) : (
                  <>
                    <Wand2 size={14} />
                    <span>⚡ Auto-Digitize Blueprint</span>
                  </>
                )}
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  disabled={isDigitizing}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleAutoDigitize(file);
                      e.target.value = "";
                    }
                  }}
                />
              </label>

              {/* Reference Upload */}
              <label className="flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 cursor-pointer transition-colors">
                <Upload size={13} className="text-slate-500" />
                <span>Upload Sketch Image</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    const targetFloorId = activeFloorId || floors[0]?.id;
                    if (file && targetFloorId) {
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        if (ev.target?.result) {
                          setFloorBlueprint(targetFloorId, ev.target.result as string);
                          setFloorBlueprintOpacity(targetFloorId, 0.4);
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                    setIsBlueprintMenuOpen(false);
                  }}
                />
              </label>

              {/* Opacity Slider */}
              {activeBlueprint && (
                <div className="pt-1.5 border-t border-slate-100">
                  <div className="flex justify-between text-[10px] text-slate-500 mb-1 font-semibold">
                    <span>Opacity</span>
                    <span>{Math.round((activeBlueprintOpacity || 0.4) * 100)}%</span>
                  </div>
                  <input 
                    type="range" min="0" max="1" step="0.05" 
                    value={activeBlueprintOpacity !== undefined ? activeBlueprintOpacity : 0.4} 
                    onChange={(e) => {
                      if (activeFloorId) {
                        setFloorBlueprintOpacity(activeFloorId, parseFloat(e.target.value));
                      }
                    }}
                    className="w-full h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* 2D / 3D Mode Toggle */}
        <button 
          onClick={() => setIs3DMode(!is3DMode)}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
            is3DMode 
              ? "bg-slate-900 text-white border-slate-900 shadow-2xs" 
              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
          }`}
          title="Toggle 2D Floorplan & 3D Multi-Story Digital Twin"
        >
          {is3DMode ? "2D View" : "3D View"}
        </button>

        {/* Snap */}
        <button 
          onClick={() => setGridSnapping(!gridSnapping)}
          className={`flex items-center px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
            gridSnapping 
              ? "bg-blue-50 text-blue-700 border-blue-200 shadow-2xs" 
              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
          }`}
          title="Toggle Grid Snapping"
        >
          <Magnet size={13} className="mr-1" />
          <span>Snap</span>
        </button>

        {/* Save */}
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition-colors border border-slate-200 disabled:opacity-50 cursor-pointer"
          title="Save Building & Floor Structure (Ctrl + S)"
        >
          {isSaving ? <Loader2 size={13} className="mr-1 animate-spin text-indigo-600" /> : <Save size={13} className="mr-1 text-slate-500" />}
          <span>Save</span>
        </button>

        {/* Generate Graph */}
        <button 
          onClick={handleGenerateGraph}
          disabled={isGenerating}
          className="flex items-center px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
          title="Generate spatial navigation mesh & graph edges"
        >
          {isGenerating ? <Loader2 size={13} className="mr-1 animate-spin" /> : <Play size={13} className="mr-1" />}
          <span>Graph</span>
        </button>
      </div>

      {/* 3. VIP Right Cluster: Execution Hub (ALWAYS VISIBLE & PROMINENT) */}
      <div className="flex items-center space-x-2 shrink-0">
        
        {/* Occupant Count Input & Presets */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 shadow-2xs">
          <div className="flex items-center px-1.5 py-0.5 text-xs gap-1" title="Select number of evacuees">
            <Users size={13} className="text-emerald-700 shrink-0" />
            <input
              type="number"
              min={1}
              max={1000}
              value={simulationOccupantCount}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setSimulationOccupantCount(isNaN(val) ? 1 : Math.max(1, Math.min(1000, val)));
              }}
              className="w-10 text-center font-bold text-slate-800 bg-white border border-slate-300 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
            />
          </div>

          <div className="hidden xl:flex items-center space-x-0.5 pr-1 border-l border-slate-200 pl-1">
            {[10, 25, 50, 100].map((preset) => (
              <button
                key={preset}
                onClick={() => setSimulationOccupantCount(preset)}
                className={`px-1 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                  simulationOccupantCount === preset
                    ? "bg-emerald-600 text-white"
                    : "bg-white text-slate-600 hover:bg-slate-200 border border-slate-200/80"
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* VIP Button 1: Run Simulation (Single Algorithm) */}
        <button 
          onClick={handleRunSimulation}
          disabled={isGenerating || isRunningRace}
          className="flex items-center px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-lg shadow-sm transition-all disabled:opacity-50 cursor-pointer"
          title={`Run predictive evacuation simulation with ${simulationOccupantCount} people`}
        >
          {isGenerating ? <Loader2 size={13} className="mr-1.5 animate-spin" /> : <Play size={13} className="mr-1.5 fill-current" />}
          <span>Run ({simulationOccupantCount})</span>
        </button>

        {/* VIP Button 2: Run 4 Head-to-Head Race (PROMINENT & DIRECTLY EXECUTABLE!) */}
        <button
          onClick={handleRun4HeadToHead}
          disabled={isRunningRace || isGenerating}
          className="flex items-center px-3.5 py-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-purple-600 hover:from-amber-600 hover:to-purple-700 active:scale-95 text-white text-xs font-bold rounded-lg shadow-sm transition-all disabled:opacity-50 cursor-pointer ring-1 ring-amber-300/40"
          title="Run 4 Head-to-Head Race: Simultaneously compare Algorithm A (Shortest), B (Safety), C (Load), and D (Predictive)"
        >
          {isRunningRace ? (
            <>
              <Loader2 size={14} className="mr-1.5 animate-spin text-amber-200" />
              <span>{raceStatusText || "Racing 4 Algos..."}</span>
            </>
          ) : (
            <>
              <Trophy size={14} className="mr-1.5 text-amber-200 shrink-0" />
              <span>Run 4 Head-to-Head</span>
            </>
          )}
        </button>
      </div>

    </div>
  );
}
