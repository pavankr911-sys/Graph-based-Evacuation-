import { Building2, Activity, PlayCircle, PlusCircle } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Command Center</h1>
        <p className="text-slate-500 mt-1">Overview of your buildings and active simulations.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Buildings Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Building2 size={24} />
            </div>
            <span className="text-2xl font-bold text-slate-700">0</span>
          </div>
          <h3 className="text-slate-700 font-semibold">Buildings</h3>
          <p className="text-slate-500 text-sm mt-1 mb-4">Saved configurations and topologies</p>
          <Link href="/editor" className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center">
            <PlusCircle size={16} className="mr-1" /> New Building
          </Link>
        </div>

        {/* Scenarios Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Activity size={24} />
            </div>
            <span className="text-2xl font-bold text-slate-700">0</span>
          </div>
          <h3 className="text-slate-700 font-semibold">Scenarios</h3>
          <p className="text-slate-500 text-sm mt-1 mb-4">Hazard profiles and agent counts</p>
          <button className="text-emerald-600 hover:text-emerald-700 text-sm font-medium flex items-center">
            <PlusCircle size={16} className="mr-1" /> Create Scenario
          </button>
        </div>

        {/* Simulations Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <PlayCircle size={24} />
            </div>
            <span className="text-2xl font-bold text-slate-700">0</span>
          </div>
          <h3 className="text-slate-700 font-semibold">Simulations</h3>
          <p className="text-slate-500 text-sm mt-1 mb-4">Recent and running simulation executions</p>
          <button className="text-purple-600 hover:text-purple-700 text-sm font-medium flex items-center">
            <PlayCircle size={16} className="mr-1" /> View Results
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center mt-12">
        <h2 className="text-lg font-semibold text-slate-700 mb-2">Welcome to the Digital Twin</h2>
        <p className="text-slate-500 max-w-xl mx-auto mb-6">
          The environment is configured and ready. Start by modeling a building floorplan using the Building Editor, generate its navigation topology, and configure emergency scenarios.
        </p>
        <Link href="/editor" className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors">
          Open Building Editor
        </Link>
      </div>
    </div>
  );
}
