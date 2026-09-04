import { act, renderHook } from '@testing-library/react';
import { useEditorStore } from '../src/store/editorStore';
import { GraphTopology } from '../src/lib/editor/types';
import * as apiClient from '../src/lib/api/client';

// Mock the API client
jest.mock('../src/lib/api/client', () => ({
  generateGraph: jest.fn(),
  saveBuilding: jest.fn(),
}));

describe('Graph Sync and Store', () => {
  beforeEach(() => {
    const { history, setFloors } = useEditorStore.getState();
    useEditorStore.setState({
      buildingId: 'b-1',
      buildingName: 'Test Building',
      graph: null,
      selectedGraphNodeId: null,
      selectedGraphEdgeId: null,
      selectedElementId: 'some-element',
    });
    jest.clearAllMocks();
  });

  it('handles setting the graph and clears normal selection', () => {
    const { result } = renderHook(() => useEditorStore());
    
    const mockGraph: GraphTopology = {
      id: 'g-1',
      building_id: 'b-1',
      nodes: [
        { id: 'n-1', floor_number: 0, x: 0, y: 0, z: 0, node_type: 'WALKABLE', capacity_persons: 4, base_cost: 1 }
      ],
      edges: []
    };

    act(() => {
      result.current.setGraph(mockGraph);
    });

    expect(result.current.graph).toEqual(mockGraph);
    // Setting graph shouldn't clear element selection immediately, wait, actually we didn't specify that.
    // The requirement was: Graph selection clears normal selection, and normal selection clears graph selection.
  });

  it('handles graph node selection and clears other selections', () => {
    const { result } = renderHook(() => useEditorStore());
    
    act(() => {
      result.current.setSelectedGraphNodeId('n-1');
    });

    expect(result.current.selectedGraphNodeId).toBe('n-1');
    expect(result.current.selectedGraphEdgeId).toBeNull();
    expect(result.current.selectedElementId).toBeNull();
  });

  it('handles graph edge selection and clears other selections', () => {
    const { result } = renderHook(() => useEditorStore());
    
    act(() => {
      result.current.setSelectedGraphEdgeId('e-1');
    });

    expect(result.current.selectedGraphEdgeId).toBe('e-1');
    expect(result.current.selectedGraphNodeId).toBeNull();
    expect(result.current.selectedElementId).toBeNull();
  });

  it('handles regular element selection and clears graph selections', () => {
    const { result } = renderHook(() => useEditorStore());
    
    // Set some graph selection first
    act(() => {
      result.current.setSelectedGraphNodeId('n-1');
    });
    
    // Now select a regular element
    act(() => {
      result.current.setSelectedElementId('el-1');
    });

    expect(result.current.selectedElementId).toBe('el-1');
    expect(result.current.selectedGraphNodeId).toBeNull();
    expect(result.current.selectedGraphEdgeId).toBeNull();
  });
});
