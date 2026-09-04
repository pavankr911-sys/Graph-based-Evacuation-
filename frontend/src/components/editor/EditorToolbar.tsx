"use client";

import { useEditorStore } from "@/store/editorStore";
import { MousePointer2, Square, Grid3x3, DoorOpen, ListStart, ArrowRightSquare, Undo, Redo, Trash2, LucideIcon } from "lucide-react";
import { ToolType } from "@/lib/editor/types";

const TOOLS: { id: ToolType; icon: LucideIcon; label: string }[] = [
  { id: "SELECT", icon: MousePointer2, label: "Select (V)" },
  { id: "ROOM", icon: Square, label: "Room (R)" },
  { id: "WALL", icon: Grid3x3, label: "Wall (W)" },
  { id: "DOOR", icon: DoorOpen, label: "Door (D)" },
  { id: "STAIR", icon: ListStart, label: "Stair (S)" },
  { id: "EXIT", icon: ArrowRightSquare, label: "Exit (E)" },
];

export function EditorToolbar() {
  const { 
    activeTool, setActiveTool, 
    undo, redo, history, historyIndex,
    selectedElementId, deleteElement
  } = useEditorStore();

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return (
    <div className="w-16 bg-white border-r border-slate-200 flex flex-col items-center py-4 space-y-4 shrink-0 z-10 shadow-sm">
      <div className="flex flex-col space-y-2 w-full px-2">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              title={tool.label}
              onClick={() => setActiveTool(tool.id)}
              className={`p-3 rounded-xl flex items-center justify-center transition-all ${
                isActive 
                  ? "bg-blue-100 text-blue-700 shadow-inner" 
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
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
      </div>
    </div>
  );
}
