"use client";

import { useEffect, useState } from "react";
import { Activity, Clock, Play, User, CheckCircle2, XCircle, Trophy, Flame, ShieldAlert, Award, ArrowUpRight, BarChart3, TrendingUp } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { getLatestComparison } from "@/lib/api/client";

const API_BASE = "http://localhost:8000/api/v1";

interface AlgorithmMetric {
  algorithm: string;
  algorithm_name: string;
  simulation_id: string;
  total_evacuation_time: number;
  evacuated_count: number;
  trapped_count: number;
  casualties: number;
  avg_evacuation_time: number;
  evacuation_curve: { time: number; evacuated: number }[];
}

interface ComparisonResult {
  building_id: string;
  occupant_count: number;
  metrics: Record<string, AlgorithmMetric>;
  winner: string;
  summary: string;
  created_at?: string;
}

interface SimulationRun {
  id: string;
  building_id: string;
  status: string;
  config: any;
  results: any;
  created_at: string;
}

const ALGO_COLORS: Record<string, { bg: string; text: string; stroke: string; bar: string }> = {
  ALGO_A: { bg: "bg-slate-100", text: "text-slate-800", stroke: "#64748b", bar: "bg-slate-500" },
  ALGO_B: { bg: "bg-amber-50", text: "text-amber-800", stroke: "#f59e0b", bar: "bg-amber-500" },
  ALGO_C: { bg: "bg-blue-50", text: "text-blue-800", stroke: "#3b82f6", bar: "bg-blue-500" },
  ALGO_D: { bg: "bg-emerald-50", text: "text-emerald-800", stroke: "#10b981", bar: "bg-emerald-500" },
};

export default function SimulationsPage() {
  const [runs, setRuns] = useState<SimulationRun[]>([]);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        // 1. Fetch simulation runs
        const res = await fetch(`${API_BASE}/buildings/simulations`);
        if (res.ok) {
          const data = await res.json();
          setRuns(data);
        }

        // 2. Fetch latest comparative race
        const latest = await getLatestComparison();
        if (latest && latest.metrics) {
          setComparison(latest);
        } else if (typeof window !== "undefined") {
          const cached = localStorage.getItem("latest_comparison");
          if (cached) {
            setComparison(JSON.parse(cached));
          }
        }
      } catch (err) {
        console.error("Failed to fetch simulation data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-slate-500 flex items-center">
        <Activity className="animate-spin mr-2" /> Loading simulations and comparative analytics...
      </div>
    );
  }

  // Pre-calculate max values for comparison charts
  const metricsList = comparison ? Object.values(comparison.metrics) : [];
  const maxEvacTime = metricsList.length > 0 ? Math.max(...metricsList.map(m => m.total_evacuation_time), 1) : 100;
  const maxOccupants = comparison ? comparison.occupant_count : 20;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Simulation Analytics & Comparative Race</h1>
          <p className="text-slate-500 mt-1">Benchmark routing strategies (Algorithms A, B, C, D) under identical fire spread.</p>
        </div>
        <Link 
          href="/scenarios" 
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center shadow-sm"
        >
          <Play size={16} className="mr-2" />
          Run Head-to-Head Race
        </Link>
      </div>

      {/* Head-to-Head Comparison Section */}
      {comparison && metricsList.length > 0 && (
        <div className="space-y-6">
          {/* Winner Banner */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-xl p-6 text-white shadow-md relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/40 text-emerald-100 border border-emerald-400/30 mb-2">
                  <Trophy size={14} className="mr-1.5 text-amber-300" />
                  Winner: {comparison.metrics[comparison.winner]?.algorithm_name || comparison.winner}
                </div>
                <h2 className="text-xl font-bold tracking-tight">Head-to-Head Algorithm Race Results</h2>
                <p className="text-emerald-100 text-sm max-w-2xl leading-relaxed">
                  {comparison.summary}
                </p>
              </div>

              <div className="flex items-center space-x-6 bg-white/10 backdrop-blur-sm p-3.5 rounded-lg border border-white/10">
                <div className="text-center">
                  <div className="text-2xl font-black text-amber-300">
                    {comparison.metrics[comparison.winner]?.total_evacuation_time}s
                  </div>
                  <div className="text-xs text-emerald-200">Winning Evac Time</div>
                </div>
                <div className="w-px h-8 bg-white/20" />
                <div className="text-center">
                  <div className="text-2xl font-black text-emerald-200">
                    {comparison.metrics[comparison.winner]?.casualties === 0 ? "0" : comparison.metrics[comparison.winner]?.casualties}
                  </div>
                  <div className="text-xs text-emerald-200">Casualties</div>
                </div>
              </div>
            </div>
          </div>

          {/* 4 Competitor Scorecards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {metricsList.map((metric) => {
              const isWinner = metric.algorithm === comparison.winner;
              const color = ALGO_COLORS[metric.algorithm] || ALGO_COLORS.ALGO_A;
              const evacRate = comparison.occupant_count > 0 
                ? Math.round((metric.evacuated_count / comparison.occupant_count) * 100)
                : 100;

              return (
                <div 
                  key={metric.algorithm}
                  className={`bg-white rounded-xl border p-5 transition-all shadow-sm flex flex-col justify-between ${
                    isWinner ? "border-emerald-500 ring-2 ring-emerald-500/20" : "border-slate-200"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${color.bg} ${color.text}`}>
                        {metric.algorithm.replace("_", " ")}
                      </span>
                      {isWinner && (
                        <span className="flex items-center text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          <Award size={12} className="mr-1" /> 1st Place
                        </span>
                      )}
                    </div>

                    <h3 className="font-semibold text-slate-900 text-sm">{metric.algorithm_name}</h3>

                    <div className="mt-4 space-y-2.5">
                      <div className="flex justify-between items-baseline text-xs">
                        <span className="text-slate-500">Total Evac Time</span>
                        <span className="font-bold text-slate-900 text-sm">{metric.total_evacuation_time}s</span>
                      </div>
                      <div className="flex justify-between items-baseline text-xs">
                        <span className="text-slate-500">Evacuated Rate</span>
                        <span className="font-semibold text-emerald-600">{metric.evacuated_count}/{comparison.occupant_count} ({evacRate}%)</span>
                      </div>
                      <div className="flex justify-between items-baseline text-xs">
                        <span className="text-slate-500">Fire Casualties</span>
                        <span className={`font-semibold ${metric.casualties > 0 ? "text-red-600" : "text-slate-700"}`}>
                          {metric.casualties}
                        </span>
                      </div>
                      <div className="flex justify-between items-baseline text-xs">
                        <span className="text-slate-500">Mean Speed/Exit</span>
                        <span className="font-medium text-slate-700">{metric.avg_evacuation_time}s</span>
                      </div>
                    </div>
                  </div>

                  <Link 
                    href={`/editor?simId=${metric.simulation_id}&buildingId=${comparison.building_id}`}
                    className="mt-5 w-full flex items-center justify-center py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors"
                  >
                    Watch Run Playback <ArrowUpRight size={13} className="ml-1 text-slate-400" />
                  </Link>
                </div>
              );
            })}
          </div>

          {/* Visual Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bar Chart: Total Evacuation Time */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 flex items-center">
                    <BarChart3 size={16} className="mr-2 text-blue-600" />
                    Total Evacuation Time (TET)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Lower time is better. Highlights routing efficiency.</p>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                {metricsList.map((m) => {
                  const widthPct = Math.max(15, Math.min(100, (m.total_evacuation_time / maxEvacTime) * 100));
                  const isWinner = m.algorithm === comparison.winner;
                  const color = ALGO_COLORS[m.algorithm] || ALGO_COLORS.ALGO_A;

                  return (
                    <div key={m.algorithm} className="space-y-1">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-slate-700">{m.algorithm_name}</span>
                        <span className={isWinner ? "font-bold text-emerald-700" : "text-slate-900"}>
                          {m.total_evacuation_time}s
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden flex">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${color.bar}`} 
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Evacuation Timeline Curves (SVG Line Chart) */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 flex items-center">
                    <TrendingUp size={16} className="mr-2 text-emerald-600" />
                    Evacuation Progress Over Time
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Cumulative occupants escaped over time (s).</p>
                </div>
                {/* Mini Legend */}
                <div className="flex items-center space-x-2 text-[10px]">
                  <span className="flex items-center text-slate-600"><span className="w-2 h-2 rounded-full bg-slate-500 mr-1" /> A</span>
                  <span className="flex items-center text-amber-600"><span className="w-2 h-2 rounded-full bg-amber-500 mr-1" /> B</span>
                  <span className="flex items-center text-blue-600"><span className="w-2 h-2 rounded-full bg-blue-500 mr-1" /> C</span>
                  <span className="flex items-center text-emerald-600 font-bold"><span className="w-2 h-2 rounded-full bg-emerald-500 mr-1" /> D</span>
                </div>
              </div>

              {/* Render SVG Line Chart */}
              <div className="w-full h-44 relative pt-2">
                <svg viewBox="0 0 400 140" className="w-full h-full overflow-visible">
                  {/* Grid Lines */}
                  <line x1="40" y1="20" x2="380" y2="20" stroke="#f1f5f9" strokeDasharray="3 3" />
                  <line x1="40" y1="70" x2="380" y2="70" stroke="#f1f5f9" strokeDasharray="3 3" />
                  <line x1="40" y1="120" x2="380" y2="120" stroke="#e2e8f0" strokeWidth="1" />
                  <line x1="40" y1="20" x2="40" y2="120" stroke="#e2e8f0" strokeWidth="1" />

                  {/* Y-Axis Labels */}
                  <text x="35" y="24" fontSize="9" textAnchor="end" fill="#94a3b8">{maxOccupants}</text>
                  <text x="35" y="74" fontSize="9" textAnchor="end" fill="#94a3b8">{Math.round(maxOccupants / 2)}</text>
                  <text x="35" y="124" fontSize="9" textAnchor="end" fill="#94a3b8">0</text>

                  {/* X-Axis Labels */}
                  <text x="40" y="135" fontSize="9" textAnchor="middle" fill="#94a3b8">0s</text>
                  <text x="210" y="135" fontSize="9" textAnchor="middle" fill="#94a3b8">{Math.round(maxEvacTime / 2)}s</text>
                  <text x="380" y="135" fontSize="9" textAnchor="middle" fill="#94a3b8">{Math.round(maxEvacTime)}s</text>

                  {/* Polylines for each algorithm */}
                  {metricsList.map((m) => {
                    const color = ALGO_COLORS[m.algorithm] || ALGO_COLORS.ALGO_A;
                    const curve = m.evacuation_curve || [];
                    if (curve.length < 2) return null;

                    const points = curve.map(pt => {
                      const x = 40 + (pt.time / maxEvacTime) * 340;
                      const y = 120 - (pt.evacuated / maxOccupants) * 100;
                      return `${x.toFixed(1)},${y.toFixed(1)}`;
                    }).join(" ");

                    return (
                      <polyline
                        key={`curve-${m.algorithm}`}
                        fill="none"
                        stroke={color.stroke}
                        strokeWidth={m.algorithm === comparison.winner ? "3" : "1.8"}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={points}
                      />
                    );
                  })}
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Historical Simulation Table */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Historical Simulation Runs</h2>
          <p className="text-slate-500 text-xs mt-0.5">Every simulation recorded in database.</p>
        </div>

        {runs.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
            <Activity size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-900">No simulations recorded yet</h3>
            <p className="text-slate-500 mt-1 max-w-sm mx-auto">Launch a scenario or head-to-head race from the scenarios tab to populate this dashboard.</p>
          </div>
        ) : (
          <div className="bg-white shadow-sm border border-slate-200 rounded-xl overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Algorithm</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Occupants</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Evac Time</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Executed</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {runs.map((run) => {
                  const totalFrames = run.results?.frames?.length || 0;
                  const evacTime = run.results?.metrics?.total_evacuation_time || (totalFrames > 0 ? run.results.frames[totalFrames - 1].time_sec : 0);
                  
                  return (
                    <tr key={run.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {run.status === "COMPLETED" ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle2 size={14} className="mr-1" /> Completed
                          </span>
                        ) : run.status === "FAILED" ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <XCircle size={14} className="mr-1" /> Failed
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            <Activity size={14} className="mr-1 animate-pulse" /> Running
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                        {run.config?.routing_algorithm || "ALGO_A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        <div className="flex items-center">
                          <User size={14} className="mr-1.5 text-slate-400" />
                          {run.config?.occupant_count || 0}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        <div className="flex items-center">
                          <Clock size={14} className="mr-1.5 text-slate-400" />
                          {evacTime > 0 ? `${evacTime}s` : "--"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {formatDistanceToNow(new Date(run.created_at), { addSuffix: true })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link href={`/editor?simId=${run.id}&buildingId=${run.building_id}`} className="text-emerald-600 hover:text-emerald-900 font-semibold">
                          View Playback →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

