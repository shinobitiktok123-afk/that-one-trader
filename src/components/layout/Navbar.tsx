import React from 'react';
import { Search, Bell, User, Cpu, Power } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useWebSocketSignals } from '../../lib/WebSocketContext';

export const Navbar = ({ isNeuralStreamOpen, setIsNeuralStreamOpen }: { isNeuralStreamOpen: boolean, setIsNeuralStreamOpen: (o: boolean) => void }) => {
  const { isNeuralStreamEnabled, enableNeuralStream, disableNeuralStream } = useWebSocketSignals();

  return (
    <nav className="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-[#0a0a0a]/80 backdrop-blur-md">
        <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-white tracking-tighter">SOLTRADER</h1>
        </div>
        <div className="flex-1 max-w-xl mx-4">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input type="text" placeholder="Search tokens..." className="w-full bg-gray-900 border border-gray-800 rounded-lg py-2 pl-10 pr-4 text-sm focus:border-brand-primary outline-none" />
            </div>
        </div>
        <div className="flex items-center gap-4">
            <div className="flex items-center bg-gray-900 rounded-full p-1 border border-gray-800 mr-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase px-3 tracking-widest">Neutral Stream</span>
                <button 
                    onClick={() => isNeuralStreamEnabled ? disableNeuralStream() : enableNeuralStream()}
                    className={cn(
                        "flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all",
                        isNeuralStreamEnabled ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                    )}
                >
                    <Power className="w-3 h-3" />
                    {isNeuralStreamEnabled ? 'ON' : 'OFF'}
                </button>
            </div>
            
            {isNeuralStreamEnabled && (
              <button 
                  onClick={() => setIsNeuralStreamOpen(!isNeuralStreamOpen)}
                  className={cn("p-2 rounded-full transition-all", isNeuralStreamOpen ? "bg-brand-primary/20 text-brand-primary" : "text-gray-400 hover:text-white")}
              >
                  <Cpu className="w-5 h-5" />
              </button>
            )}
            <Bell className="w-5 h-5 text-gray-400 cursor-pointer" />
            <User className="w-5 h-5 text-gray-400 cursor-pointer" />
        </div>
    </nav>
  );
};
