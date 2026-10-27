"use client";

import { EditorToolbar } from "@/components/editor/EditorToolbar";
import { EditorTopbar } from "@/components/editor/EditorTopbar";
import { PropertiesPanel } from "@/components/editor/PropertiesPanel";
import { EditorCanvas } from "@/components/editor/EditorCanvas";
import { EditorCanvas3D } from "@/components/editor/EditorCanvas3D";
import { SimulationPlayback } from "@/components/editor/SimulationPlayback";
import { ExitIntelligenceHUD } from "@/components/editor/ExitIntelligenceHUD";
import { useEditorStore } from "@/store/editorStore";
import { useSearchParams } from "next/navigation";
import { useEffect, Suspense, useState } from "react";
import { getSimulation, getBuilding, generateGraph } from "@/lib/api/client";

function EditorContent() {
  const is3DMode = useEditorStore((state) => state.is3DMode);
  const searchParams = useSearchParams();
  const simId = searchParams.get("simId");
  const buildingId = searchParams.get("buildingId");
  const [loadingSim, setLoadingSim] = useState(false);

  useEffect(() => {
    if (simId) {
      setLoadingSim(true);
      const poll = async () => {
        try {
          let sim = await getSimulation(simId);
          while (sim.status === "PENDING" || sim.status === "RUNNING") {
            await new Promise(r => setTimeout(r, 1000));
            sim = await getSimulation(simId);
          }
          if (sim.status === "SUCCESS" || sim.status === "COMPLETED") {
            useEditorStore.getState().setSimulationRun(sim);
          } else {
            console.error("Simulation failed:", sim.error_message);
          }
        } catch (e) {
          console.error("Failed to load simulation:", e);
        } finally {
          setLoadingSim(false);
        }
      };
      poll();
    }
  }, [simId]);

  // Optionally load the building if it's missing from store (e.g. hard refresh or scenarios redirect)
  useEffect(() => {
    if (buildingId && useEditorStore.getState().buildingId !== buildingId) {
      getBuilding(buildingId).then(b => {
        useEditorStore.getState().setBuildingInfo(b.id, b.name);
        
        // Extract all elements from floors
        const allElements: any[] = [];
        const floors = b.floors || [];
        for (const f of floors) {
          if (f.rooms) allElements.push(...f.rooms.map((r: any) => ({ ...r, type: 'ROOM' })));
          if (f.walls) allElements.push(...f.walls.map((w: any) => ({ ...w, type: 'WALL' })));
          if (f.doors) allElements.push(...f.doors.map((d: any) => ({ ...d, type: 'DOOR' })));
          if (f.stairs) allElements.push(...f.stairs.map((s: any) => ({ ...s, type: 'STAIR' })));
          if (f.exits) allElements.push(...f.exits.map((ex: any) => ({ ...ex, type: 'EXIT' })));
        }
        
        useEditorStore.getState().loadState(floors, allElements);
        
        // Auto-generate & set navigation graph immediately so the building is simulation-ready
        generateGraph(b.id).then(graph => {
          useEditorStore.getState().setGraph(graph);
        }).catch(err => console.warn("Auto-graph on editor page mount:", err));
      }).catch(console.error);
    }
  }, [buildingId]);

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden relative">
      <EditorTopbar />
      {loadingSim && (
        <div className="absolute top-16 right-4 z-50 bg-blue-600 text-white px-4 py-2 rounded-md shadow-lg flex items-center text-sm font-medium animate-pulse">
          Calculating simulation...
        </div>
      )}
      <div className="flex flex-1 overflow-hidden relative">
        {!is3DMode && <EditorToolbar />}
        {is3DMode ? <EditorCanvas3D /> : <EditorCanvas />}
        {!is3DMode && <PropertiesPanel />}
        <SimulationPlayback />
        <ExitIntelligenceHUD />
      </div>
    </div>
  );
}

export default function EditorPage() {
  return (
    <Suspense fallback={<div>Loading Editor...</div>}>
      <EditorContent />
    </Suspense>
  );
}

