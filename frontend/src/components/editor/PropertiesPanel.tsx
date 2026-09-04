"use client";

import { useEditorStore } from "@/store/editorStore";
import { X } from "lucide-react";

export function PropertiesPanel() {
  const { selectedElementId, getCurrentElements, updateElement, setSelectedElementId, graph, selectedGraphNodeId, selectedGraphEdgeId, setSelectedGraphNodeId, setSelectedGraphEdgeId } = useEditorStore();
  const elements = getCurrentElements();
  const selectedEl = elements.find(el => el.id === selectedElementId);

  if (selectedGraphNodeId && graph) {
    const node = graph.nodes.find(n => n.id === selectedGraphNodeId);
    if (node) {
      return (
        <div className="w-64 bg-white border-l border-slate-200 p-4 shrink-0 shadow-sm flex flex-col z-10 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-semibold text-purple-700 uppercase tracking-wider">Graph Node</h3>
            <button onClick={() => setSelectedGraphNodeId(null)} className="text-slate-400 hover:text-slate-700"><X size={16} /></button>
          </div>
          <div className="space-y-4 text-sm">
            <div><span className="text-slate-500 block text-xs">Type</span><span className="font-medium">{node.node_type}</span></div>
            <div><span className="text-slate-500 block text-xs">Coordinates</span><span className="font-mono">{node.x.toFixed(2)}, {node.y.toFixed(2)}</span></div>
            <div><span className="text-slate-500 block text-xs">Floor Number</span><span>{node.floor_number}</span></div>
            <div><span className="text-slate-500 block text-xs">Capacity</span><span>{node.capacity_persons}</span></div>
            <div><span className="text-slate-500 block text-xs">Base Cost</span><span>{node.base_cost.toFixed(2)}</span></div>
            <div className="pt-4 border-t border-slate-200"><p className="text-xs text-slate-400 font-mono break-all">ID: {node.id}</p></div>
          </div>
        </div>
      );
    }
  }

  if (selectedGraphEdgeId && graph) {
    const edge = graph.edges.find(e => e.id === selectedGraphEdgeId);
    if (edge) {
      return (
        <div className="w-64 bg-white border-l border-slate-200 p-4 shrink-0 shadow-sm flex flex-col z-10 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-semibold text-purple-700 uppercase tracking-wider">Graph Edge</h3>
            <button onClick={() => setSelectedGraphEdgeId(null)} className="text-slate-400 hover:text-slate-700"><X size={16} /></button>
          </div>
          <div className="space-y-4 text-sm">
            <div><span className="text-slate-500 block text-xs">Length</span><span>{edge.length_meters.toFixed(2)}m</span></div>
            <div><span className="text-slate-500 block text-xs">Width</span><span>{edge.width_meters.toFixed(2)}m</span></div>
            <div><span className="text-slate-500 block text-xs">Max Flow Rate</span><span>{edge.max_flow_rate.toFixed(2)} p/s</span></div>
            <div><span className="text-slate-500 block text-xs">Base Traversal Time</span><span>{edge.base_traversal_time.toFixed(2)}s</span></div>
            <div><span className="text-slate-500 block text-xs">Bidirectional</span><span>{edge.bidirectional ? 'Yes' : 'No'}</span></div>
            <div className="pt-4 border-t border-slate-200"><p className="text-xs text-slate-400 font-mono break-all">ID: {edge.id}</p></div>
          </div>
        </div>
      );
    }
  }


  if (!selectedEl) {
    return (
      <div className="w-64 bg-white border-l border-slate-200 p-4 shrink-0 shadow-sm flex flex-col z-10">
        <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-4">Properties</h3>
        <div className="flex-1 flex items-center justify-center text-sm text-slate-400 text-center px-4">
          Select an element to view and edit its properties.
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 bg-white border-l border-slate-200 p-4 shrink-0 shadow-sm flex flex-col z-10 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">Properties</h3>
        <button onClick={() => setSelectedElementId(null)} className="text-slate-400 hover:text-slate-700">
          <X size={16} />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Type</label>
          <div className="text-sm font-medium text-slate-900 bg-slate-50 px-3 py-1.5 rounded border border-slate-200">
            {selectedEl.type}
          </div>
        </div>

        {selectedEl.type === "ROOM" && (
          <>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Name</label>
              <input 
                type="text" 
                value={selectedEl.name}
                onChange={(e) => updateElement(selectedEl.id, { name: e.target.value })}
                className="w-full text-sm border border-slate-300 rounded px-2 py-1.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Room Type</label>
              <input 
                type="text" 
                value={selectedEl.room_type}
                onChange={(e) => updateElement(selectedEl.id, { room_type: e.target.value })}
                className="w-full text-sm border border-slate-300 rounded px-2 py-1.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <input 
                type="checkbox" 
                id="accessible"
                checked={selectedEl.is_accessible}
                onChange={(e) => updateElement(selectedEl.id, { is_accessible: e.target.checked })}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="accessible" className="text-sm text-slate-700">Is Accessible</label>
            </div>
          </>
        )}

        {(selectedEl.type === "DOOR" || selectedEl.type === "STAIR" || selectedEl.type === "EXIT") && (
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Width (meters)</label>
            <input 
              type="number"
              step="0.1"
              value={selectedEl.width_meters}
              onChange={(e) => updateElement(selectedEl.id, { width_meters: parseFloat(e.target.value) || 0 })}
              className="w-full text-sm border border-slate-300 rounded px-2 py-1.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        )}

        {selectedEl.type === "EXIT" && (
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Discharge Rate (p/s)</label>
            <input 
              type="number"
              step="0.1"
              value={selectedEl.discharge_rate}
              onChange={(e) => updateElement(selectedEl.id, { discharge_rate: parseFloat(e.target.value) || 0 })}
              className="w-full text-sm border border-slate-300 rounded px-2 py-1.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        )}

        {selectedEl.type === "WALL" && (
          <div className="flex items-center space-x-2 pt-2">
            <input 
              type="checkbox" 
              id="combustible"
              checked={selectedEl.is_combustible}
              onChange={(e) => updateElement(selectedEl.id, { is_combustible: e.target.checked })}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="combustible" className="text-sm text-slate-700">Is Combustible</label>
          </div>
        )}

        <div className="pt-4 border-t border-slate-200 mt-6">
          <p className="text-xs text-slate-400 font-mono break-all">ID: {selectedEl.id}</p>
        </div>
      </div>
    </div>
  );
}
