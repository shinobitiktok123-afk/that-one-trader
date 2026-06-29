import React, { useState } from 'react';
import { 
  X, ExternalLink, Shield, Target, 
  TrendingUp, TrendingDown, Clock, Wallet,
  Activity, Info, AlertCircle, Trash2, 
  Edit3, Save, MousePointer2, Zap, 
  BarChart3, RefreshCcw, History, FileText,
  Lock, Unlock
} from 'lucide-react';
import { Trade, TradeStatus, WalletMode } from '../types';
import { useWallet } from '../lib/WalletContext';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';

const ControlButton = ({ label, icon: Icon, onClick, variant = 'outline', danger }: any) => (
  <button 
    onClick={onClick}
    className={cn(
      "flex items-center justify-center gap-2 p-3 rounded-lg border font-black text-[10px] uppercase tracking-widest transition-all active:scale-95",
      variant === 'outline' ? "bg-bg-tertiary border-border-main text-text-muted hover:text-white hover:border-brand-primary" : "bg-brand-primary text-black border-transparent hover:brightness-110",
      danger && "border-brand-danger/30 text-brand-danger hover:bg-brand-danger/10 hover:border-brand-danger"
    )}
  >
    <Icon className="w-3.5 h-3.5" />
    {label}
  </button>
);

export const TradeDrawer = ({ trade, onClose }: { trade: Trade | null; onClose: () => void }) => {
  const { closeTrade, updateTradeTriggers } = useWallet();
  const [isClosing, setIsClosing] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'logs' | 'ai'>('details');

  if (!trade) return null;

  const handleClosePosition = async () => {
    if (!confirm('Are you sure you want to exit this position immediately at market price?')) return;
    setIsClosing(true);
    try {
      await closeTrade(trade.id);
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to close trade');
    } finally {
      setIsClosing(false);
    }
  };

  const pnl = trade.pnl || 0;
  const pnlPercent = trade.pnlPercent || 0;
  const isProfit = pnl >= 0;

  return (
    <div className="fixed inset-0 z-[150] flex justify-end">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="relative w-full max-w-xl bg-bg-card border-l border-border-main shadow-2xl h-full flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-border-main flex items-center justify-between bg-bg-main/50 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-bg-tertiary border border-border-main flex items-center justify-center text-brand-primary font-black text-xl">
               {trade.tokenLogo ? <img src={trade.tokenLogo} alt="" className="w-full h-full object-cover rounded-2xl" /> : trade.tokenSymbol[0]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white uppercase">{trade.tokenName}</h2>
                <span className="text-[10px] text-text-muted font-mono bg-white/5 px-2 py-0.5 rounded border border-white/10">{trade.tokenSymbol}</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                 <span className="text-[9px] text-text-muted font-bold uppercase tracking-widest flex items-center gap-1">
                   <Shield className="w-3 h-3 text-brand-primary" /> SECURED BY {trade.walletMode === WalletMode.SIMULATION ? 'AI-SIM' : 'ON-CHAIN'}
                 </span>
                 <a href={`https://solscan.io/token/${trade.tokenAddress}`} target="_blank" rel="noopener noreferrer" className="text-brand-secondary hover:underline text-[9px] font-bold flex items-center gap-1 uppercase">
                   <ExternalLink className="w-3 h-3" /> SOLSCAN
                 </a>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-text-muted hover:text-white transition-all">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content Tabs */}
        <div className="flex border-b border-border-main px-6">
          {(['details', 'logs', 'ai'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-6 py-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all",
                activeTab === tab ? "border-brand-primary text-white" : "border-transparent text-text-muted hover:text-white"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
          {activeTab === 'details' && (
            <>
              {/* PnL Banner */}
              <div className={cn(
                "p-6 rounded-2xl border flex flex-col items-center justify-center space-y-2 relative overflow-hidden",
                isProfit ? "bg-brand-primary/5 border-brand-primary/20" : "bg-brand-danger/5 border-brand-danger/20"
              )}>
                 <div className={cn("absolute top-0 right-0 p-3 opacity-10", isProfit ? "text-brand-primary" : "text-brand-danger")}>
                    <Activity className="w-20 h-20" />
                 </div>
                 <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Current Unrealized PnL</span>
                 <div className={cn("text-4xl font-black", isProfit ? "text-brand-primary" : "text-brand-danger")}>
                    {isProfit ? '+' : ''}{pnlPercent.toFixed(2)}%
                 </div>
                 <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <span>{pnl.toFixed(4)} SOL</span>
                    <span className="text-text-muted">•</span>
                    <span>VAL: {((trade.currentPrice || trade.entryPrice) * trade.quantity).toFixed(3)} SOL</span>
                 </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-bg-tertiary/50 border border-border-main p-4 rounded-xl space-y-1">
                  <span className="text-[8px] font-black text-text-muted uppercase tracking-widest">Entry Price</span>
                  <div className="text-sm font-black text-white">${trade.entryPrice.toFixed(8)}</div>
                </div>
                <div className="bg-bg-tertiary/50 border border-border-main p-4 rounded-xl space-y-1">
                  <span className="text-[8px] font-black text-text-muted uppercase tracking-widest">Current Price</span>
                  <div className="text-sm font-black text-brand-primary">${(trade.currentPrice || trade.entryPrice).toFixed(8)}</div>
                </div>
                <div className="bg-bg-tertiary/50 border border-border-main p-4 rounded-xl space-y-1">
                  <span className="text-[8px] font-black text-text-muted uppercase tracking-widest">Amount Invested</span>
                  <div className="text-sm font-black text-white">{trade.amount.toFixed(2)} SOL</div>
                </div>
                <div className="bg-bg-tertiary/50 border border-border-main p-4 rounded-xl space-y-1">
                  <span className="text-[8px] font-black text-text-muted uppercase tracking-widest">Token Quantity</span>
                  <div className="text-sm font-black text-white">{trade.quantity.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                </div>
              </div>

              {/* Trigger Controls */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                   <Zap className="w-3.5 h-3.5 text-brand-primary" /> Active Safety Triggers
                </h3>
                <div className="space-y-3">
                   <div className="p-4 bg-bg-tertiary border border-border-main rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <div className="p-2 bg-brand-danger/10 rounded-lg">
                            <Shield className="w-4 h-4 text-brand-danger" />
                         </div>
                         <div>
                            <span className="text-[10px] font-black text-white uppercase">Stop Loss</span>
                            <p className="text-[8px] text-text-muted uppercase">{trade.stopLossPrice ? `Trigger at $${trade.stopLossPrice.toFixed(8)}` : 'DISABLED'}</p>
                         </div>
                      </div>
                      <button className="text-[8px] font-black text-brand-secondary uppercase hover:underline">Configure</button>
                   </div>

                   <div className="p-4 bg-bg-tertiary border border-border-main rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <div className="p-2 bg-brand-primary/10 rounded-lg">
                            <Target className="w-4 h-4 text-brand-primary" />
                         </div>
                         <div>
                            <span className="text-[10px] font-black text-white uppercase">Take Profit Levels</span>
                            <p className="text-[8px] text-text-muted uppercase">{trade.takeProfitLevels?.length || 0} ACTIVE TRIGGERS</p>
                         </div>
                      </div>
                      <button className="text-[8px] font-black text-brand-secondary uppercase hover:underline">Manage</button>
                   </div>

                   <div className="p-4 bg-bg-tertiary border border-border-main rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <div className="p-2 bg-blue-500/10 rounded-lg">
                            <RefreshCcw className="w-4 h-4 text-blue-400" />
                         </div>
                         <div>
                            <span className="text-[10px] font-black text-white uppercase">Trailing Stop</span>
                            <p className="text-[8px] text-text-muted uppercase">{trade.trailingStopActive ? `${trade.trailingStopDistance}% DISTANCE` : 'DISABLED'}</p>
                         </div>
                      </div>
                      <button className="text-[8px] font-black text-brand-secondary uppercase hover:underline">Toggle</button>
                   </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                   <History className="w-3.5 h-3.5 text-brand-secondary" /> Execution History
                </h3>
              </div>
              <div className="space-y-3">
                {trade.logs?.map((log, i) => (
                  <div key={i} className="relative pl-6 pb-4 border-l border-border-main last:border-0 last:pb-0">
                    <div className="absolute left-[-5px] top-0 w-2.5 h-2.5 rounded-full bg-brand-primary border-4 border-bg-card shadow-lg" />
                    <div className="p-3 bg-bg-tertiary border border-border-main rounded-lg space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black text-white uppercase">{log.event}</span>
                        <span className="text-[8px] text-text-muted font-mono">{log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : 'N/A'}</span>
                      </div>
                      {log.price && <div className="text-[8px] text-text-muted font-bold uppercase">Price: ${log.price.toFixed(8)}</div>}
                      {log.txHash && <div className="text-[8px] text-brand-secondary font-mono truncate">TX: {log.txHash}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-6">
               <div className="p-6 bg-brand-primary/5 border border-brand-primary/20 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                     <span className="text-[10px] font-black text-brand-primary uppercase tracking-widest">Neural Confidence Score</span>
                     <span className="text-3xl font-black text-white">{trade.aiScore || 0}</span>
                  </div>
                  <div className="w-full h-2 bg-bg-main rounded-full overflow-hidden">
                     <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${trade.aiScore || 0}%` }}
                        className="h-full bg-brand-primary shadow-[0_0_10px_rgba(var(--brand-primary-rgb),0.5)]" 
                     />
                  </div>
                  <p className="text-[9px] text-text-muted uppercase leading-relaxed italic">
                    "Incoming data streams indicate a potential expansion phase. Momentum scores are holding steady despite recent volatility. High probability of continuation above entry levels."
                  </p>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-bg-tertiary border border-border-main rounded-xl space-y-2">
                     <span className="text-[8px] font-black text-text-muted uppercase">Rug Risk Level</span>
                     <div className={cn("text-sm font-black uppercase", trade.rugRisk === 'Low' ? 'text-brand-primary' : 'text-brand-danger')}>
                        {trade.rugRisk || 'UNVERIFIED'}
                     </div>
                  </div>
                  <div className="p-4 bg-bg-tertiary border border-border-main rounded-xl space-y-2">
                     <span className="text-[8px] font-black text-text-muted uppercase">Holder Distribution</span>
                     <div className="text-sm font-black text-white uppercase">HEALTHY</div>
                  </div>
               </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-border-main grid grid-cols-2 gap-4 bg-bg-main/50 backdrop-blur-xl">
           <ControlButton 
              label="Market Exit" 
              icon={Trash2} 
              danger 
              onClick={handleClosePosition}
           />
           <ControlButton 
              label="Share Results" 
              icon={ExternalLink} 
              variant="primary"
           />
           <ControlButton 
              label="Edit Triggers" 
              icon={Edit3} 
              className="col-span-2"
           />
        </div>
      </motion.div>
    </div>
  );
};
