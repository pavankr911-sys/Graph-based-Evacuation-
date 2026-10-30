"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface UseDraggableWidgetOptions {
  id: string;
  defaultPosition?: { x: number; y: number } | null;
}

export function useDraggableWidget({ id, defaultPosition = null }: UseDraggableWidgetOptions) {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const widgetRef = useRef<HTMLDivElement | null>(null);

  // Restore position from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`widget_pos_${id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === "number" && typeof parsed.y === "number") {
          if (
            parsed.x >= 0 &&
            parsed.y >= 0 &&
            parsed.x < window.innerWidth &&
            parsed.y < window.innerHeight
          ) {
            setPosition(parsed);
          }
        }
      } else if (defaultPosition) {
        setPosition(defaultPosition);
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [id, defaultPosition]);

  const updatePosition = useCallback((newPos: { x: number; y: number } | null) => {
    setPosition(newPos);
    try {
      if (newPos) {
        localStorage.setItem(`widget_pos_${id}`, JSON.stringify(newPos));
      } else {
        localStorage.removeItem(`widget_pos_${id}`);
      }
    } catch {
      // Ignore
    }
  }, [id]);

  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    initX: number;
    initY: number;
    parentRect: DOMRect;
    nodeWidth: number;
    nodeHeight: number;
  } | null>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Only drag with left mouse button (0) or touch/pen
    if (e.button !== 0) return;

    // Do not initiate drag if user clicked an interactive control (button, input, slider, select, a)
    const target = e.target as HTMLElement | null;
    if (target?.closest("button, input, select, textarea, a, [role='button'], [data-no-drag]")) {
      return;
    }

    const node = widgetRef.current;
    if (!node) return;

    e.preventDefault();
    e.stopPropagation();

    const parent = (node.offsetParent as HTMLElement) || node.parentElement || document.body;
    const parentRect = parent.getBoundingClientRect();
    const nodeRect = node.getBoundingClientRect();

    // Determine initial coordinates relative to parent viewport
    const currentX = position ? position.x : (nodeRect.left - parentRect.left);
    const currentY = position ? position.y : (nodeRect.top - parentRect.top);

    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: currentX,
      initY: currentY,
      parentRect,
      nodeWidth: nodeRect.width,
      nodeHeight: nodeRect.height,
    };

    setIsDragging(true);
  }, [position]);

  // Global window listeners while dragging ensures zero cursor escape or stutter
  useEffect(() => {
    if (!isDragging) return;

    const onPointerMove = (e: PointerEvent) => {
      if (!dragStartRef.current) return;
      const { startX, startY, initX, initY, parentRect, nodeWidth, nodeHeight } = dragStartRef.current;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      // Clamp within parent container boundaries
      const minX = 8;
      const maxX = Math.max(8, parentRect.width - nodeWidth - 8);
      const minY = 8;
      const maxY = Math.max(8, parentRect.height - nodeHeight - 8);

      const clampedX = Math.max(minX, Math.min(maxX, initX + dx));
      const clampedY = Math.max(minY, Math.min(maxY, initY + dy));

      setPosition({ x: Math.round(clampedX), y: Math.round(clampedY) });
    };

    const onPointerUp = () => {
      setIsDragging(false);
      dragStartRef.current = null;
      setPosition((current) => {
        if (current) {
          try {
            localStorage.setItem(`widget_pos_${id}`, JSON.stringify(current));
          } catch {}
        }
        return current;
      });
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [id, isDragging]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    // Reset to default on double-click
    e.preventDefault();
    e.stopPropagation();
    updatePosition(null);
  }, [updatePosition]);

  return {
    ref: widgetRef,
    position,
    isDragging,
    resetPosition: () => updatePosition(null),
    style: position
      ? {
          position: "absolute" as const,
          left: `${position.x}px`,
          top: `${position.y}px`,
          right: "auto",
          bottom: "auto",
          transform: "none",
          zIndex: isDragging ? 70 : 40,
          userSelect: isDragging ? ("none" as const) : undefined,
          transition: isDragging ? "none" : undefined,
        }
      : undefined,
    dragHandleProps: {
      onPointerDown: handlePointerDown,
      onDoubleClick: handleDoubleClick,
      className: "cursor-grab active:cursor-grabbing select-none",
      title: "Click & drag to move anywhere • Double-click to reset position",
    },
  };
}
