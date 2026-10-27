"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Map, Settings, Users, Activity, ChevronLeft, ChevronRight } from "lucide-react";
import { useUIStore } from "@/store/uiStore";

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  const links = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Building Editor", href: "/editor", icon: Map },
    { name: "Simulations", href: "/simulations", icon: Activity },
    { name: "Scenarios (Race)", href: "/scenarios", icon: Users },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <aside className={`${
      sidebarCollapsed ? "w-16" : "w-60"
    } bg-slate-900 text-slate-300 flex flex-col h-full border-r border-slate-800 shrink-0 transition-all duration-200 select-none`}>
      {/* Brand Header */}
      <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-3 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-xs shrink-0">
            DT
          </div>
          {!sidebarCollapsed && (
            <span className="font-bold text-slate-100 tracking-wider text-xs truncate">
              EVACUATION TWIN
            </span>
          )}
        </Link>
        <button
          onClick={toggleSidebar}
          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
      
      {/* Navigation links */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;

          return (
            <Link 
              key={link.name} 
              href={link.href}
              title={sidebarCollapsed ? link.name : undefined}
              className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors text-xs font-semibold ${
                isActive
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              } ${sidebarCollapsed ? "justify-center px-0" : ""}`}
            >
              <Icon size={18} className="shrink-0" />
              {!sidebarCollapsed && <span className="truncate">{link.name}</span>}
            </Link>
          );
        })}
      </nav>
      
      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800 text-[10px] text-slate-500 text-center">
        {!sidebarCollapsed ? "v1.2.0 • Digital Twin" : "v1.2"}
      </div>
    </aside>
  );
}
