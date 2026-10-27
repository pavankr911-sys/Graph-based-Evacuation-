"use client";

import { useEffect, useState } from "react";
import { Building2, Plus, Trash2, FolderOpen, Play, Trophy, Sparkles, Check, X, Loader2, ArrowRight } from "lucide-react";
import { useEditorStore } from "@/store/editorStore";
import { getBuildings, deleteBuilding, getBuilding, saveBuilding, generateGraph } from "@/lib/api/client";
import { createSampleAcademicBuilding } from "@/lib/editor/sampleBuilding";
import { useRouter } from "next/navigation";

interface SavedBuildingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SavedBuildingsModal({ isOpen, onClose }: SavedBuildingsModalProps) {
  const router = useRouter();
  const { 
    buildingId, buildingName, setBuildingInfo, loadState, newBuilding,
    floors, getCurrentElements 
  } = useEditorStore();

  const [buildings, setBuildings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchList = async () => {
    setLoading(true);
    try {
      const data = await getBuildings();
      setBuildings(data || []);
    } catch (err) {
      console.error("Failed to load buildings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchList();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOpenBuilding = async (bId: string) => {
    setActionLoadingId(bId);
    try {
      const b = await getBuilding(bId);
      const allElements: any[] = [];
      const bFloors = b.floors || [];
      for (const f of bFloors) {
        if (f.rooms) allElements.push(...f.rooms.map((r: any) => ({ ...r, type: "ROOM" })));
        if (f.walls) allElements.push(...f.walls.map((w: any) => ({ ...w, type: "WALL" })));
        if (f.doors) allElements.push(...f.doors.map((d: any) => ({ ...d, type: "DOOR" })));
        if (f.stairs) allElements.push(...f.stairs.map((s: any) => ({ ...s, type: "STAIR" })));
        if (f.exits) allElements.push(...f.exits.map((ex: any) => ({ ...ex, type: "EXIT" })));
      }
      setBuildingInfo(b.id, b.name);
      loadState(bFloors, allElements);
      
      // Auto-generate & store navigation graph immediately so building is 100% simulation-ready!
      try {
        const graph = await generateGraph(b.id);
        useEditorStore.getState().setGraph(graph);
      } catch (gErr) {
        console.warn("Auto-graph on open building:", gErr);
      }
      
      onClose();
    } catch (err: any) {
      alert(`Failed to load building: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteBuilding = async (bId: string, bName: string) => {
    if (!confirm(`Are you sure you want to delete "${bName}"? This action cannot be undone.`)) {
      return;
    }
    setActionLoadingId(bId);
    try {
      await deleteBuilding(bId);
      // If active building was deleted, reset to new
      if (buildingId === bId) {
        newBuilding();
      }
      await fetchList();
    } catch (err: any) {
      alert(`Failed to delete building: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleClearAll = async () => {
    if (!confirm(`Are you sure you want to delete all ${buildings.length} saved buildings? This gives you a completely fresh slate.`)) {
      return;
    }
    setActionLoadingId("clearAll");
    try {
      for (const b of buildings) {
        await deleteBuilding(b.id);
      }
      newBuilding();
      await fetchList();
      alert("All previous building records have been cleared. Ready for fresh buildings!");
    } catch (err: any) {
      alert(`Failed to clear buildings: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleLoadSampleDemo = async () => {
    setActionLoadingId("sample");
    try {
      const sample = createSampleAcademicBuilding();
      // Save it to backend so it shows up in future lists and simulations
      await saveBuilding(sample.buildingId, sample.buildingName, sample.floors, sample.elements);
      setBuildingInfo(sample.buildingId, sample.buildingName);
      loadState(sample.floors, sample.elements);
      
      // Auto-generate & store navigation graph immediately so it's 100% simulation-ready!
      try {
        const graph = await generateGraph(sample.buildingId);
        useEditorStore.getState().setGraph(graph);
      } catch (gErr) {
        console.warn("Auto-graph on sample demo:", gErr);
      }
      
      onClose();
    } catch (err: any) {
      alert(`Failed to load sample building: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleStartNew = () => {
    if (confirm("Start a new blank building? Any unsaved changes in your current building will be lost.")) {
      newBuilding();
      onClose();
    }
  };

  const handleSaveAsCopy = async () => {
    const copyName = prompt("Enter a name for this building copy:", `${buildingName} (Copy)`);
    if (!copyName || copyName.trim() === "") return;
    
    setActionLoadingId("saveAs");
    try {
      const { v4: uuidv4 } = await import("uuid");
      const newId = uuidv4();
      const elements = getCurrentElements();
      await saveBuilding(newId, copyName.trim(), floors, elements);
      setBuildingInfo(newId, copyName.trim());
      
      // Auto-generate & store navigation graph immediately
      try {
        const graph = await generateGraph(newId);
        useEditorStore.getState().setGraph(graph);
      } catch (gErr) {
        console.warn("Auto-graph on save copy:", gErr);
      }
      
      await fetchList();
      alert(`Building saved as "${copyName.trim()}"!`);
    } catch (err: any) {
      alert(`Failed to save copy: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 select-none"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shadow-xs">
              <FolderOpen size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Saved Buildings & Models
                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-mono font-bold">
                  {buildings.length} saved
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Instantly load your named buildings for live faculty presentation or demonstration without redrawing.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Quick Actions Bar */}
        <div className="px-6 py-3 bg-gradient-to-r from-indigo-50/70 to-purple-50/70 border-b border-indigo-100 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleLoadSampleDemo}
              disabled={actionLoadingId !== null}
              className="flex items-center px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-bold rounded-lg shadow-xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              title="Loads a complete, pre-configured 2-Story Academic Wing with classrooms, corridors, stairwells, exits, and fire hazards"
            >
              <Sparkles size={14} className="mr-1.5 text-amber-300" />
              <span>⚡ Load Academic Demo (2 Floors + Stairs)</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleSaveAsCopy}
              disabled={actionLoadingId !== null}
              className="flex items-center px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 shadow-2xs transition-all cursor-pointer active:scale-95"
              title="Save current layout as a new named building"
            >
              <span>💾 Save As New Name...</span>
            </button>

            <button
              onClick={handleStartNew}
              className="flex items-center px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 shadow-2xs transition-all cursor-pointer active:scale-95"
              title="Start a blank canvas"
            >
              <Plus size={14} className="mr-1 text-slate-500" />
              <span>+ New Blank</span>
            </button>

            {buildings.length > 0 && (
              <button
                onClick={handleClearAll}
                disabled={actionLoadingId !== null}
                className="flex items-center px-2.5 py-1.5 bg-white hover:bg-red-50 text-slate-400 hover:text-red-600 text-xs font-medium rounded-lg border border-slate-200 hover:border-red-200 transition-colors cursor-pointer"
                title="Clear all saved buildings for a fresh slate"
              >
                <Trash2 size={13} className="mr-1 text-slate-400" />
                <span>Clear All</span>
              </button>
            )}
          </div>
        </div>

        {/* Building List */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-2">
              <Loader2 size={24} className="animate-spin text-indigo-600" />
              <span className="text-xs">Loading saved buildings...</span>
            </div>
          ) : buildings.length === 0 ? (
            <div className="py-12 text-center flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-6 bg-slate-50/50">
              <Building2 size={36} className="text-slate-300 mb-2" />
              <h3 className="text-sm font-bold text-slate-700">No Saved Buildings Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
                Save your current floorplan with the "Save" button, or load our complete pre-configured University Academic Wing demo.
              </p>
              <button
                onClick={handleLoadSampleDemo}
                className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer"
              >
                <Sparkles size={14} className="mr-1.5 text-amber-300" />
                <span>Load University Academic Wing Demo</span>
              </button>
            </div>
          ) : (
            buildings.map((b) => {
              const isCurrent = b.id === buildingId;
              const isLoading = actionLoadingId === b.id;

              return (
                <div
                  key={b.id}
                  className={`p-4 rounded-xl border transition-all flex items-center justify-between ${
                    isCurrent
                      ? "bg-indigo-50/40 border-indigo-300 ring-1 ring-indigo-200 shadow-xs"
                      : "bg-white hover:bg-slate-50/80 border-slate-200 shadow-2xs"
                  }`}
                >
                  <div className="flex items-center space-x-3.5">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${
                      isCurrent
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 text-slate-600 border border-slate-200"
                    }`}>
                      <Building2 size={20} />
                    </div>

                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm text-slate-900 tracking-tight">
                          {b.name || "Untitled Building"}
                        </span>
                        {isCurrent && (
                          <span className="flex items-center text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                            <Check size={11} className="mr-0.5" /> CURRENTLY OPEN
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center space-x-3 mt-1">
                        <span>🏢 {b.total_floors || 1} {b.total_floors === 1 ? "Floor" : "Floors"}</span>
                        <span>•</span>
                        <span className="font-mono text-[11px] text-slate-400">ID: {b.id.slice(0, 8)}...</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleOpenBuilding(b.id)}
                      disabled={isLoading || isCurrent}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1 ${
                        isCurrent
                          ? "bg-slate-100 text-slate-400 cursor-default"
                          : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs active:scale-95"
                      }`}
                    >
                      {isLoading ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <span>{isCurrent ? "Active" : "Open in Editor"}</span>
                      )}
                    </button>

                    <button
                      onClick={() => {
                        onClose();
                        router.push(`/scenarios?buildingId=${b.id}&mode=race`);
                      }}
                      className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-xs font-semibold transition-all cursor-pointer active:scale-95"
                      title="Run 4 Head-to-Head Algorithm Race on this building"
                    >
                      <Trophy size={14} />
                    </button>

                    <button
                      onClick={() => handleDeleteBuilding(b.id, b.name)}
                      disabled={isLoading}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Delete building from saved list"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
          <span>Tip: You can rename any building anytime in the topbar and click "Save".</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
