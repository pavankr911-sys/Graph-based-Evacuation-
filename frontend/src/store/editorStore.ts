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
  blueprintImage: string | null;
  blueprintOpacity: number;
  blueprintScale: number;
  blueprintOffsetX: number;
  blueprintOffsetY: number;
  blueprintImagesByFloor: Record<string, string>;
  blueprintOpacitiesByFloor: Record<string, number>;
  
  // Multi-floor Actions & 3D Stacking
  is3DStackedView: boolean;
  setIs3DStackedView: (stacked: boolean) => void;
  addFloor: (name?: string) => string;
  deleteFloor: (id: string) => void;
  renameFloor: (id: string, name: string) => void;
  duplicateFloorStructure: (sourceFloorId: string, targetFloorId: string) => void;
  setFloorBlueprint: (floorId: string, img: string | null) => void;
  setFloorBlueprintOpacity: (floorId: string, opacity: number) => void;
  getActiveBlueprint: () => string | null;
  getActiveBlueprintOpacity: () => number;
  
  // Actions
  setFloors: (floors: Floor[]) => void;
  setActiveFloor: (id: string) => void;
  setActiveTool: (tool: ToolType) => void;
  setGridSnapping: (snap: boolean) => void;
  setIs3DMode: (is3D: boolean) => void;
  setSelectedElementId: (id: string | null) => void;
  setBlueprintImage: (img: string | null) => void;
  setBlueprintOpacity: (opacity: number) => void;
  setBlueprintScale: (scale: number) => void;
  setBlueprintOffset: (x: number, y: number) => void;
  
  // Element Actions (with Undo/Redo tracking)
  addElement: (el: EditorElement) => void;
  addElements: (els: EditorElement[]) => void;
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
  showExitIntelligence: boolean;
  simulationOccupantCount: number;
  hazardSpreadRate: number;
  
  setSimulationRun: (run: any | null) => void;
  setPlaybackFrameIndex: (idx: number) => void;
  setIsPlayingSimulation: (isPlay: boolean) => void;
  setShowExitIntelligence: (show: boolean) => void;
  setSimulationOccupantCount: (count: number) => void;
  setHazardSpreadRate: (rate: number) => void;
  clearHazards: () => void;

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
  
  blueprintImage: null,
  blueprintOpacity: 0.3,
  blueprintScale: 1.0,
  blueprintOffsetX: 0,
  blueprintOffsetY: 0,
  blueprintImagesByFloor: {},
  blueprintOpacitiesByFloor: {},

  is3DStackedView: true,
  setIs3DStackedView: (stacked) => set({ is3DStackedView: stacked }),

  addFloor: (name?: string) => {
    const { floors } = get();
    const maxNumber = floors.reduce((max, f) => Math.max(max, f.floor_number), -1);
    const nextNumber = maxNumber + 1;
    const newFloorId = uuidv4();
    const newFloorName = name || (nextNumber === 0 ? "Ground Floor" : `Floor ${nextNumber}`);
    const newFloor: Floor = {
      id: newFloorId,
      floor_number: nextNumber,
      name: newFloorName,
      grid_resolution: 0.5,
    };
    const updatedFloors = [...floors, newFloor].sort((a, b) => a.floor_number - b.floor_number);
    set({ floors: updatedFloors, activeFloorId: newFloorId, selectedElementId: null });
    return newFloorId;
  },

  deleteFloor: (id: string) => {
    const { floors, activeFloorId, history, historyIndex } = get();
    if (floors.length <= 1) return; // Keep at least one floor

    const remainingFloors = floors.filter(f => f.id !== id);
    const newActiveFloorId = activeFloorId === id ? remainingFloors[0].id : activeFloorId;

    // Purge elements on deleted floor from current history
    const currentElements = history[historyIndex];
    const filteredElements = currentElements.filter(el => el.floor_id !== id);
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(filteredElements);

    set({
      floors: remainingFloors,
      activeFloorId: newActiveFloorId,
      selectedElementId: null,
      history: newHistory,
      historyIndex: newHistory.length - 1
    });
  },

  renameFloor: (id: string, name: string) => {
    const { floors } = get();
    set({
      floors: floors.map(f => f.id === id ? { ...f, name } : f)
    });
  },

  duplicateFloorStructure: (sourceFloorId: string, targetFloorId: string) => {
    const { history, historyIndex } = get();
    const currentElements = history[historyIndex];
    // Copy WALLS and STAIRS from source to target floor
    const structureToCopy = currentElements.filter(
      el => el.floor_id === sourceFloorId && (el.type === "WALL" || el.type === "STAIR" || el.type === "ROOM")
    );
    const duplicatedElements: EditorElement[] = structureToCopy.map(el => {
      return {
        ...el,
        id: uuidv4(),
        floor_id: targetFloorId
      } as EditorElement;
    });

    if (duplicatedElements.length > 0) {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push([...currentElements, ...duplicatedElements]);
      set({
        history: newHistory,
        historyIndex: newHistory.length - 1
      });
    }
  },

  setFloorBlueprint: (floorId: string, img: string | null) => {
    const { blueprintImagesByFloor } = get();
    const updated = { ...blueprintImagesByFloor };
    if (img) {
      updated[floorId] = img;
    } else {
      delete updated[floorId];
    }
    set({ blueprintImagesByFloor: updated, blueprintImage: img });
  },

  setFloorBlueprintOpacity: (floorId: string, opacity: number) => {
    const { blueprintOpacitiesByFloor } = get();
    set({
      blueprintOpacitiesByFloor: { ...blueprintOpacitiesByFloor, [floorId]: opacity },
      blueprintOpacity: opacity
    });
  },

  getActiveBlueprint: () => {
    const { activeFloorId, blueprintImagesByFloor, blueprintImage } = get();
    if (activeFloorId && blueprintImagesByFloor[activeFloorId]) {
      return blueprintImagesByFloor[activeFloorId];
    }
    return blueprintImage;
  },

  getActiveBlueprintOpacity: () => {
    const { activeFloorId, blueprintOpacitiesByFloor, blueprintOpacity } = get();
    if (activeFloorId && blueprintOpacitiesByFloor[activeFloorId] !== undefined) {
      return blueprintOpacitiesByFloor[activeFloorId];
    }
    return blueprintOpacity;
  },

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
  
  setBlueprintImage: (img) => set({ blueprintImage: img }),
  setBlueprintOpacity: (opacity) => set({ blueprintOpacity: opacity }),
  setBlueprintScale: (scale) => set({ blueprintScale: scale }),
  setBlueprintOffset: (x, y) => set({ blueprintOffsetX: x, blueprintOffsetY: y }),
  
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

  addElements: (els) => {
    const { history, historyIndex } = get();
    const currentElements = history[historyIndex];
    const newElements = [...currentElements, ...els];
    
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newElements);
    
    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
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
  showExitIntelligence: true,
  simulationOccupantCount: 25,
  hazardSpreadRate: 0.15,

  setHazardSpreadRate: (rate: number) => set({ hazardSpreadRate: rate }),
  clearHazards: () => {
    const { history, historyIndex, selectedElementId } = get();
    const currentElements = history[historyIndex];
    const newElements = currentElements.filter(el => el.type !== "HAZARD");
    if (newElements.length === currentElements.length) return;
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newElements);
    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
      selectedElementId: selectedElementId && currentElements.find(e => e.id === selectedElementId)?.type === "HAZARD" ? null : selectedElementId
    });
  },

  setSimulationRun: (run) => set({ simulationRun: run, playbackFrameIndex: 0, isPlayingSimulation: false }),
  setPlaybackFrameIndex: (idx) => set({ playbackFrameIndex: idx }),
  setIsPlayingSimulation: (isPlay) => set({ isPlayingSimulation: isPlay }),
  setShowExitIntelligence: (show) => set({ showExitIntelligence: show }),
  setSimulationOccupantCount: (count) => set({ simulationOccupantCount: count }),
  
  getCurrentElements: () => {
    const { history, historyIndex } = get();
    return history[historyIndex];
  }
}));
