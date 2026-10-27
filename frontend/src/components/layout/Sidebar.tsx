import Link from "next/link";
import { LayoutDashboard, Map, Settings, Users, Activity } from "lucide-react";

export function Sidebar() {
  const links = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Building Editor", href: "/editor", icon: Map },
    { name: "Simulations", href: "/simulations", icon: Activity },
    { name: "Scenarios", href: "/scenarios", icon: Users },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-full border-r border-slate-800 shrink-0">
      <div className="p-4 border-b border-slate-800 flex items-center space-x-3">
        <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center font-bold text-white">DT</div>
        <span className="font-bold text-slate-100 tracking-wide text-sm">DIGITAL TWIN</span>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <Link 
              key={link.name} 
              href={link.href}
              className="flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-slate-800 hover:text-white transition-colors"
            >
              <Icon size={18} />
              <span className="text-sm font-medium">{link.name}</span>
            </Link>
          );
        })}
      </nav>
      
      <div className="p-4 border-t border-slate-800 text-xs text-slate-500">
        Milestone 1 v1.0.0
      </div>
    </aside>
  );
}
