"use client";

import { useEffect, useState } from "react";
import { Building2, Activity, PlayCircle, PlusCircle, ArrowRight, ShieldCheck, Trophy, Sparkles } from "lucide-react";
import Link from "next/link";

const API_BASE = "http://localhost:8000/api/v1";

export default function DashboardPage() {
  const [buildingCount, setBuildingCount] = useState<number | null>(null);
  const [simulationCount, setSimulationCount] = useState<number | null>(null);

  useEffect(() => {
    async function loadStats() {
      try {
        const bRes = await fetch(`${API_BASE}/buildings`);
        if (bRes.ok) {
          const bData = await bRes.json();
          setBuildingCount(bData.length);
        }
      } catch (e) {
        console.error("Failed to load buildings:", e);
      }

      try {
        const sRes = await fetch(`${API_BASE}/buildings/simulations`);
        if (sRes.ok) {
          const sData = await sRes.json();
          setSimulationCount(sData.length);
        }
      } catch (e) {
        console.error("Failed to load simulations:", e);
      }
    }
    loadStats();
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Command Center</h1>
        <p className="text-slate-500 mt-1">Overview of your buildings and active simulations.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Buildings Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Building2 size={24} />
              </div>
              <span className="text-2xl font-bold text-slate-700">
                {buildingCount !== null ? buildingCount : "..."}
              </span>
            </div>
            <h3 className="text-slate-700 font-semibold">Buildings</h3>
            <p className="text-slate-500 text-sm mt-1 mb-4">Saved configurations and topologies</p>
          </div>
          <Link href="/editor" className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center">
            <PlusCircle size={16} className="mr-1" /> Open Building Editor
          </Link>
        </div>

        {/* Scenarios Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Activity size={24} />
              </div>
              <span className="text-2xl font-bold text-slate-700">4 Algos</span>
            </div>
            <h3 className="text-slate-700 font-semibold">Scenarios & Benchmark</h3>
            <p className="text-slate-500 text-sm mt-1 mb-4">Hazard profiles, populations & Head-to-Head race</p>
          </div>
          <Link href="/scenarios" className="text-emerald-600 hover:text-emerald-700 text-sm font-medium flex items-center">
            <PlusCircle size={16} className="mr-1" /> Configure Scenarios
          </Link>
        </div>

        {/* Simulations Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between">
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

      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-xl shadow-md border border-slate-800 p-8 text-white">
        <div className="max-w-2xl">
          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-3">
            <Sparkles size={14} className="mr-1.5 text-amber-300" />
            Milestone 2: Intelligent Routing & Fair Race
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Emergency Evacuation Digital Twin</h2>
          <p className="text-slate-300 text-sm leading-relaxed mb-6">
            Model multi-floor architectural plans, digitize blueprints, generate navigation graphs, and benchmark 
            predictive routing against baseline shortest-path algorithms under live fire dynamics.
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
