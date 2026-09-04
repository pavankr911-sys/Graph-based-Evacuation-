"use client";

import { useEditorStore } from "@/store/editorStore";
import { Layers, Magnet, Save, Play, Loader2 } from "lucide-react";
import { useState } from "react";
import { saveBuilding, generateGraph } from "@/lib/api/client";
import { v4 as uuidv4 } from "uuid";

export function EditorTopbar() {
  const { 
    floors, activeFloorId, setActiveFloor, gridSnapping, setGridSnapping,
    buildingId, buildingName, setBuildingInfo, getCurrentElements, setGraph,
    is3DMode, setIs3DMode, graph, showGraphOverlay, setShowGraphOverlay
  } = useEditorStore();
  
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

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
        <div className="font-semibold text-slate-800 text-sm border-r border-slate-200 pr-4">
          {buildingName}
        </div>
        <div className="flex items-center text-slate-700 bg-slate-100 rounded-md px-3 py-1.5 border border-slate-200">
          <Layers size={16} className="mr-2 text-slate-500" />
          <select 
            className="bg-transparent border-none text-sm font-medium outline-none cursor-pointer"
            value={activeFloorId || ""}
            onChange={(e) => setActiveFloor(e.target.value)}
          >
            {floors.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="flex items-center space-x-3">
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
        
        <button 
          onClick={async () => {
            if (!buildingId) {
              alert("Please save and generate graph first.");
              return;
            }
            try {
              setIsGenerating(true);
              const { startSimulation, getSimulation } = await import("@/lib/api/client");
              const runInfo = await startSimulation(buildingId, { occupant_count: 20, tick_rate_hz: 5, max_time_sec: 120 });
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
          className="flex items-center px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-md shadow-sm transition-colors disabled:opacity-50"
        >
          <Play size={16} className="mr-2" />
          Run Simulation
        </button>
      </div>
    </div>
  );
}
