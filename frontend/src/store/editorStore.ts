import { create } from 'zustand';
import { EditorElement, Floor, ToolType, GraphTopology } from '@/lib/editor/types';

interface EditorState {
  // Building Data
  floors: Floor[];
  activeFloorId: string | null;

  buildingId: string | null;
  buildingName: string;
  setBuildingInfo: (id: string, name: string) => void;
  loadState: (floors: Floor[], elements: EditorElement[]) => void;

  
  // History & Elements
  history: EditorElement[][];
  historyIndex: number;
  
  // UI State
  selectedElementId: string | null;
  activeTool: ToolType;
  gridSnapping: boolean;
  gridResolution: number; // in meters, e.g., 0.5
  is3DMode: boolean;
  
  // Actions
  setFloors: (floors: Floor[]) => void;
  setActiveFloor: (id: string) => void;
  setActiveTool: (tool: ToolType) => void;
  setGridSnapping: (snap: boolean) => void;
  setIs3DMode: (is3D: boolean) => void;
  setSelectedElementId: (id: string | null) => void;
  
  // Element Actions (with Undo/Redo tracking)
  addElement: (el: EditorElement) => void;
  updateElement: (id: string, updates: Partial<EditorElement>) => void;
  deleteElement: (id: string) => void;
  
  undo: () => void;
  redo: () => void;
  

  // Graph State
  graph: GraphTopology | null;
  selectedGraphNodeId: string | null;
  selectedGraphEdgeId: string | null;
  showGraphOverlay: boolean;
  
  // Graph Actions
  setGraph: (graph: GraphTopology | null) => void;
  setSelectedGraphNodeId: (id: string | null) => void;
  setSelectedGraphEdgeId: (id: string | null) => void;
  setShowGraphOverlay: (show: boolean) => void;

  // Simulation State
  simulationRun: any | null;
  playbackFrameIndex: number;
  isPlayingSimulation: boolean;
  
  setSimulationRun: (run: any | null) => void;
  setPlaybackFrameIndex: (idx: number) => void;
  setIsPlayingSimulation: (isPlay: boolean) => void;

  // Derived state helper
  getCurrentElements: () => EditorElement[];
}

import { v4 as uuidv4 } from 'uuid';

const DEFAULT_FLOOR_ID = uuidv4();

export const useEditorStore = create<EditorState>((set, get) => ({
  buildingId: uuidv4(),
  buildingName: "Untitled Building",
  
  floors: [
    {
      id: DEFAULT_FLOOR_ID,
      floor_number: 0,
      name: "Ground Floor",
      grid_resolution: 0.5,
    }
  ],
  activeFloorId: DEFAULT_FLOOR_ID,
  
  history: [[]],
  historyIndex: 0,
  
  activeTool: "SELECT",
  gridSnapping: true,
  gridResolution: 0.5,
  is3DMode: false,
  selectedElementId: null,

  graph: null,
  selectedGraphNodeId: null,
  selectedGraphEdgeId: null,
  showGraphOverlay: false,
  
  setBuildingInfo: (id, name) => set({ buildingId: id, buildingName: name }),
  loadState: (floors, elements) => set({
    floors,
    activeFloorId: floors.length > 0 ? floors[0].id : null,
    history: [elements],
    historyIndex: 0,
    selectedElementId: null,
    graph: null
  }),
  
  setGraph: (graph) => set({ graph, selectedGraphNodeId: null, selectedGraphEdgeId: null, showGraphOverlay: true }),
  setSelectedGraphNodeId: (id) => set({ selectedGraphNodeId: id, selectedGraphEdgeId: null, selectedElementId: null }),
  setSelectedGraphEdgeId: (id) => set({ selectedGraphEdgeId: id, selectedGraphNodeId: null, selectedElementId: null }),
  setShowGraphOverlay: (show) => set({ showGraphOverlay: show }),

  setFloors: (floors) => set({ floors }),
  setActiveFloor: (id) => set({ activeFloorId: id, selectedElementId: null }),
  setActiveTool: (tool) => set({ activeTool: tool, selectedElementId: null }),
  setGridSnapping: (snap) => set({ gridSnapping: snap }),
  setIs3DMode: (is3D) => set({ is3DMode: is3D }),
  setSelectedElementId: (id) => set({ selectedElementId: id, selectedGraphNodeId: null, selectedGraphEdgeId: null }),
  
  addElement: (el) => {
    const { history, historyIndex } = get();
    const currentElements = history[historyIndex];
    const newElements = [...currentElements, el];
    
    // Truncate future history if we're not at the end
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newElements);
    
    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
      selectedElementId: el.id
    });
  },
  
  updateElement: (id, updates) => {
    const { history, historyIndex } = get();
    const currentElements = history[historyIndex];
    
    const newElements = currentElements.map(el => {
      if (el.id === id) {
        return { ...el, ...updates } as EditorElement;
      }
      return el;
    });
    
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newElements);
    
    set({
      history: newHistory,
      historyIndex: newHistory.length - 1
    });
  },
  
  deleteElement: (id) => {
    const { history, historyIndex, selectedElementId } = get();
    const currentElements = history[historyIndex];
    
    const newElements = currentElements.filter(el => el.id !== id);
    
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newElements);
    
    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
      selectedElementId: selectedElementId === id ? null : selectedElementId
    });
  },
  
  undo: () => {
    const { historyIndex } = get();
    if (historyIndex > 0) {
      set({ historyIndex: historyIndex - 1, selectedElementId: null });
    }
  },
  
  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      set({ historyIndex: historyIndex + 1, selectedElementId: null });
    }
  },

  simulationRun: null,
  playbackFrameIndex: 0,
  isPlayingSimulation: false,

  setSimulationRun: (run) => set({ simulationRun: run, playbackFrameIndex: 0, isPlayingSimulation: false }),
  setPlaybackFrameIndex: (idx) => set({ playbackFrameIndex: idx }),
  setIsPlayingSimulation: (isPlay) => set({ isPlayingSimulation: isPlay }),
  
  getCurrentElements: () => {
    const { history, historyIndex } = get();
    return history[historyIndex];
  }
}));
