"use client";

import { useEditorStore } from "@/store/editorStore";
import { useEffect, useRef } from "react";
import { Play, Pause, X, DoorOpen, Users } from "lucide-react";

export function SimulationPlayback() {
  const { 
    simulationRun, playbackFrameIndex, isPlayingSimulation,
    setPlaybackFrameIndex, setIsPlayingSimulation, setSimulationRun,
    showExitIntelligence, setShowExitIntelligence,
    showOccupantLegend, setShowOccupantLegend
  } = useEditorStore();
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isPlayingSimulation && simulationRun?.results?.frames) {
      const frames = simulationRun.results.frames;
      timerRef.current = setInterval(() => {
        const currentIdx = useEditorStore.getState().playbackFrameIndex;
        if (currentIdx >= frames.length - 1) {
          setIsPlayingSimulation(false);
        } else {
          setPlaybackFrameIndex(currentIdx + 1);
        }
      }, 200); // 5Hz -> 200ms
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlayingSimulation, simulationRun, setPlaybackFrameIndex, setIsPlayingSimulation]);

  if (!simulationRun) return null;

  const frames = simulationRun.results?.frames || [];
  const maxFrames = frames.length > 0 ? frames.length - 1 : 0;
  const currentFrame = frames[playbackFrameIndex];
  const totalPeople = simulationRun.config?.occupant_count || frames[0]?.agents?.length || 0;
  const exitedCount = currentFrame?.agents?.filter((a: any) => a.status === "EXITED").length || 0;
  const trappedCount = currentFrame?.agents?.filter((a: any) => a.status === "TRAPPED").length || 0;
  
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-2xl border border-slate-200/90 p-3.5 flex items-center space-x-4 z-50 animate-in fade-in slide-in-from-bottom-2">
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setIsPlayingSimulation(!isPlayingSimulation)}
          className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center hover:bg-blue-200 transition-colors shadow-xs"
          title={isPlayingSimulation ? "Pause" : "Play"}
        >
          {isPlayingSimulation ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
        </button>
      </div>
      
      <div className="flex flex-col w-64 space-y-1">
        <div className="flex justify-between text-xs text-slate-500 font-medium">
          <span>{frames[playbackFrameIndex]?.time_sec.toFixed(1) || 0}s</span>
          <span className="font-semibold text-slate-700">{frames[maxFrames]?.time_sec.toFixed(1) || 0}s</span>
        </div>
        <input 
          type="range" 
          min={0} 
          max={maxFrames} 
          value={playbackFrameIndex}
          onChange={(e) => {
            setPlaybackFrameIndex(parseInt(e.target.value));
            setIsPlayingSimulation(false);
          }}
          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      <div className="h-6 w-px bg-slate-200" />

      {/* Live Occupant Telemetry Badge */}
      <div className="flex items-center text-xs font-semibold px-2.5 py-1.5 bg-slate-50 rounded-lg text-slate-700 space-x-1.5 border border-slate-200">
        <Users size={14} className="text-blue-600 shrink-0" />
        <span className="text-slate-800">{totalPeople} People</span>
        <span className="text-slate-300">•</span>
        <span className="text-emerald-700 font-bold">{exitedCount} Exited</span>
        {trappedCount > 0 && (
          <>
            <span className="text-slate-300">•</span>
            <span className="text-rose-600 font-bold">{trappedCount} Trapped</span>
          </>
        )}
      </div>

      <div className="h-6 w-px bg-slate-200" />

      {/* Exit Intelligence Toggle */}
      <button
        onClick={() => setShowExitIntelligence(!showExitIntelligence)}
        className={`flex items-center px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
          showExitIntelligence
            ? "bg-emerald-50 text-emerald-800 border-emerald-300 shadow-xs"
            : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
        }`}
        title="Toggle Real-Time Exit Intelligence HUD & Door Congestion Badges"
      >
        <DoorOpen size={15} className={`mr-1.5 ${showExitIntelligence ? "text-emerald-600" : "text-slate-400"}`} />
        Exit Intel
      </button>

      {/* Evacuee Legend Toggle */}
      <button
        onClick={() => setShowOccupantLegend(!showOccupantLegend)}
        className={`flex items-center px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
          showOccupantLegend
            ? "bg-indigo-50 text-indigo-700 border-indigo-300 shadow-xs"
            : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
        }`}
        title="Toggle Evacuee Demographics & Color Legend"
      >
        <Users size={15} className={`mr-1.5 ${showOccupantLegend ? "text-indigo-600" : "text-slate-400"}`} />
        Legend
      </button>
      
      <button 
        onClick={() => {
          setIsPlayingSimulation(false);
          setSimulationRun(null);
        }}
        className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
        title="Close Playback"
      >
        <X size={18} />
      </button>
    </div>
  );
}
