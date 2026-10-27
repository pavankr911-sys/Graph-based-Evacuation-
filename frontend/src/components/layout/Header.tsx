"use client";

import { useEffect } from "react";
import { Bell, Search, User, ZoomIn, ZoomOut, RotateCcw, PanelLeftClose, PanelLeft, Trophy, Play } from "lucide-react";
import { useUIStore } from "@/store/uiStore";
import Link from "next/link";
import { useEditorStore } from "@/store/editorStore";

export function Header() {
  const { uiScale, zoomInUI, zoomOutUI, resetUIZoom, setUiScale, sidebarCollapsed, toggleSidebar } = useUIStore();
  const buildingId = useEditorStore((s) => s.buildingId);

  // Sync zoom style with body on mount and whenever uiScale updates
  useEffect(() => {
    if (typeof document !== "undefined") {
      (document.body.style as any).zoom = `${uiScale}%`;
    }
  }, [uiScale]);

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 shrink-0 shadow-xs z-20">
      <div className="flex items-center space-x-3 text-slate-500">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors border border-slate-200 shadow-2xs"
          title={sidebarCollapsed ? "Expand Sidebar (more details)" : "Collapse Sidebar (free up +192px editor width)"}
        >
          {sidebarCollapsed ? <PanelLeft size={18} className="text-indigo-600" /> : <PanelLeftClose size={18} />}
        </button>

        <div className="hidden md:flex items-center text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
          <Search size={16} className="mr-2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search models, floors..." 
            className="bg-transparent border-none outline-none text-xs w-44 placeholder:text-slate-400 text-slate-700"
          />
        </div>
      </div>
      
      {/* Center/Right: Global UI Scale Controls & Quick Links */}
      <div className="flex items-center space-x-3">
        {/* Global UI Scale Controller (Relieves Congestion on Smaller Laptops/Monitors) */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase px-2 hidden sm:flex items-center gap-1 select-none">
            <ZoomIn size={13} className="text-indigo-600" />
            UI Zoom:
          </span>

          <button 
            onClick={zoomOutUI}
            className="p-1 rounded-lg bg-white hover:bg-slate-200 text-slate-700 active:scale-95 transition-all shadow-2xs border border-slate-200/80 cursor-pointer"
            title="Zoom Out Interface (-5%)"
          >
            <ZoomOut size={13} />
          </button>

          <button 
            onClick={resetUIZoom}
            className="px-2 py-0.5 mx-1 rounded-md font-bold font-mono text-slate-800 bg-white hover:bg-slate-200 active:scale-95 transition-all shadow-2xs border border-slate-200/80 cursor-pointer text-xs"
            title="Click to reset UI scale to 100%"
          >
            {uiScale}%
          </button>

          <button 
            onClick={zoomInUI}
            className="p-1 rounded-lg bg-white hover:bg-slate-200 text-slate-700 active:scale-95 transition-all shadow-2xs border border-slate-200/80 cursor-pointer"
            title="Zoom In Interface (+5%)"
          >
            <ZoomIn size={13} />
          </button>

          {/* Quick UI Scale Presets */}
          <div className="hidden lg:flex items-center space-x-1 pl-1.5 ml-1 border-l border-slate-200">
            {[75, 85, 90, 100].map((scale) => (
              <button
                key={scale}
                onClick={() => setUiScale(scale)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-all ${
                  uiScale === scale
                    ? "bg-indigo-600 text-white shadow-2xs"
                    : "bg-white text-slate-600 hover:bg-slate-200 border border-slate-200/80"
                }`}
                title={`Scale UI to ${scale}%`}
              >
                {scale}%
              </button>
            ))}
          </div>
        </div>

        {/* Quick Launch Head-to-Head Race Link */}
        <Link
          href={`/scenarios?buildingId=${buildingId || ""}&mode=race`}
          className="hidden sm:flex items-center px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-all cursor-pointer"
          title="Launch 4-Algorithm Head-to-Head Race"
        >
          <Trophy size={14} className="mr-1.5 text-amber-200" />
          <span>4 Head-to-Head</span>
        </Link>

        <button className="hover:text-slate-800 text-slate-500 transition-colors p-2 rounded-full hover:bg-slate-100">
          <Bell size={18} />
        </button>
        <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center border border-indigo-200 font-bold text-xs">
          <User size={15} />
        </div>
      </div>
    </header>
  );
}
