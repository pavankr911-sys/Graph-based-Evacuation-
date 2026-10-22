"use client";

import { useEffect, useState, Suspense } from "react";
import { 
  Building2, Activity, Play, Settings2, Trophy, Swords, Zap, 
  CheckCircle2, Clock, AlertTriangle, Users, Flame, ArrowRight 
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { compareAlgorithms } from "@/lib/api/client";

const API_BASE = "http://localhost:8000/api/v1";

interface Building {
  id: string;
  name: string;
  created_at?: string;
  total_floors?: number;
}

function ScenariosContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryBuildingId = searchParams.get("buildingId");

  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [runningRace, setRunningRace] = useState(false);
  const [raceStep, setRaceStep] = useState("");

  // Mode: Head-to-Head Race (All 4) vs Single Algorithm
  const [mode, setMode] = useState<"RACE" | "SINGLE">("RACE");

  // Form Parameters
  const [selectedBuilding, setSelectedBuilding] = useState<string>("");
  const [algorithm, setAlgorithm] = useState("ALGO_D");
  const [occupants, setOccupants] = useState(20);
  const [hazardSpread, setHazardSpread] = useState(0.05);
  const [maxTimeSec, setMaxTimeSec] = useState(60);

  useEffect(() => {
    async function fetchBuildings() {
      try {
        const res = await fetch(`${API_BASE}/buildings`);
        if (res.ok) {
          const data: Building[] = await res.json();
          setBuildings(data);
          
          if (queryBuildingId && data.some(b => b.id === queryBuildingId)) {
            setSelectedBuilding(queryBuildingId);
          } else if (data.length > 0) {
            setSelectedBuilding(data[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to fetch buildings:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchBuildings();
  }, [queryBuildingId]);

  const handleRunSingle = async () => {
    if (!selectedBuilding) {
      alert("Please select a target building first.");
      return;
    }
    setRunning(true);
    try {
      const payload = {
        occupant_count: occupants,
        tick_rate_hz: 5.0,
        max_time_sec: maxTimeSec,
        hazard_ignition_nodes: [],
        hazard_spread_rate: hazardSpread,
        routing_algorithm: algorithm
      };
      
      const res = await fetch(`${API_BASE}/buildings/${selectedBuilding}/simulations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        const sim = await res.json();
        router.push(`/editor?simId=${sim.id}&buildingId=${selectedBuilding}`);
      } else {
        const errText = await res.text();
        alert(`Failed to start simulation: ${errText}`);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Failed to start simulation: ${err.message}`);
    } finally {
      setRunning(false);
    }
  };

  const handleRunRace = async () => {
    if (!selectedBuilding) {
      alert("Please select a target building first.");
      return;
    }
    setRunningRace(true);
    setRaceStep("Spawning identical agent demographics...");
    try {
      setRaceStep("Simulating A (Shortest), B (Safety), C (Load), and D (Predictive)...");
      const payload = {
        occupant_count: occupants,
        tick_rate_hz: 5.0,
        max_time_sec: maxTimeSec,
        hazard_ignition_nodes: [],
        hazard_spread_rate: hazardSpread,
        algorithms: ["ALGO_A", "ALGO_B", "ALGO_C", "ALGO_D"]
      };

      const comparison = await compareAlgorithms(selectedBuilding, payload);
      setRaceStep("Compiling comparative telemetry & metrics...");
      
      if (typeof window !== "undefined") {
        localStorage.setItem("latest_comparison", JSON.stringify(comparison));
      }
      
      router.push(`/simulations?buildingId=${selectedBuilding}&race=true`);
    } catch (err: any) {
      console.error("Comparative race failed:", err);
      alert(`Comparative race failed: ${err.message}`);
    } finally {
      setRunningRace(false);
      setRaceStep("");
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-slate-500 flex items-center">
        <Activity className="animate-spin mr-2" /> Loading scenario configurations...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Scenario Configurator</h1>
          <p className="text-slate-500 mt-1">Configure hazard spread, crowd sizes, and benchmark evacuation routing algorithms.</p>
        </div>
      </div>

      {/* Mode Selection Tabs */}
      <div className="flex bg-slate-200 p-1 rounded-xl max-w-md">
        <button
          onClick={() => setMode("RACE")}
          className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all flex items-center justify-center ${
            mode === "RACE"
              ? "bg-white text-emerald-700 shadow-sm font-semibold"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Trophy size={16} className="mr-2 text-amber-500" />
          Head-to-Head Race (All 4)
        </button>
        <button
          onClick={() => setMode("SINGLE")}
          className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all flex items-center justify-center ${
            mode === "SINGLE"
              ? "bg-white text-blue-700 shadow-sm font-semibold"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Settings2 size={16} className="mr-2" />
          Single Algorithm
        </button>
      </div>

      <div className="bg-white shadow-sm border border-slate-200 rounded-xl overflow-hidden p-6 space-y-8">
        
        {/* Building Selection */}
        <section>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider flex items-center">
              <Building2 size={16} className="mr-2 text-blue-600" /> Target Building Floorplan
            </h2>
            <button
              onClick={() => router.push("/editor")}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center"
            >
              Open Editor to Draw Floorplan <ArrowRight size={12} className="ml-1" />
            </button>
          </div>
          
          <select 
            className="w-full max-w-lg bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 font-medium"
            value={selectedBuilding}
            onChange={(e) => setSelectedBuilding(e.target.value)}
          >
            {buildings.length === 0 && <option value="">No buildings found (create one in Building Editor)...</option>}
            {buildings.map((b, idx) => (
              <option key={b.id} value={b.id}>
                {b.name || "Untitled Building"} ({b.id.slice(0, 8)}...)
              </option>
            ))}
          </select>
        </section>

        <hr className="border-slate-100" />

        {/* Algorithm Strategy Overview */}
        {mode === "RACE" ? (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider flex items-center">
                <Swords size={16} className="mr-2 text-amber-500" /> 4 Contenders Benchmark
              </h2>
              <span className="text-xs bg-emerald-100 text-emerald-800 font-medium px-2.5 py-0.5 rounded-full">
                Fair Benchmark (Identical Starting Agents)
              </span>
            </div>
            
            <p className="text-xs text-slate-500">
              All 4 algorithms will execute on the exact same occupant spawn coordinates, demographics, and live fire dynamics.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-1">
              <div className="p-3.5 border border-slate-200 rounded-lg bg-slate-50">
                <span className="text-xs font-semibold px-2 py-0.5 bg-slate-200 text-slate-700 rounded">ALGO A</span>
                <h3 className="font-semibold text-slate-900 mt-2 text-sm">Baseline Shortest</h3>
                <p className="text-xs text-slate-500 mt-1">Shortest geometric path. Ignores fire proximity & congestion.</p>
              </div>
              <div className="p-3.5 border border-amber-200 rounded-lg bg-amber-50/50">
                <span className="text-xs font-semibold px-2 py-0.5 bg-amber-100 text-amber-800 rounded">ALGO B</span>
                <h3 className="font-semibold text-amber-900 mt-2 text-sm">Safety-Aware</h3>
                <p className="text-xs text-slate-600 mt-1">Dynamically penalizes routes adjacent to active fire & smoke zones.</p>
              </div>
              <div className="p-3.5 border border-blue-200 rounded-lg bg-blue-50/50">
                <span className="text-xs font-semibold px-2 py-0.5 bg-blue-100 text-blue-800 rounded">ALGO C</span>
                <h3 className="font-semibold text-blue-900 mt-2 text-sm">Load-Aware</h3>
                <p className="text-xs text-slate-600 mt-1">Balances exit utilization to avoid bottleneck queues at narrow doors.</p>
              </div>
              <div className="p-3.5 border border-emerald-300 rounded-lg bg-emerald-50/60 shadow-xs">
                <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">ALGO D</span>
                <h3 className="font-semibold text-emerald-900 mt-2 text-sm">Predictive System</h3>
                <p className="text-xs text-emerald-700 mt-1">Combines predicted queue delays with real-time hazard avoidance.</p>
              </div>
            </div>
          </section>
        ) : (
          <section>
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider flex items-center mb-4">
              <Settings2 size={16} className="mr-2 text-blue-600" /> Select Routing Algorithm
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div 
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${algorithm === 'ALGO_A' ? 'border-blue-500 bg-blue-50/70 shadow-xs' : 'border-slate-200 hover:border-blue-300'}`}
                onClick={() => setAlgorithm('ALGO_A')}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900">Algorithm A (Baseline)</h3>
                  {algorithm === 'ALGO_A' && <CheckCircle2 size={16} className="text-blue-600" />}
                </div>
                <p className="text-xs text-slate-500 mt-1">Pure Dijkstra shortest path. Ignores fire and congestion.</p>
              </div>
              <div 
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${algorithm === 'ALGO_B' ? 'border-amber-500 bg-amber-50/70 shadow-xs' : 'border-slate-200 hover:border-amber-300'}`}
                onClick={() => setAlgorithm('ALGO_B')}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900">Algorithm B (Safety-Aware)</h3>
                  {algorithm === 'ALGO_B' && <CheckCircle2 size={16} className="text-amber-600" />}
                </div>
                <p className="text-xs text-slate-500 mt-1">Penalizes routes that pass near active fire and smoke corridors.</p>
              </div>
              <div 
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${algorithm === 'ALGO_C' ? 'border-blue-500 bg-blue-50/70 shadow-xs' : 'border-slate-200 hover:border-blue-300'}`}
                onClick={() => setAlgorithm('ALGO_C')}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900">Algorithm C (Load-Aware)</h3>
                  {algorithm === 'ALGO_C' && <CheckCircle2 size={16} className="text-blue-600" />}
                </div>
                <p className="text-xs text-slate-500 mt-1">Reroutes occupants away from congested doors to secondary exits.</p>
              </div>
              <div 
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${algorithm === 'ALGO_D' ? 'border-emerald-500 bg-emerald-50/70 shadow-xs' : 'border-slate-200 hover:border-emerald-300'}`}
                onClick={() => setAlgorithm('ALGO_D')}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-emerald-800">Algorithm D (Predictive Multi-Factor)</h3>
                  {algorithm === 'ALGO_D' && <CheckCircle2 size={16} className="text-emerald-600" />}
                </div>
                <p className="text-xs text-emerald-700 mt-1">Predicts bottleneck delays and steers clear of advancing hazards simultaneously.</p>
              </div>
            </div>
          </section>
        )}

        <hr className="border-slate-100" />

        {/* Parameters */}
        <section>
          <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider flex items-center mb-4">
            <Activity size={16} className="mr-2 text-indigo-600" /> Environmental Parameters
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-slate-700 flex items-center">
                  <Users size={15} className="mr-1.5 text-blue-600" /> Occupant Count
                </label>
                <div className="flex items-center space-x-1">
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={occupants}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setOccupants(isNaN(val) ? 1 : Math.max(1, Math.min(1000, val)));
                    }}
                    className="w-16 px-1.5 py-0.5 text-sm font-bold text-center bg-white border border-slate-300 rounded text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
                  />
                  <span className="text-xs text-slate-500">people</span>
                </div>
              </div>
              <input 
                type="range" min="1" max="500" value={occupants} 
                onChange={(e) => setOccupants(parseInt(e.target.value))} 
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" 
              />
              <div className="flex justify-between items-center mt-2 text-xs text-slate-500">
                <span className="text-slate-400">Presets:</span>
                <div className="flex space-x-1">
                  {[10, 25, 50, 100, 200, 500].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setOccupants(preset)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-all ${
                        occupants === preset
                          ? "bg-blue-600 text-white"
                          : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-slate-700 flex items-center">
                  <Flame size={15} className="mr-1.5 text-red-500" /> Fire Spread Rate
                </label>
                <span className="text-sm font-bold text-slate-900">{hazardSpread.toFixed(2)}x</span>
              </div>
              <input 
                type="range" min="0" max="0.25" step="0.01" value={hazardSpread} 
                onChange={(e) => setHazardSpread(parseFloat(e.target.value))} 
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" 
              />
              <span className="text-xs text-slate-400 mt-1 block">Intensity expansion speed per second</span>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-slate-700 flex items-center">
                  <Clock size={15} className="mr-1.5 text-indigo-600" /> Max Sim Duration
                </label>
                <span className="text-sm font-bold text-slate-900">{maxTimeSec}s</span>
              </div>
              <input 
                type="range" min="30" max="120" step="15" value={maxTimeSec} 
                onChange={(e) => setMaxTimeSec(parseInt(e.target.value))} 
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" 
              />
              <span className="text-xs text-slate-400 mt-1 block">Simulation timeout cap</span>
            </div>
          </div>
        </section>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-slate-600">
            {runningRace && (
              <span className="flex items-center text-emerald-700 font-semibold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                <Activity size={16} className="mr-2 animate-spin text-emerald-600" />
                {raceStep}
              </span>
            )}
            {running && (
              <span className="flex items-center text-blue-700 font-medium">
                <Activity size={16} className="mr-2 animate-spin text-blue-600" />
                Executing single algorithm simulation...
              </span>
            )}
          </div>

          {mode === "RACE" ? (
            <button 
              onClick={handleRunRace}
              disabled={runningRace || !selectedBuilding}
              className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white px-7 py-3 rounded-lg font-semibold shadow-sm transition-all flex items-center justify-center disabled:opacity-50 hover:shadow"
            >
              {runningRace ? (
                <>
                  <Activity size={18} className="mr-2 animate-spin" />
                  Running 4-Way Race...
                </>
              ) : (
                <>
                  <Trophy size={18} className="mr-2 text-amber-300" />
                  Launch Head-to-Head Algorithm Race
                </>
              )}
            </button>
          ) : (
            <button 
              onClick={handleRunSingle}
              disabled={running || !selectedBuilding}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium shadow-sm transition-colors flex items-center justify-center disabled:opacity-50"
            >
              {running ? (
                <>
                  <Activity size={18} className="mr-2 animate-spin" />
                  Simulating...
                </>
              ) : (
                <>
                  <Play size={18} className="mr-2" />
                  Execute Single Scenario
                </>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

export default function ScenariosPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-500">Loading Scenarios...</div>}>
      <ScenariosContent />
    </Suspense>
  );
}
