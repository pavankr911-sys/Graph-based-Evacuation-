"use client";

import { useEditorStore } from "@/store/editorStore";
import { Layers, Magnet, Save, Play, Loader2, Sparkles, Wand2, Trophy, Plus, Copy, Trash2, Building, Users, FolderOpen } from "lucide-react";
import { SavedBuildingsModal } from "./SavedBuildingsModal";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveBuilding, generateGraph, digitizeBlueprint } from "@/lib/api/client";
import { v4 as uuidv4 } from "uuid";

export function EditorTopbar() {
  const router = useRouter();
  const { 
    floors, activeFloorId, setActiveFloor, gridSnapping, setGridSnapping,
    buildingId, buildingName, setBuildingInfo, getCurrentElements, setGraph,
    is3DMode, setIs3DMode, graph, showGraphOverlay, setShowGraphOverlay, 
    blueprintImage, blueprintOpacity, setBlueprintImage, setBlueprintOpacity,
    addElements, addFloor, deleteFloor, renameFloor, duplicateFloorStructure,
    setFloorBlueprint, setFloorBlueprintOpacity, getActiveBlueprint, getActiveBlueprintOpacity,
    simulationOccupantCount, setSimulationOccupantCount,
    hazardSpreadRate, setHazardSpreadRate
  } = useEditorStore();

  const activeFloor = floors.find((f) => f.id === activeFloorId);
  const activeBlueprint = getActiveBlueprint();
  const activeBlueprintOpacity = getActiveBlueprintOpacity();
  
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDigitizing, setIsDigitizing] = useState(false);
  const [isBuildingsModalOpen, setIsBuildingsModalOpen] = useState(false);

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
          setFloorBlueprintOpacity(targetFloorId, 0.3);
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
      // It's a good idea to save first to ensure backend has latest state
      const elements = getCurrentElements();
      await saveBuilding(buildingId, buildingName, floors, elements);
      
      const graph = await generateGraph(buildingId);
      setGraph(graph);
      alert(`Graph generated successfully!\\nNodes: ${graph.nodes.length}\\nEdges: ${graph.edges.length}`);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0 shadow-sm z-10">
      <div className="flex items-center space-x-4">
        <input type="text" value={buildingName} onChange={(e) => setBuildingInfo(buildingId || "", e.target.value)} className="font-semibold text-slate-800 text-sm border border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none bg-slate-50 px-2 py-1 rounded transition-colors" placeholder="Building Name..." title="Click to rename building" />
        
        {/* Saved Buildings Library Manager */}
        <button
          onClick={() => setIsBuildingsModalOpen(true)}
          className="flex items-center px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200 transition-colors shadow-2xs cursor-pointer active:scale-95 shrink-0"
          title="Open Saved Buildings Library & Pre-Configured Demo Templates"
        >
          <FolderOpen size={14} className="mr-1.5 text-indigo-600" />
          <span>Saved Buildings</span>
        </button>
        {/* Multi-Floor Management Suite */}
        <div className="flex items-center space-x-1.5">
          <div className="flex items-center text-slate-700 bg-slate-100 rounded-md px-3 py-1.5 border border-slate-200">
            <Building size={16} className="mr-2 text-indigo-600" />
            <select 
              className="bg-transparent border-none text-sm font-semibold outline-none cursor-pointer"
              value={activeFloorId || ""}
              onChange={(e) => setActiveFloor(e.target.value)}
            >
              {floors.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.floor_number === 0 ? "🏢 Ground Floor" : `🏢 Floor ${f.floor_number}`} ({f.name})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              const newId = addFloor();
              const newFloor = useEditorStore.getState().floors.find((f) => f.id === newId);
              alert(`Created ${newFloor?.name || "New Floor"}!\nYou can now draw or click 'Auto-Digitize Blueprint' for this level.`);
            }}
            className="flex items-center px-2.5 py-1.5 text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-md transition-colors cursor-pointer"
            title="Add Next Floor Level (e.g. Floor 1, Floor 2)"
          >
            <Plus size={14} className="mr-1" />
            Add Floor
          </button>

          {activeFloor && activeFloor.floor_number > 0 && (
            <button
              onClick={() => {
                const lowerFloor = floors.find((f) => f.floor_number === activeFloor.floor_number - 1);
                if (lowerFloor && activeFloorId) {
                  if (confirm(`Duplicate walls and stair shafts from ${lowerFloor.name} to ${activeFloor.name}?`)) {
                    duplicateFloorStructure(lowerFloor.id, activeFloorId);
                    alert(`Copied structure from ${lowerFloor.name}!`);
                  }
                }
              }}
              className="flex items-center px-2 py-1.5 text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 rounded-md transition-colors cursor-pointer"
              title="Copy outer walls & stair shafts from the floor below (guarantees stair shafts align)"
            >
              <Copy size={13} className="mr-1 text-slate-500" />
              Copy Below
            </button>
          )}

          {floors.length > 1 && (
            <button
              onClick={() => {
                if (activeFloorId && confirm(`Delete ${activeFloor?.name}? All elements on this level will be removed.`)) {
                  deleteFloor(activeFloorId);
                }
              }}
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
              title="Delete Active Floor"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
      
      <div className="flex items-center space-x-3">
        {activeBlueprint && (
          <div className="flex items-center space-x-2 mr-2 border-r border-slate-200 pr-4">
            <span className="text-xs text-slate-500 font-medium">Sketch Opacity</span>
            <input 
              type="range" min="0" max="1" step="0.05" 
              value={activeBlueprintOpacity !== undefined ? activeBlueprintOpacity : 0.4} 
              onChange={(e) => {
                const targetFloorId = activeFloorId || floors[0]?.id;
                if (targetFloorId) {
                  setFloorBlueprintOpacity(targetFloorId, parseFloat(e.target.value));
                }
              }}
              className="w-20"
            />
          </div>
        )}

        <label className="flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors border bg-white text-slate-600 border-slate-200 hover:bg-slate-50 cursor-pointer" title="Upload CAD floorplan sketch for this active level">
          <span className="mr-1.5">Upload Blueprint</span>
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
            }}
          />
        </label>

        <label 
          className={`flex items-center px-3 py-1.5 rounded-md text-sm font-semibold transition-all border cursor-pointer ${
            isDigitizing
              ? "bg-purple-100 text-purple-700 border-purple-300 animate-pulse"
              : "bg-gradient-to-r from-purple-50 to-indigo-50 text-indigo-700 border-indigo-200 hover:border-indigo-400 hover:shadow-xs"
          }`}
          title="Upload a CAD sketch or floorplan image to automatically extract walls & rooms using OpenCV Computer Vision"
        >
          {isDigitizing ? (
            <>
              <Loader2 size={16} className="mr-1.5 animate-spin text-purple-600" />
              <span>Digitizing Sketch...</span>
            </>
          ) : (
            <>
              <Wand2 size={16} className="mr-1.5 text-indigo-600" />
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

        {graph && (
           <button
              onClick={() => setShowGraphOverlay(!showGraphOverlay)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md border transition-colors ${
                showGraphOverlay 
                ? "bg-purple-100 text-purple-700 border-purple-200" 
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
           >
             {showGraphOverlay ? "Hide Graph" : "Show Graph"}
           </button>
        )}

        <button 
          onClick={() => setIs3DMode(!is3DMode)}
          className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors border ${
            is3DMode 
              ? "bg-slate-800 text-white border-slate-900" 
              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
          }`}
          title="Toggle 3D View"
        >
          {is3DMode ? "2D" : "3D"}
        </button>
        
        <button 
          onClick={() => setGridSnapping(!gridSnapping)}
          className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors border ${
            gridSnapping 
              ? "bg-blue-50 text-blue-700 border-blue-200" 
              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
          }`}
          title="Toggle Grid Snapping"
        >
          <Magnet size={16} className="mr-2" />
          Snap
        </button>
        
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-md shadow-sm transition-colors border border-slate-200 disabled:opacity-50"
        >
          {isSaving ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Save size={16} className="mr-2" />}
          Save
        </button>
        
        <button 
          onClick={handleGenerateGraph}
          disabled={isGenerating}
          className="flex items-center px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-md shadow-sm transition-colors disabled:opacity-50"
        >
          {isGenerating ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Play size={16} className="mr-2" />}
          Generate Graph
        </button>
        
        {/* Occupant Selection & Run Simulation Group */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 shadow-2xs">
          <div className="flex items-center px-2 py-1 text-xs gap-1.5" title="Select number of simulated people">
            <Users size={14} className="text-emerald-700 shrink-0" />
            <span className="text-slate-600 font-medium whitespace-nowrap">People:</span>
            <input
              type="number"
              min={1}
              max={1000}
              value={simulationOccupantCount}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setSimulationOccupantCount(isNaN(val) ? 1 : Math.max(1, Math.min(1000, val)));
              }}
              className="w-12 text-center font-bold text-slate-800 bg-white border border-slate-300 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
            />
            {/* Quick Presets */}
            <div className="hidden sm:flex items-center space-x-1 pl-1 border-l border-slate-200">
              {[10, 25, 50, 100].map((preset) => (
                <button
                  key={preset}
                  onClick={() => setSimulationOccupantCount(preset)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-all ${
                    simulationOccupantCount === preset
                      ? "bg-emerald-600 text-white shadow-2xs"
                      : "bg-white text-slate-600 hover:bg-slate-200 border border-slate-200"
                  }`}
                  title={`Set to ${preset} people`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <button 
            onClick={async () => {
              if (!buildingId) {
                alert("Please save and generate graph first.");
                return;
              }
              try {
                setIsGenerating(true);
                const { startSimulation, getSimulation } = await import("@/lib/api/client");
                
                // Find hazard elements and map to nearest graph nodes on matching floor
                const hazardNodes: string[] = [];
                if (graph) {
                  const elements = getCurrentElements();
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
                
                // Poll until complete
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
            }}
            disabled={isGenerating}
            className="flex items-center px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-md shadow-sm transition-colors disabled:opacity-50 ml-1"
            title={`Run evacuation simulation with ${simulationOccupantCount} people`}
          >
            {isGenerating ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <Play size={14} className="mr-1.5" />}
            Run ({simulationOccupantCount})
          </button>
        </div>
        
        <button
          onClick={() => {
            if (!buildingId) {
              alert("Please save the building first.");
              return;
            }
            router.push(`/scenarios?buildingId=${buildingId}`);
          }}
          className="flex items-center px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-sm font-semibold rounded-md shadow-xs transition-all"
          title="Configure emergency scenarios or launch head-to-head algorithm race for this building"
        >
          <Trophy size={16} className="mr-1.5 text-amber-200" />
          Scenarios Race
        </button>
      </div>

      {/* Saved Buildings Library Modal */}
      <SavedBuildingsModal
        isOpen={isBuildingsModalOpen}
        onClose={() => setIsBuildingsModalOpen(false)}
      />
    </div>
  );
}
