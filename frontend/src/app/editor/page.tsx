"use client";

import { EditorToolbar } from "@/components/editor/EditorToolbar";
import { EditorTopbar } from "@/components/editor/EditorTopbar";
import { PropertiesPanel } from "@/components/editor/PropertiesPanel";
import { EditorCanvas } from "@/components/editor/EditorCanvas";
import { EditorCanvas3D } from "@/components/editor/EditorCanvas3D";
import { SimulationPlayback } from "@/components/editor/SimulationPlayback";
import { useEditorStore } from "@/store/editorStore";

export default function EditorPage() {
  const is3DMode = useEditorStore((state) => state.is3DMode);

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden relative">
      <EditorTopbar />
      <div className="flex flex-1 overflow-hidden relative">
        {!is3DMode && <EditorToolbar />}
        {is3DMode ? <EditorCanvas3D /> : <EditorCanvas />}
        {!is3DMode && <PropertiesPanel />}
        <SimulationPlayback />
      </div>
    </div>
  );
}
