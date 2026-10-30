"use client";

import { useMemo, useState } from "react";
import { useEditorStore } from "@/store/editorStore";
import { 
  DoorOpen, LogOut, Users, Activity, AlertTriangle, CheckCircle2, 
  ChevronDown, ChevronUp, ShieldAlert, Sparkles, Clock, Compass,
  GripHorizontal, RotateCcw
} from "lucide-react";
import { Exit } from "@/lib/editor/types";
import { useDraggableWidget } from "@/lib/editor/useDraggableWidget";

export function ExitIntelligenceHUD() {
  const { 
    simulationRun, playbackFrameIndex, getCurrentElements,
    activeFloorId, floors, showExitIntelligence, setShowExitIntelligence
  } = useEditorStore();

  const [isCollapsed, setIsCollapsed] = useState(false);

  const { ref, style, dragHandleProps, resetPosition, position } = useDraggableWidget({
    id: "exit-intelligence-hud"
  });

  const elements = getCurrentElements();
  const activeFloor = floors.find(f => f.id === activeFloorId);
  const activeFloorNumber = activeFloor ? activeFloor.floor_number : 0;

  // Filter and deterministically sort exits on the active floor (left to right, top to bottom)
  const exits = useMemo(() => {
    return (elements.filter(el => el.type === "EXIT" && el.floor_id === activeFloorId) as Exit[])
      .sort((a, b) => a.position_x !== b.position_x ? a.position_x - b.position_x : a.position_y - b.position_y);
  }, [elements, activeFloorId]);

  const currentFrame = simulationRun?.results?.frames?.[playbackFrameIndex];

  // Calculate live telemetry for all exits on this floor
  const exitStats = useMemo(() => {
    if (!currentFrame || exits.length === 0) return [];

    const activeAgents = currentFrame.agents?.filter(
      (a: any) => a.floor_number === activeFloorNumber && a.status !== "EXITED" && a.status !== "TRAPPED"
    ) || [];

    const evacuatedAgents = currentFrame.agents?.filter(
      (a: any) => a.status === "EXITED"
    ) || [];

    return exits.map((ex, idx) => {
      // Find agents whose target exit is this exit or who are geometrically closest to it
      const targetingAgents = activeAgents.filter((agent: any) => {
        if (agent.target_exit_id && agent.target_exit_id === ex.id) return true;
        // Closest exit heuristic fallback
        let closestDist = Infinity;
        let closestExId = null;
        for (const e of exits) {
          const d = Math.hypot(agent.x - e.position_x, agent.y - e.position_y);
          if (d < closestDist) {
            closestDist = d;
            closestExId = e.id;
          }
        }
        return closestExId === ex.id;
      });

      // Agents in immediate door queue (< 3.5 meters)
      const immediateQueue = targetingAgents.filter((a: any) => 
        Math.hypot(a.x - ex.position_x, a.y - ex.position_y) <= 3.5
      );

      // Cumulative evacuees through this exit
      const cleared = evacuatedAgents.filter((agent: any) => {
        if (agent.exit_node_id && agent.exit_node_id === ex.id) return true;
        let closestDist = Infinity;
        let closestExId = null;
        for (const e of exits) {
          const d = Math.hypot(agent.x - e.position_x, agent.y - e.position_y);
          if (d < closestDist) {
            closestDist = d;
            closestExId = e.id;
          }
        }
        return closestExId === ex.id;
      });

      const queueCount = targetingAgents.length;
      const immediateCount = immediateQueue.length;
      const dischargeRate = ex.discharge_rate || 1.5;
      const estClearSec = queueCount > 0 ? (queueCount / dischargeRate).toFixed(1) : "0.0";

      // Congestion Level
      let status: "FREE" | "MODERATE" | "BOTTLENECK" = "FREE";
      let statusText = "Free Flowing";
      let statusColor = "text-emerald-700 bg-emerald-50 border-emerald-200";
      let badgeBg = "bg-emerald-500";

      if (queueCount >= 7 || immediateCount >= 4) {
        status = "BOTTLENECK";
        statusText = "Severe Bottleneck";
        statusColor = "text-red-700 bg-red-50 border-red-300 animate-pulse";
        badgeBg = "bg-red-500";
      } else if (queueCount >= 3) {
        status = "MODERATE";
        statusText = "Crowd Buildup";
        statusColor = "text-amber-700 bg-amber-50 border-amber-200";
        badgeBg = "bg-amber-500";
      }

      const tag = String.fromCharCode(65 + idx);
      return {
        id: ex.id,
        tag,
        name: `Exit ${tag}`,
        x: ex.position_x,
        y: ex.position_y,
        width: ex.width_meters || 2.0,
        dischargeRate,
        queueCount,
        immediateCount,
        clearedCount: cleared.length,
        estClearSec,
        status,
        statusText,
        statusColor,
        badgeBg
      };
    });
  }, [currentFrame, exits, activeFloorNumber]);

  // Overall building exit stats
  const totalQueue = exitStats.reduce((sum, e) => sum + e.queueCount, 0);
  const totalCleared = exitStats.reduce((sum, e) => sum + e.clearedCount, 0);
  const hasBottleneck = exitStats.some(e => e.status === "BOTTLENECK");

  if (!simulationRun || exits.length === 0 || !showExitIntelligence) {
    return null;
  }

  // Collapsed Minimal Pill
  if (isCollapsed) {
    return (
      <div 
        ref={ref}
        style={style}
        data-no-canvas-click="true"
        className="absolute top-16 right-4 z-40 select-none"
      >
        <button
          {...dragHandleProps}
          onClick={() => setIsCollapsed(false)}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl shadow-lg border backdrop-blur-md transition-all cursor-grab active:cursor-grabbing ${
            hasBottleneck 
              ? "bg-red-900/90 text-red-100 border-red-700 animate-pulse" 
              : "bg-slate-900/90 text-white border-slate-700 hover:bg-slate-800"
          }`}
          title="Drag to move anywhere • Click to expand • Double-click to reset"
        >
          <GripHorizontal size={14} className="text-slate-400 -mr-0.5" />
          <span className={`w-2.5 h-2.5 rounded-full ${hasBottleneck ? "bg-red-400" : "bg-emerald-400"}`} />
          <span className="text-xs font-semibold tracking-wide">
            Exit Intel ({exitStats.length} Exits) • {totalQueue} Queued
          </span>
          <ChevronDown size={14} className="text-slate-400" />
        </button>
      </div>
    );
  }

  return (
    <div 
      ref={ref}
      style={style}
      data-no-canvas-click="true"
      className="absolute top-16 right-4 z-40 w-80 max-h-[calc(100vh-140px)] flex flex-col bg-slate-900/95 backdrop-blur-md text-white rounded-xl shadow-2xl border border-slate-700/80 overflow-hidden transition-all animate-in fade-in slide-in-from-top-2 select-none"
    >
      
      {/* Draggable Header */}
      <div 
        {...dragHandleProps}
        className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 cursor-grab active:cursor-grabbing"
        title="Drag header to move anywhere • Double-click to reset position"
      >
        <div className="flex items-center space-x-2.5">
          <div className="text-slate-400 hover:text-slate-200 cursor-grab active:cursor-grabbing">
            <GripHorizontal size={16} />
          </div>
          <div className={`p-1.5 rounded-lg ${hasBottleneck ? "bg-red-500/20 text-red-400" : "bg-emerald-500/20 text-emerald-400"}`}>
            <DoorOpen size={16} />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Exit Intelligence HUD</h3>
            <p className="text-[10px] text-slate-400">Real-Time Throughput & Queues</p>
          </div>
        </div>

        <div className="flex items-center space-x-1" data-no-drag="true">
          {position && (
            <button
              onClick={resetPosition}
              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-emerald-400 rounded transition-colors"
              title="Reset position to default dock"
            >
              <RotateCcw size={14} />
            </button>
          )}
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors"
            title="Collapse HUD"
          >
            <ChevronUp size={16} />
          </button>
        </div>
      </div>

      {/* Global Status Banner */}
      <div className="px-3.5 py-2.5 bg-slate-800/40 border-b border-slate-800/60 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <span className={`w-2 h-2 rounded-full ${hasBottleneck ? "bg-red-500 animate-ping" : "bg-emerald-400"}`} />
          <span className="font-medium text-slate-300">
            {hasBottleneck ? "Bottleneck Detected" : "Discharge Flowing"}
          </span>
        </div>
        <div className="flex items-center space-x-3 text-[11px] text-slate-400 font-mono">
          <span>👥 {totalQueue} active</span>
          <span>✓ {totalCleared} safe</span>
        </div>
      </div>

      {/* Exit Cards List */}
      <div className="p-3 space-y-2.5 overflow-y-auto max-h-80">
        {exitStats.map((ex) => (
          <div 
            key={ex.id}
            className={`p-3 rounded-lg border transition-all ${
              ex.status === "BOTTLENECK" 
                ? "bg-red-950/40 border-red-800/80 shadow-xs shadow-red-950/50" 
                : ex.status === "MODERATE"
                ? "bg-amber-950/30 border-amber-800/60"
                : "bg-slate-800/50 border-slate-750"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className={`w-5 h-5 rounded-md flex items-center justify-center font-mono font-bold text-xs text-white shadow ${
                  ex.status === "BOTTLENECK" ? "bg-red-600 animate-pulse" : ex.status === "MODERATE" ? "bg-amber-600" : "bg-emerald-600"
                }`}>
                  {ex.tag}
                </span>
                <span className="text-xs font-bold text-slate-100">{ex.name}</span>
                <span className="text-[10px] text-slate-400 font-mono">({ex.width}m width)</span>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${ex.statusColor}`}>
                {ex.statusText}
              </span>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-800/60 text-center">
              <div className="bg-slate-900/60 p-1.5 rounded">
                <div className="text-[10px] text-slate-400">Queue</div>
                <div className={`text-sm font-bold ${ex.queueCount >= 7 ? "text-red-400" : ex.queueCount >= 3 ? "text-amber-400" : "text-emerald-400"}`}>
                  {ex.queueCount}
                </div>
              </div>

              <div className="bg-slate-900/60 p-1.5 rounded">
                <div className="text-[10px] text-slate-400">Cleared</div>
                <div className="text-sm font-bold text-emerald-300 font-mono">
                  {ex.clearedCount}
                </div>
              </div>

              <div className="bg-slate-900/60 p-1.5 rounded">
                <div className="text-[10px] text-slate-400">Clear ETA</div>
                <div className="text-sm font-bold text-slate-300 font-mono">
                  {ex.estClearSec}s
                </div>
              </div>
            </div>

            {/* Queue Capacity Bar */}
            <div className="mt-2.5">
              <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                <span>Door Congestion Load</span>
                <span>{Math.min(100, Math.round((ex.queueCount / 10) * 100))}%</span>
              </div>
              <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${
                    ex.status === "BOTTLENECK" 
                      ? "bg-red-500" 
                      : ex.status === "MODERATE" 
                      ? "bg-amber-400" 
                      : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.min(100, (ex.queueCount / 10) * 100)}%` }}
                />
              </div>
            </div>

          </div>
        ))}
      </div>

      {/* Footer Info */}
      <div className="p-2.5 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
        <span className="flex items-center text-slate-400">
          <Activity size={12} className="mr-1 text-blue-400" />
          Live discharge at 1.5 pers/sec
        </span>
        <button
          onClick={() => setShowExitIntelligence(false)}
          className="text-slate-500 hover:text-slate-300 underline"
        >
          Hide HUD
        </button>
      </div>

    </div>
  );
}
