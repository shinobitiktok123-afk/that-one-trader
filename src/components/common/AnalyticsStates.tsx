import React from 'react';
import { BarChart2, Loader2, Wallet, History, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

export const LoadingAnalytics = () => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-pulse">
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className="h-64 bg-bg-secondary border border-border-main rounded-2xl p-6 space-y-4">
        <div className="flex justify-between">
          <div className="h-4 w-32 bg-bg-tertiary rounded" />
          <div className="h-8 w-8 bg-bg-tertiary rounded-full" />
        </div>
        <div className="h-32 w-full bg-bg-tertiary rounded-lg" />
        <div className="flex gap-4">
          <div className="h-4 w-20 bg-bg-tertiary rounded" />
          <div className="h-4 w-20 bg-bg-tertiary rounded" />
        </div>
      </div>
    ))}
  </div>
);

export const EmptyAnalytics = () => (
  <div className="min-h-[400px] flex flex-col items-center justify-center p-12 text-center space-y-6">
    <div className="w-20 h-20 bg-brand-primary/10 rounded-full flex items-center justify-center">
      <History className="w-10 h-10 text-brand-primary" />
    </div>
    <div className="max-w-md space-y-2">
      <h3 className="text-xl font-bold text-white uppercase tracking-wider">No Trading History</h3>
      <p className="text-sm text-text-muted leading-relaxed">
        You haven't completed any trades yet. Start sniped or manual trades to unlock advanced performance analytics and PnL tracking.
      </p>
    </div>
    <button 
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="px-8 py-3 bg-brand-primary text-black font-black uppercase text-xs rounded-xl hover:scale-105 transition-all shadow-lg shadow-brand-primary/20"
    >
      Start First Trade
    </button>
  </div>
);

export const WalletNotConnected = () => (
  <div className="min-h-[400px] flex flex-col items-center justify-center p-12 text-center space-y-6">
    <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center">
      <Wallet className="w-10 h-10 text-blue-500" />
    </div>
    <div className="max-w-md space-y-2">
      <h3 className="text-xl font-bold text-white uppercase tracking-wider">Wallet Not Linked</h3>
      <p className="text-sm text-text-muted leading-relaxed">
        Connect or create a wallet to start tracking your performance. Real-time analytics require an active session.
      </p>
    </div>
  </div>
);

export const ChartError = ({ message }: { message?: string }) => (
  <div className="h-full flex flex-col items-center justify-center p-6 bg-bg-tertiary/30 border border-dashed border-border-main rounded-xl space-y-3">
    <AlertCircle className="w-6 h-6 text-red-500/50" />
    <p className="text-[10px] text-text-muted font-black uppercase tracking-widest">
      {message || 'Data visualization failed'}
    </p>
  </div>
);
