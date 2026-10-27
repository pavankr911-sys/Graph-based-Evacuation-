"use client";

import { useEffect, useState } from "react";
import { Building2, Activity, PlayCircle, PlusCircle, ArrowRight, ShieldCheck, Trophy, Sparkles, FolderOpen, Trash2, Layers, Play } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteBuilding, saveBuilding, generateGraph } from "@/lib/api/client";
import { createSampleAcademicBuilding } from "@/lib/editor/sampleBuilding";

const API_BASE = "http://localhost:8000/api/v1";

export default function DashboardPage() {
  const router = useRouter();
  const [buildings, setBuildings] = useState<any[]>([]);
  const [simulationCount, setSimulationCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const loadBuildings = async () => {
    try {
      const bRes = await fetch(`${API_BASE}/buildings`);
      if (bRes.ok) {
        const bData = await bRes.json();
        setBuildings(bData || []);
      }
    } catch (e) {
      console.error("Failed to load buildings:", e);
    }
  };

  useEffect(() => {
    async function loadStats() {
      setLoading(true);
      await loadBuildings();

      try {
        const sRes = await fetch(`${API_BASE}/buildings/simulations`);
        if (sRes.ok) {
          const sData = await sRes.json();
          setSimulationCount(sData.length);
        }
      } catch (e) {
        console.error("Failed to load simulations:", e);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  const handleDeleteBuilding = async (e: React.MouseEvent, bId: string, bName: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete "${bName}"?`)) return;

    try {
      await deleteBuilding(bId);
      await loadBuildings();
    } catch (err: any) {
      alert(`Failed to delete building: ${err.message}`);
    }
  };

  const handleLoadAcademicDemo = async () => {
    setActionLoading(true);
    try {
      const sample = createSampleAcademicBuilding();
      await saveBuilding(sample.buildingId, sample.buildingName, sample.floors, sample.elements);
      try {
        await generateGraph(sample.buildingId);
      } catch (gErr) {
        console.warn("Auto-graph on demo create:", gErr);
      }
      router.push(`/editor?buildingId=${sample.buildingId}`);
    } catch (err: any) {
      alert(`Failed to create academic demo: ${err.message}`);
      setActionLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12 select-none">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Command Center</h1>
        <p className="text-slate-500 mt-1">Overview of your saved buildings, active topologies, and simulations.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Buildings Card */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Building2 size={24} />
              </div>
              <span className="text-2xl font-bold text-slate-700">
                {buildings.length}
              </span>
            </div>
            <h3 className="text-slate-700 font-semibold">Saved Buildings</h3>
            <p className="text-slate-500 text-sm mt-1 mb-4">Named floorplans & multi-story structures</p>
          </div>
          <Link href="/editor" className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center">
            <PlusCircle size={16} className="mr-1" /> Open Building Editor
          </Link>
        </div>

        {/* Scenarios Card */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Activity size={24} />
              </div>
              <span className="text-2xl font-bold text-slate-700">4 Algos</span>
            </div>
            <h3 className="text-slate-700 font-semibold">Head-to-Head Race</h3>
            <p className="text-slate-500 text-sm mt-1 mb-4">Dijkstra vs Safety vs Load vs Predictive</p>
          </div>
          <Link href="/scenarios" className="text-emerald-600 hover:text-emerald-700 text-sm font-medium flex items-center">
            <PlusCircle size={16} className="mr-1" /> Configure Scenarios
          </Link>
        </div>

        {/* Simulations Card */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <PlayCircle size={24} />
              </div>
              <span className="text-2xl font-bold text-slate-700">
                {simulationCount !== null ? simulationCount : "..."}
              </span>
            </div>
            <h3 className="text-slate-700 font-semibold">Simulations</h3>
            <p className="text-slate-500 text-sm mt-1 mb-4">Recent runs and comparative telemetry</p>
          </div>
          <Link href="/simulations" className="text-purple-600 hover:text-purple-700 text-sm font-medium flex items-center">
            <PlayCircle size={16} className="mr-1" /> View Results & Analytics
          </Link>
        </div>
      </div>

      {/* SAVED BUILDINGS SHOWCASE */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <FolderOpen size={20} className="text-indigo-600" />
              Saved Buildings Library
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select any saved building by name to immediately open in the editor or launch simulations for faculty demonstration.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleLoadAcademicDemo}
              disabled={actionLoading}
              className="flex items-center px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-bold rounded-lg shadow-xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              title="Loads a pre-configured 2-Story Academic Wing with classrooms, corridors, stairwells, exits, and fire hazards"
            >
              <Sparkles size={14} className="mr-1.5 text-amber-300" />
              <span>{actionLoading ? "Generating..." : "⚡ Quick Demo: Academic Wing"}</span>
            </button>

            <Link
              href="/editor"
              className="flex items-center px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-lg shadow-2xs transition-all"
            >
              <PlusCircle size={14} className="mr-1.5 text-slate-500" />
              <span>+ New Building</span>
            </Link>
          </div>
        </div>

        {buildings.length === 0 ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center flex flex-col items-center justify-center">
            <Building2 size={40} className="text-slate-300 mb-2" />
            <h3 className="text-sm font-bold text-slate-800">No Buildings Saved Yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
              Start by designing a floorplan in the Building Editor, or launch our pre-configured Academic Wing demo in one click.
            </p>
            <button
              onClick={handleLoadAcademicDemo}
              className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <Sparkles size={14} className="mr-1.5 text-amber-300" />
              <span>Load 2-Story Academic Wing Demo</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {buildings.map((b) => (
              <div 
                key={b.id} 
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:shadow-md hover:border-indigo-300 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 group-hover:bg-indigo-100 text-indigo-700 flex items-center justify-center transition-colors">
                      <Building2 size={20} />
                    </div>
                    <button
                      onClick={(e) => handleDeleteBuilding(e, b.id, b.name)}
                      className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Delete building"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors line-clamp-1">
                    {b.name || "Untitled Building"}
                  </h3>

                  <div className="flex items-center space-x-2 text-xs text-slate-500 mt-2 font-medium">
                    <span className="flex items-center">
                      <Layers size={13} className="mr-1 text-slate-400" />
                      {b.total_floors || 1} {b.total_floors === 1 ? "Floor" : "Floors"}
                    </span>
                    <span>•</span>
                    <span className="font-mono text-[11px] text-slate-400">ID: {b.id.slice(0, 8)}</span>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                  <Link
                    href={`/editor?buildingId=${b.id}`}
                    className="flex-1 flex items-center justify-center px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg transition-colors"
                  >
                    <span>Open Editor</span>
                    <ArrowRight size={13} className="ml-1" />
                  </Link>

                  <Link
                    href={`/scenarios?buildingId=${b.id}&mode=race`}
                    className="flex items-center justify-center px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold rounded-lg shadow-2xs transition-all"
                    title="Launch 4-Algorithm Head-to-Head Race"
                  >
                    <Trophy size={13} className="mr-1 text-amber-200" />
                    <span>Race</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-xl shadow-md border border-slate-800 p-8 text-white">
        <div className="max-w-2xl">
          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-3">
            <Sparkles size={14} className="mr-1.5 text-amber-300" />
            Academic Presentation & Research Ready
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Emergency Evacuation Digital Twin</h2>
          <p className="text-slate-300 text-sm leading-relaxed mb-6">
            Model multi-floor architectural plans with vertical stair shafts, place dynamic fire sources, and benchmark 
            predictive routing against standard shortest-path algorithms under live fire dynamics.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link 
              href="/scenarios" 
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg shadow-sm text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
            >
              <Trophy size={16} className="mr-2 text-amber-300" />
              Launch Head-to-Head Race
            </Link>
            <Link 
              href="/editor" 
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg shadow-sm text-sm font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
            >
              <Building2 size={16} className="mr-2" />
              Open Building Editor
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
