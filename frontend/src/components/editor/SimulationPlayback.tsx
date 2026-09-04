"use client";

import { useEditorStore } from "@/store/editorStore";
import { useEffect, useRef } from "react";
import { Play, Pause, X } from "lucide-react";

export function SimulationPlayback() {
  const { 
    simulationRun, playbackFrameIndex, isPlayingSimulation,
    setPlaybackFrameIndex, setIsPlayingSimulation, setSimulationRun
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
  
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white rounded-lg shadow-xl border border-slate-200 p-4 flex items-center space-x-4 z-50">
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setIsPlayingSimulation(!isPlayingSimulation)}
          className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center hover:bg-blue-200 transition-colors"
        >
          {isPlayingSimulation ? <Pause size={20} /> : <Play size={20} className="ml-1" />}
        </button>
      </div>
      
      <div className="flex flex-col w-64 space-y-1">
        <div className="flex justify-between text-xs text-slate-500 font-medium">
          <span>{frames[playbackFrameIndex]?.time_sec.toFixed(1) || 0}s</span>
          <span>{frames[maxFrames]?.time_sec.toFixed(1) || 0}s</span>
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
          className="w-full"
        />
      </div>
      
      <button 
        onClick={() => {
          setIsPlayingSimulation(false);
          setSimulationRun(null);
        }}
        className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
      >
        <X size={18} />
      </button>
    </div>
  );
}

