"use client";

import { useEditorStore } from "@/store/editorStore";
import { MousePointer2, Square, Grid3x3, DoorOpen, ListStart, ArrowRightSquare, Undo, Redo, Trash2, Flame, LucideIcon } from "lucide-react";
import { ToolType } from "@/lib/editor/types";

const TOOLS: { id: ToolType; icon: LucideIcon; label: string; shortcut: string }[] = [
  { id: "SELECT", icon: MousePointer2, label: "Select", shortcut: "V" },
  { id: "ROOM", icon: Square, label: "Room", shortcut: "R" },
  { id: "WALL", icon: Grid3x3, label: "Wall", shortcut: "W" },
  { id: "DOOR", icon: DoorOpen, label: "Door", shortcut: "D" },
  { id: "STAIR", icon: ListStart, label: "Stair", shortcut: "S" },
  { id: "EXIT", icon: ArrowRightSquare, label: "Exit", shortcut: "E" },
  { id: "HAZARD", icon: Flame, label: "Fire / Hazard Brush", shortcut: "H" },
];

export function EditorToolbar() {
  const { 
    activeTool, setActiveTool, 
    undo, redo, history, historyIndex,
    selectedElementId, deleteElement,
    getCurrentElements, activeFloorId, clearHazards
  } = useEditorStore();

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const currentElements = getCurrentElements();
  const floorHazards = currentElements.filter(e => e.type === "HAZARD" && e.floor_id === activeFloorId);
  const totalHazards = currentElements.filter(e => e.type === "HAZARD");

  return (
    <div className="w-16 bg-white border-r border-slate-200 flex flex-col items-center py-4 space-y-4 shrink-0 z-10 shadow-sm">
      <div className="flex flex-col space-y-2 w-full px-2">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;
          const isFireTool = tool.id === "HAZARD";
          const hasFires = isFireTool && totalHazards.length > 0;

          return (
            <button
              key={tool.id}
              title={`${tool.label} (${tool.shortcut}) - ${isFireTool ? "Click anywhere on floor to place/toggle fire sources" : ""}`}
              onClick={() => setActiveTool(tool.id)}
              className={`relative p-3 rounded-xl flex items-center justify-center transition-all ${
                isFireTool && isActive
                  ? "bg-gradient-to-tr from-amber-500 via-orange-500 to-red-600 text-white shadow-md shadow-orange-500/40 ring-2 ring-orange-300 ring-offset-1"
                  : isFireTool && !isActive
                  ? hasFires
                    ? "bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-200"
                    : "text-orange-500 hover:bg-orange-50 hover:text-orange-600"
                  : isActive 
                  ? "bg-blue-100 text-blue-700 shadow-inner" 
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} className={isFireTool && isActive ? "animate-pulse" : ""} />
              {isFireTool && totalHazards.length > 0 && (
                <span className={`absolute -top-1 -right-1 text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center shadow-xs ${
                  isActive ? "bg-white text-red-600" : "bg-red-500 text-white"
                }`}>
                  {totalHazards.length}
                </span>
              )}
            </button>
          );
        })}
      </div>
      
      <div className="w-8 h-px bg-slate-200 my-2"></div>
      
      <div className="flex flex-col space-y-2 w-full px-2">
        <button
          title="Undo (Ctrl+Z)"
          onClick={undo}
          disabled={!canUndo}
          className={`p-3 rounded-xl flex items-center justify-center transition-all ${
            canUndo ? "text-slate-600 hover:bg-slate-100" : "text-slate-300 cursor-not-allowed"
          }`}
        >
          <Undo size={18} />
        </button>
        <button
          title="Redo (Ctrl+Y)"
          onClick={redo}
          disabled={!canRedo}
          className={`p-3 rounded-xl flex items-center justify-center transition-all ${
            canRedo ? "text-slate-600 hover:bg-slate-100" : "text-slate-300 cursor-not-allowed"
          }`}
        >
          <Redo size={18} />
        </button>
        <button
          title="Delete Selected (Del)"
          onClick={() => selectedElementId && deleteElement(selectedElementId)}
          disabled={!selectedElementId}
          className={`p-3 rounded-xl flex items-center justify-center transition-all ${
            selectedElementId ? "text-red-500 hover:bg-red-50" : "text-slate-300 cursor-not-allowed"
          }`}
        >
          <Trash2 size={18} />
        </button>

        {/* Quick extinguish button if fires exist on this floor */}
        {totalHazards.length > 0 && (
          <button
            title={`Extinguish All Fire Sources (${totalHazards.length})`}
            onClick={() => {
              if (window.confirm(`Extinguish and clear all ${totalHazards.length} fire ignition sources?`)) {
                clearHazards();
              }
            }}
            className="p-3 rounded-xl flex items-center justify-center transition-all text-red-600 hover:bg-red-50 hover:text-red-700 border border-red-200 bg-red-50/50"
          >
            <span className="text-[14px]" role="img" aria-label="extinguisher">🧯</span>
          </button>
        )}
      </div>
    </div>
  );
}
