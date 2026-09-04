import { act, renderHook } from '@testing-library/react';
import { useEditorStore } from '../src/store/editorStore';
import { Wall } from '../src/lib/editor/types';

describe('Editor Store', () => {
  beforeEach(() => {
    // Reset state before each test
    const { history, setFloors } = useEditorStore.getState();
    useEditorStore.setState({
      activeTool: 'SELECT',
      gridSnapping: true,
      activeFloorId: 'floor-0',
      history: [[]],
      historyIndex: 0,
      selectedElementId: null,
      floors: [{ id: 'floor-0', name: 'Ground Floor', floor_number: 0, grid_resolution: 0.5 }]
    });
  });

  it('handles tool selection', () => {
    const { result } = renderHook(() => useEditorStore());
    
    act(() => {
      result.current.setActiveTool('WALL');
    });
    
    expect(result.current.activeTool).toBe('WALL');
    expect(result.current.selectedElementId).toBeNull(); // Changing tool clears selection
  });

  it('handles grid snapping toggle', () => {
    const { result } = renderHook(() => useEditorStore());
    
    act(() => {
      result.current.setGridSnapping(false);
    });
    
    expect(result.current.gridSnapping).toBe(false);
  });

  it('handles floor switching', () => {
    const { result } = renderHook(() => useEditorStore());
    
    act(() => {
      result.current.setFloors([
        { id: 'floor-0', name: 'Ground', floor_number: 0, grid_resolution: 0.5 },
        { id: 'floor-1', name: 'First', floor_number: 1, grid_resolution: 0.5 }
      ]);
      result.current.setActiveFloor('floor-1');
    });
    
    expect(result.current.activeFloorId).toBe('floor-1');
  });

  it('handles adding and deleting elements with undo/redo', () => {
    const { result } = renderHook(() => useEditorStore());
    
    const wall: Wall = {
      id: 'wall-1',
      type: 'WALL',
      floor_id: 'floor-0',
      start_x: 0, start_y: 0,
      end_x: 10, end_y: 0,
      is_combustible: false
    };

    // Add
    act(() => {
      result.current.addElement(wall);
    });
    
    expect(result.current.getCurrentElements()).toHaveLength(1);
    expect(result.current.getCurrentElements()[0].id).toBe('wall-1');
    
    // Undo
    act(() => {
      result.current.undo();
    });
    
    expect(result.current.getCurrentElements()).toHaveLength(0);
    
    // Redo
    act(() => {
      result.current.redo();
    });
    
    expect(result.current.getCurrentElements()).toHaveLength(1);

    // Update
    act(() => {
      result.current.updateElement('wall-1', { is_combustible: true });
    });
    
    expect((result.current.getCurrentElements()[0] as Wall).is_combustible).toBe(true);

    // Delete
    act(() => {
      result.current.deleteElement('wall-1');
    });
    
    expect(result.current.getCurrentElements()).toHaveLength(0);

    // Undo delete
    act(() => {
      result.current.undo();
    });
    
    expect(result.current.getCurrentElements()).toHaveLength(1);
  });
});
