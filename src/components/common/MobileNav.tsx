import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, LayoutDashboard, Wallet, TrendingUp, Target, PieChart, Activity, Users, Settings, Zap } from 'lucide-react';
import { cn } from '../../lib/utils';
import { UserRole } from '../../types';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  setActiveTab: (tab: any) => void;
  activeTab: string;
  user: any;
}

export const MobileNavDrawer: React.FC<MobileNavProps> = ({ isOpen, onClose, setActiveTab, activeTab, user }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '-100%' }}
          animate={{ x: 0 }}
          exit={{ x: '-100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed inset-y-0 left-0 w-64 bg-bg-card border-r border-border-main z-[1000] p-6 shadow-2xl"
        >
          <div className="flex justify-between items-center mb-10">
            <span className="text-lg font-bold tracking-tighter">SOLANA<span className="text-brand-primary">AI</span></span>
            <button onClick={onClose} className="text-text-muted hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <nav className="flex flex-col gap-4">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'terminal', label: 'Terminal', icon: Zap },
              { id: 'live_trades', label: 'Live Trades', icon: Activity },
              { id: 'sniper', label: 'Bot Sniper', icon: Target },
              { id: 'wallets', label: 'Wallets', icon: Wallet },
              { id: 'analytics', label: 'Analytics', icon: PieChart },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); onClose(); }}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg text-sm font-bold uppercase tracking-widest",
                  activeTab === item.id ? "bg-brand-primary/10 text-brand-primary" : "text-text-muted hover:text-white hover:bg-bg-tertiary"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </button>
            ))}
            {(user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN) && (
              <button
                onClick={() => { setActiveTab('admin'); onClose(); }}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg text-sm font-bold uppercase tracking-widest",
                  activeTab === 'admin' ? "bg-brand-primary/10 text-brand-primary" : "text-text-muted hover:text-white hover:bg-bg-tertiary"
                )}
              >
                <Users className="w-5 h-5" />
                Admin
              </button>
            )}
          </nav>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
