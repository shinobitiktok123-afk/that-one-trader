import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, TrendingDown, Clock, Wallet, 
  Search, Filter, ArrowUpDown, ChevronRight, 
  ExternalLink, Trash2, Edit3, X, Info, 
  ShieldAlert, BarChart3, PieChart, Layers,
  Zap, Activity, Target, Shield, MousePointer2
} from 'lucide-react';
import { useWallet } from '../lib/WalletContext';
import { Trade, TradeStatus, WalletMode } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';

const StatusBadge = ({ status }: { status: TradeStatus }) => {
  const styles = {
    [TradeStatus.MONITORING]: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    [TradeStatus.TRAILING_ACTIVE]: "bg-blue-600/20 text-blue-300 border-blue-600/30",
    [TradeStatus.TP_PENDING]: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    [TradeStatus.SL_PENDING]: "bg-red-500/20 text-red-400 border-red-500/30",
    [TradeStatus.SELLING]: "bg-orange-600/20 text-orange-400 animate-pulse border-orange-600/30",
    [TradeStatus.COMPLETED]: "bg-brand-primary/10 text-brand-primary border-brand-primary/20",
    [TradeStatus.FAILED]: "bg-red-600/20 text-red-500 border-red-600/30",
    [TradeStatus.PREPARING]: "bg-white/10 text-white border-white/20",
    [TradeStatus.SUBMITTED]: "bg-white/20 text-white border-white/30",
    [TradeStatus.PENDING]: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
    [TradeStatus.CONFIRMED]: "bg-brand-primary/20 text-brand-primary border-brand-primary/30",
    [TradeStatus.CANCELLED]: "bg-gray-600/20 text-gray-500 border-gray-600/30",
    [TradeStatus.EXITING]: "bg-orange-500/10 text-orange-400 border-orange-500/20 animate-pulse",
  };

  return (
    <span className={cn("px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border", styles[status] || styles[TradeStatus.MONITORING])}>
      {status.replace('_', ' ')}
    </span>
  );
};

const StatCard = ({ label, value, subValue, icon: Icon, colorClass, isPaper }: any) => (
  <div className="bg-bg-card border border-border-main p-4 rounded-xl flex flex-col justify-between group hover:border-brand-primary/30 transition-all relative overflow-hidden">
    {isPaper && (
      <div className="absolute top-0 right-0 px-2 py-0.5 bg-yellow-500/10 text-yellow-500 text-[6px] font-black uppercase tracking-tighter rounded-bl border-l border-b border-yellow-500/20">
        PAPER ENGINE
      </div>
    )}
    <div className="flex justify-between items-start mb-2">
      <div className="p-2 bg-bg-tertiary rounded-lg group-hover:scale-110 transition-transform">
        <Icon className={cn("w-4 h-4", colorClass || "text-brand-primary")} />
      </div>
      <span className="text-[8px] font-black text-text-muted uppercase tracking-widest">{label}</span>
    </div>
    <div>
      <div className="text-xl font-black text-white">{value}</div>
      <div className="text-[9px] font-bold text-text-muted uppercase mt-0.5">{subValue}</div>
    </div>
  </div>
);

const safeDate = (dateInput: any) => {
  if (!dateInput) return new Date();
  const d = new Date(dateInput);
  return isNaN(d.getTime()) ? new Date() : d;
};

export const LiveTrades = ({ onSelectTrade }: { onSelectTrade: (trade: Trade) => void }) => {
  const { trades, user, walletMode } = useWallet();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'profit' | 'loss' | 'auto' | 'manual'>('all');
  const [sortKey, setSortKey] = useState<keyof Trade | 'pnlPercent'>('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const activeTrades = useMemo(() => {
    return trades.filter(t => 
      t.status !== TradeStatus.COMPLETED && 
      t.status !== TradeStatus.FAILED && 
      t.status !== TradeStatus.CANCELLED
    );
  }, [trades]);

  const filteredTrades = useMemo(() => {
    let result = activeTrades.filter(t => 
      t.tokenSymbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.tokenAddress.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (filterType === 'profit') result = result.filter(t => (t.pnl || 0) > 0);
    if (filterType === 'loss') result = result.filter(t => (t.pnl || 0) <= 0);
    if (filterType === 'auto') result = result.filter(t => !!t.sniperMode);
    if (filterType === 'manual') result = result.filter(t => !t.sniperMode);

    return result.sort((a, b) => {
      let valA: any = a[sortKey as keyof Trade];
      let valB: any = b[sortKey as keyof Trade];
      
      if (sortKey === 'pnlPercent') {
        valA = a.pnlPercent || 0;
        valB = b.pnlPercent || 0;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [activeTrades, searchTerm, filterType, sortKey, sortOrder]);

  const stats = useMemo(() => {
    const totalInvested = activeTrades.reduce((sum, t) => sum + t.amount, 0);
    const totalPnL = activeTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const winCount = trades.filter(t => t.status === TradeStatus.COMPLETED && (t.pnl || 0) > 0).length;
    const totalClosed = trades.filter(t => t.status === TradeStatus.COMPLETED).length;

    return {
      activeCount: activeTrades.length,
      totalInvested,
      currentValue: totalInvested + totalPnL,
      totalPnL,
      pnlPercent: totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0,
      winRate: totalClosed > 0 ? (winCount / totalClosed) * 100 : 0
    };
  }, [activeTrades, trades]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        <StatCard label="Active Trades" value={stats.activeCount} subValue="Live Positions" icon={Layers} isPaper={walletMode === WalletMode.SIMULATION} />
        <StatCard label="Total Invested" value={`${stats.totalInvested.toFixed(2)} SOL`} subValue="Capital At Risk" icon={Wallet} isPaper={walletMode === WalletMode.SIMULATION} />
        <StatCard label="Portfolio Value" value={`${stats.currentValue.toFixed(2)} SOL`} subValue="Live Valuation" icon={PieChart} isPaper={walletMode === WalletMode.SIMULATION} />
        <StatCard 
          label="Unrealized PnL" 
          value={`${stats.totalPnL >= 0 ? '+' : ''}${stats.totalPnL.toFixed(3)} SOL`} 
          subValue={`${stats.pnlPercent.toFixed(2)}% ROI`} 
          icon={Activity} 
          colorClass={stats.totalPnL >= 0 ? "text-brand-primary" : "text-brand-danger"} 
          isPaper={walletMode === WalletMode.SIMULATION}
        />
        <StatCard label="Win Rate" value={`${stats.winRate.toFixed(1)}%`} subValue="Historical Accuracy" icon={Target} isPaper={walletMode === WalletMode.SIMULATION} />
        <StatCard label="Bot Status" value="RUNNING" subValue="All Nodes Active" icon={Zap} isPaper={walletMode === WalletMode.SIMULATION} />
      </div>

      {/* Controls & Table */}
      <div className="bg-bg-card border border-border-main rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border-main flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input 
                type="text" 
                placeholder="SEARCH POSITIONS..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-bg-main border border-border-main rounded-lg py-2 pl-10 pr-4 text-[10px] font-bold text-white outline-none focus:border-brand-primary placeholder:text-text-muted/50 tracking-widest"
              />
            </div>
            <div className="flex bg-bg-main border border-border-main p-1 rounded-lg">
              {(['all', 'profit', 'loss', 'auto'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilterType(f)}
                  className={cn(
                    "px-3 py-1.5 text-[8px] font-black uppercase tracking-widest rounded transition-all",
                    filterType === f ? "bg-brand-primary text-black" : "text-text-muted hover:text-white"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button className="p-2 bg-bg-main border border-border-main rounded hover:border-brand-primary transition-all">
              <ArrowUpDown className="w-4 h-4 text-text-muted" />
            </button>
            <button className="p-2 bg-bg-main border border-border-main rounded hover:border-brand-primary transition-all">
              <Filter className="w-4 h-4 text-text-muted" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[10px] text-left border-collapse">
            <thead>
              <tr className="text-text-muted bg-white/[0.02] uppercase tracking-widest font-black border-b border-border-main">
                <th className="px-4 py-4">Token / Identity</th>
                <th className="px-4 py-4">Bot Source</th>
                <th className="px-4 py-4">Quantity / Value</th>
                <th className="px-4 py-4">Prices (Entry/Live)</th>
                <th className="px-4 py-4">Live PnL</th>
                <th className="px-4 py-4">Exit Rules</th>
                <th className="px-4 py-4 text-right">Monitoring Status</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              <AnimatePresence mode="popLayout">
                {filteredTrades.map((trade) => {
                  const livePrice = trade.currentPrice || trade.entryPrice;
                  const fees = trade.fees || 0;
                  const currentVal = livePrice * trade.quantity;
                  const entryVal = trade.entryPrice * trade.quantity;
                  const pnl = trade.type === 'buy' ? (currentVal - entryVal - fees) : (entryVal - currentVal - fees);
                  const pnlPercent = entryVal > 0 ? (pnl / entryVal) * 100 : 0;
                  const isProfit = pnl >= 0;
                  const elapsed = formatDistanceToNow(safeDate(trade.boughtAt || trade.timestamp));

                  return (
                    <motion.tr 
                      key={trade.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => onSelectTrade(trade)}
                      className="border-b border-border-main/50 group hover:bg-white/[0.03] transition-all cursor-pointer relative"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-bg-tertiary border border-border-main flex items-center justify-center text-brand-primary font-black text-xs overflow-hidden">
                             {trade.tokenLogo ? <img src={trade.tokenLogo} alt="" /> : trade.tokenSymbol[0]}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-white font-sans font-black">{trade.tokenSymbol}</span>
                            <span className="text-[7px] text-text-muted uppercase tracking-widest flex items-center gap-1 font-mono">
                              {trade.tokenAddress.slice(0, 4)}...{trade.tokenAddress.slice(-4)}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-1">
                           <span className={cn(
                             "px-2 py-0.5 rounded text-[7px] font-black uppercase w-fit",
                             trade.botType === 'fresh' ? "bg-purple-500/10 text-purple-400" :
                             trade.botType === 'hype' ? "bg-orange-500/10 text-orange-400" :
                             trade.botType === 'ai' ? "bg-brand-primary/10 text-brand-primary" : "bg-bg-tertiary text-text-muted"
                           )}>
                             {trade.botType} sniper
                           </span>
                           <span className="text-[7px] text-text-muted uppercase">{elapsed} ago</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col">
                          <span className="text-white font-bold">{trade.quantity.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                          <span className="text-[8px] text-text-muted uppercase">VALUE: {currentVal.toFixed(3)} SOL</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col">
                          <span className="text-white font-bold">${livePrice.toFixed(8)}</span>
                          <span className="text-[8px] text-text-muted uppercase">ENTRY: ${trade.entryPrice.toFixed(8)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col">
                          <span className={cn("font-black", isProfit ? "text-brand-primary" : "text-brand-danger")}>
                            {isProfit ? '+' : ''}{pnl.toFixed(4)} SOL
                          </span>
                          <div className={cn(
                            "inline-flex items-center gap-1 text-[9px] font-black",
                            isProfit ? "text-brand-primary" : "text-brand-danger"
                          )}>
                            {isProfit ? <TrendingUp className="w-2 h-2" /> : <TrendingDown className="w-2 h-2" />}
                            {pnlPercent.toFixed(2)}%
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-1">
                           {trade.stopLossPrice && (
                             <div className="flex items-center justify-between gap-4 text-[7px]">
                               <span className="text-brand-danger uppercase">SL:</span>
                               <span className="text-white font-bold">${trade.stopLossPrice.toFixed(8)}</span>
                             </div>
                           )}
                           {trade.takeProfitLevels?.find(l => !l.hit) && (
                             <div className="flex items-center justify-between gap-4 text-[7px]">
                               <span className="text-brand-primary uppercase">TP:</span>
                               <span className="text-white font-bold">${trade.takeProfitLevels.find(l => !l.hit)?.price?.toFixed(8)}</span>
                             </div>
                           )}
                           {trade.trailingStopActive && (
                             <div className="flex items-center justify-between gap-4 text-[7px]">
                               <span className="text-blue-400 uppercase">TS:</span>
                               <span className="text-white font-bold">{trade.trailingStopDistance}%</span>
                             </div>
                           )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex flex-col items-end gap-1">
                           <StatusBadge status={trade.status} />
                           <div className="flex items-center gap-1.5 mt-1">
                              <span className={cn(
                                "px-1.5 py-0.5 rounded-[2px] text-[6px] font-black uppercase border",
                                trade.rugRisk === 'Safe' ? "bg-green-500/10 text-green-400 border-green-500/20" :
                                trade.rugRisk === 'Warning' ? "bg-orange-500/10 text-orange-400 border-orange-500/20" :
                                "bg-red-500/10 text-red-400 border-red-500/20"
                              )}>
                                {trade.rugRisk || 'Safe'}
                              </span>
                              {trade.isPaper && <span className="px-1.5 py-0.5 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-[2px] text-[6px] font-black uppercase">PAPER</span>}
                           </div>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
              {filteredTrades.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Layers className="w-12 h-12 text-border-main animate-pulse" />
                      <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">No active positions matching criteria</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
