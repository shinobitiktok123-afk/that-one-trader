import React from 'react';
import { cn } from '../../lib/utils';
import { 
  LayoutDashboard, Terminal, Briefcase, Activity, 
  History, BarChart3, Trophy, Bell, Wallet, 
  Settings, User, ChevronLeft, ChevronRight, Search, Menu
} from 'lucide-react';

export const Sidebar = ({ isSidebarOpen, setIsSidebarOpen }: { isSidebarOpen: boolean, setIsSidebarOpen: (o: boolean) => void }) => {
  return (
    <aside className={cn("border-r border-gray-800 bg-[#0a0a0a] flex flex-col transition-all duration-300", isSidebarOpen ? "w-64" : "w-16")}>
        <div className="p-4 flex items-center justify-between">
            {isSidebarOpen && <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Menu</p>}
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1 rounded hover:bg-gray-800">
                {isSidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            </button>
        </div>
        <div className="mt-4 flex flex-col gap-1 px-2">
            {[
                { icon: LayoutDashboard, label: 'Dashboard' },
                { icon: Terminal, label: 'Terminal' },
                { icon: Briefcase, label: 'Portfolio' },
            ].map((item, i) => (
                <button key={i} className="flex items-center gap-3 py-2 px-3 rounded hover:bg-gray-800 transition">
                    <item.icon size={20} />
                    {isSidebarOpen && <span>{item.label}</span>}
                </button>
            ))}
        </div>
    </aside>
  );
};
