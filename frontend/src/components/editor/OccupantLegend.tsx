"use client";

import { useState, useMemo } from "react";
import { useEditorStore } from "@/store/editorStore";
import { 
  Users, ChevronDown, ChevronUp, Layers, Flame, 
  DoorOpen, LogOut, ArrowUpDown, X, ShieldCheck
} from "lucide-react";

interface DemographicItem {
  id: string;
  name: string;
  speed: string;
  share: string;
  description: string;
  color: string;
  borderRing: string;
}

const DEMOGRAPHIC_PROFILES: DemographicItem[] = [
  {
    id: "ADULT",
    name: "Adults",
    speed: "1.25 m/s",
    share: "70%",
    description: "Standard walking pace & reaction time",
    color: "#3498db",
    borderRing: "ring-blue-200"
  },
  {
    id: "CHILD",
    name: "Children",
    speed: "0.90 m/s",
    share: "15%",
    description: "Smaller step stride, slower pace",
    color: "#f1c40f",
    borderRing: "ring-yellow-200"
  },
  {
    id: "ELDERLY",
    name: "Elderly",
    speed: "0.80 m/s",
    share: "10%",
    description: "Cautious speed & staircase movement",
    color: "#9b59b6",
    borderRing: "ring-purple-200"
  },
  {
    id: "DISABLED",
    name: "Disabled / Wheelchair",
    speed: "0.60 m/s",
    share: "5%",
    description: "Mobility impaired, requires clearance",
    color: "#e74c3c",
    borderRing: "ring-red-200"
  }
];

const BUILDING_ELEMENTS = [
  { name: "Emergency Exit", color: "#10b981", icon: LogOut, desc: "Building discharge to outdoors" },
  { name: "Doorway / Opening", color: "#d97706", icon: DoorOpen, desc: "1.5m–2.0m traversable portal" },
  { name: "Walkable Room / Corridor", color: "#3b82f6", icon: Layers, desc: "Interior pedestrian envelope" },
  { name: "Solid Wall Barrier", color: "#1e293b", icon: Layers, desc: "Impassable obstacle boundary" },
  { name: "Vertical Stairwell", color: "#8b5cf6", icon: ArrowUpDown, desc: "Inter-floor vertical connection" },
  { name: "Active Fire Hazard", color: "#ef4444", icon: Flame, desc: "Dynamic fire & smoke spread" },
];

export function OccupantLegend() {
  const { 
    showOccupantLegend, setShowOccupantLegend,
    simulationRun, playbackFrameIndex, is3DMode
  } = useEditorStore();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<"evacuees" | "elements">("evacuees");

  // Extract live telemetry for each demographic profile if simulation is playing/loaded
  const liveStats = useMemo(() => {
    if (!simulationRun?.results?.frames) return null;
    const frames = simulationRun.results.frames;
    const currentFrame = frames[playbackFrameIndex] || frames[0];
    if (!currentFrame?.agents) return null;

    const agents = currentFrame.agents;
    const active = agents.filter((a: any) => a.status !== "EXITED");
    const exited = agents.filter((a: any) => a.status === "EXITED");

    return {
      total: agents.length,
      exited: exited.length,
      adults: active.filter((a: any) => a.profile === "ADULT").length,
      children: active.filter((a: any) => a.profile === "CHILD").length,
      elderly: active.filter((a: any) => a.profile === "ELDERLY").length,
      disabled: active.filter((a: any) => a.profile === "DISABLED").length,
    };
  }, [simulationRun, playbackFrameIndex]);

  if (!showOccupantLegend) return null;

  // Responsive position: offsets left in 2D mode so it doesn't overlap the 64px EditorToolbar
  const positionClass = `absolute top-4 ${is3DMode ? "left-4" : "left-20"} z-30 select-none`;

  // --- MINIMIZED / COLLAPSED PILL MODE ---
  if (isCollapsed) {
    return (
      <div 
        data-no-canvas-click="true"
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className={positionClass}
      >
        <button
          onClick={() => setIsCollapsed(false)}
          className="flex items-center gap-2 px-3 py-1.5 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-full shadow-md hover:bg-slate-50 transition-all text-xs font-semibold text-slate-700 cursor-pointer hover:shadow-lg"
          title="Expand Evacuation Legend & Demographic Profiles"
        >
          <Users size={14} className="text-indigo-600" />
          <span>Legend</span>
          <div className="flex items-center -space-x-1 ml-0.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#3498db] ring-1 ring-white" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#f1c40f] ring-1 ring-white" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#9b59b6] ring-1 ring-white" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#e74c3c] ring-1 ring-white" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] ring-1 ring-white" />
          </div>
          <ChevronDown size={14} className="text-slate-400 ml-0.5" />
        </button>
      </div>
    );
  }

  // --- FULL EXPANDED LEGEND CARD ---
  return (
    <div
      data-no-canvas-click="true"
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      className={`${positionClass} w-72 bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-slate-200/90 text-slate-800 p-3 transition-all animate-in fade-in slide-in-from-top-2`}
    >
      {/* Header with Title & Controls */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center space-x-2">
          <div className="p-1 bg-indigo-50 text-indigo-600 rounded-md">
            <Users size={15} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800 leading-tight">Visual Legend</h4>
            <p className="text-[10px] text-slate-400 font-medium">Demographics & Colors</p>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
            title="Minimize Legend"
          >
            <ChevronUp size={14} />
          </button>
          <button
            onClick={() => setShowOccupantLegend(false)}
            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
            title="Close Legend (toggle back in topbar or playback)"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="grid grid-cols-2 gap-1 p-0.5 mt-2 bg-slate-100/90 rounded-lg text-[11px] font-semibold">
        <button
          onClick={() => setActiveTab("evacuees")}
          className={`py-1 rounded-md transition-all cursor-pointer ${
            activeTab === "evacuees"
              ? "bg-white text-indigo-700 shadow-2xs font-bold"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          👥 People ({liveStats ? `${liveStats.total}` : "Profiles"})
        </button>
        <button
          onClick={() => setActiveTab("elements")}
          className={`py-1 rounded-md transition-all cursor-pointer ${
            activeTab === "elements"
              ? "bg-white text-indigo-700 shadow-2xs font-bold"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          🏢 Features
        </button>
      </div>

      {/* TAB CONTENT: EVACUEES */}
      {activeTab === "evacuees" && (
        <div className="mt-2.5 space-y-1.5">
          {DEMOGRAPHIC_PROFILES.map((profile) => {
            const count = liveStats
              ? profile.id === "ADULT"
                ? liveStats.adults
                : profile.id === "CHILD"
                ? liveStats.children
                : profile.id === "ELDERLY"
                ? liveStats.elderly
                : liveStats.disabled
              : null;

            return (
              <div
                key={profile.id}
                className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                title={`${profile.name}: ${profile.description}`}
              >
                <div className="flex items-center space-x-2.5">
                  <span
                    className={`w-3.5 h-3.5 rounded-full ring-2 ${profile.borderRing} shrink-0 shadow-2xs`}
                    style={{ backgroundColor: profile.color }}
                  />
                  <div>
                    <div className="text-xs font-semibold text-slate-800 leading-none">
                      {profile.name}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {profile.speed} • {profile.share}
                    </div>
                  </div>
                </div>

                {liveStats ? (
                  <span
                    className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-md ${
                      count === 0
                        ? "bg-slate-100 text-slate-400"
                        : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                    }`}
                  >
                    {count} active
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-slate-400 font-medium">
                    {profile.speed}
                  </span>
                )}
              </div>
            );
          })}

          {/* Safely Evacuated Row */}
          <div className="flex items-center justify-between p-1.5 rounded-lg bg-emerald-50/70 border border-emerald-200/80 mt-1">
            <div className="flex items-center space-x-2.5">
              <div className="relative w-3.5 h-3.5 rounded-full bg-[#10b981] ring-2 ring-emerald-200 shrink-0 flex items-center justify-center">
                <span className="w-1.5 h-1.5 bg-white rounded-full" />
              </div>
              <div>
                <div className="text-xs font-bold text-emerald-900 leading-none flex items-center gap-1">
                  Safely Evacuated
                  <ShieldCheck size={12} className="text-emerald-600 inline" />
                </div>
                <div className="text-[10px] text-emerald-700 mt-0.5">
                  Outdoor Assembly Area
                </div>
              </div>
            </div>

            {liveStats ? (
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-600 text-white shadow-2xs">
                {liveStats.exited} safe
              </span>
            ) : (
              <span className="text-[10px] font-semibold text-emerald-700">Muster Area</span>
            )}
          </div>

          <div className="pt-1.5 mt-1 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-400 font-medium px-1">
            <span>Pedestrian standards: NFPA / SFPE</span>
            <span>5Hz dynamic flow</span>
          </div>
        </div>
      )}

      {/* TAB CONTENT: BUILDING FEATURES */}
      {activeTab === "elements" && (
        <div className="mt-2.5 space-y-1.5">
          {BUILDING_ELEMENTS.map((el) => {
            const Icon = el.icon;
            return (
              <div
                key={el.name}
                className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center space-x-2.5">
                  <span
                    className="w-3.5 h-3.5 rounded-md shrink-0 shadow-2xs flex items-center justify-center"
                    style={{ backgroundColor: el.color }}
                  >
                    <Icon size={9} className="text-white" />
                  </span>
                  <div>
                    <div className="text-xs font-semibold text-slate-800 leading-none">
                      {el.name}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {el.desc}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
