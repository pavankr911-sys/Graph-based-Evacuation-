import { Bell, Search, User } from "lucide-react";

export function Header() {
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 shadow-sm z-10">
      <div className="flex items-center text-slate-500">
        <Search size={20} className="mr-2" />
        <input 
          type="text" 
          placeholder="Search models, simulations..." 
          className="bg-transparent border-none outline-none text-sm w-64 placeholder:text-slate-400"
        />
      </div>
      
      <div className="flex items-center space-x-4 text-slate-500">
        <button className="hover:text-slate-800 transition-colors p-2 rounded-full hover:bg-slate-100">
          <Bell size={20} />
        </button>
        <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center border border-blue-200">
          <User size={16} />
        </div>
      </div>
    </header>
  );
}
