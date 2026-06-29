import React, { useMemo, useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { Target, Zap, BarChart3, TrendingUp, RefreshCcw } from 'lucide-react';
import { useWallet } from '../lib/WalletContext';
import { WalletMode, TradeStatus } from '../types';
import { cn } from '../lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ErrorBoundary } from './common/ErrorBoundary';
import { LoadingAnalytics, EmptyAnalytics, WalletNotConnected, ChartError } from './common/AnalyticsStates';

const Card = ({ children, className, title, subtitle }: { children: React.ReactNode; className?: string; title?: string; subtitle?: string }) => (
  <div className={cn("bg-bg-card border border-border-main rounded-xl p-5 relative overflow-hidden group hover:border-brand-primary/30 transition-all duration-300", className)}>
    {(title || subtitle) && (
      <div className="mb-4">
        {title && <h3 className="text-xs font-bold text-white uppercase tracking-widest">{title}</h3>}
        {subtitle && <p className="text-[10px] text-text-muted mt-1 uppercase tracking-tighter">{subtitle}</p>}
      </div>
    )}
    {children}
  </div>
);

const safeDate = (dateInput: any) => {
  if (!dateInput) return new Date();
  const d = new Date(dateInput);
  return isNaN(d.getTime()) ? new Date() : d;
};

const PnLTrendChart = ({ data }: { data: any[] }) => {
  const validatedData = useMemo(() => {
    if (!Array.isArray(data)) return [];
    return data.filter(d => 
      d && 
      typeof d.balance === 'number' && 
      !isNaN(d.balance) &&
      d.day !== undefined
    );
  }, [data]);

  if (validatedData.length === 0) {
    return <ChartError message="No trend data available" />;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={validatedData}>
        <defs>
          <linearGradient id="colorPnL" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#14F195" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#14F195" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#2B2F36" vertical={false} />
        <XAxis dataKey="day" stroke="#848E9C" fontSize={10} axisLine={false} tickLine={false} />
        <YAxis stroke="#848E9C" fontSize={10} axisLine={false} tickLine={false} />
        <Tooltip 
          contentStyle={{ backgroundColor: '#161A1E', border: '1px solid #2B2F36', fontSize: '10px' }}
          itemStyle={{ color: '#14F195' }}
        />
        <Area type="monotone" dataKey="balance" stroke="#14F195" fillOpacity={1} fill="url(#colorPnL)" />
      </AreaChart>
    </ResponsiveContainer>
  );
};

const TradeDistributionChart = ({ analytics }: { analytics: any }) => {
  if (!analytics || typeof analytics.successRate !== 'number') {
    return <ChartError message="No distribution data available" />;
  }

  return (
    <div className="h-[300px] w-full mt-4 flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl font-bold text-brand-primary">{analytics.successRate.toFixed(1)}%</div>
        <div className="text-[10px] text-text-muted uppercase font-bold tracking-widest mt-2">Accuracy Score</div>
        <div className="mt-6 flex gap-4">
          <div className="text-center">
            <div className="text-xl font-bold text-white">{analytics.totalTrades || 0}</div>
            <div className="text-[8px] text-text-muted uppercase">Trades</div>
          </div>
          <div className="w-px h-8 bg-border-main"></div>
          <div className="text-center">
            <div className="text-xl font-bold text-brand-primary">{Math.round(((analytics.winRate || 0) * (analytics.totalTrades || 0)) / 100)}</div>
            <div className="text-[8px] text-text-muted uppercase">Wins</div>
          </div>
        </div>
      </div>
    </div>
  );
};

const AnalyticsContent = () => {
  const { user, trades, walletMode, resetTradingHistory } = useWallet();
  const [isLoading, setIsLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    // Simulate initial loading or wait for user/trades
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const analytics = useMemo(() => {
    if (!user) return null;
    return user.analytics;
  }, [user]);

  const historyData = useMemo(() => {
    if (!trades || trades.length === 0) return [];
    
    // Trend derived from realized PnL of completed trades
    const completedTrades = trades
      .filter(t => t && t.status === TradeStatus.COMPLETED)
      .sort((a, b) => safeDate(a.timestamp).getTime() - safeDate(b.timestamp).getTime());
      
    if (completedTrades.length === 0) return [];

    const data = [{ day: 'Start', balance: 10 }];
    let runningBalance = 10;
    
    completedTrades.forEach((trade, i) => {
       const pnl = Number(trade.pnl || 0);
       if (!isNaN(pnl)) {
         runningBalance += pnl;
         data.push({ day: String(i + 1), balance: Number(runningBalance.toFixed(4)) });
       }
    });

    return data;
  }, [trades]);

  const completedCount = useMemo(() => 
    trades.filter(t => t.status === TradeStatus.COMPLETED || t.status === TradeStatus.FAILED).length,
  [trades]);

  if (!user && !isLoading) {
    return <WalletNotConnected />;
  }

  if (isLoading) {
    return <LoadingAnalytics />;
  }

  if (completedCount === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center bg-[#0c0c0c] border border-border-main p-4 rounded-xl">
          <div className="space-y-1">
            <h3 className="text-xs font-black text-white uppercase tracking-wider">Trading Engine Control</h3>
            <p className="text-text-muted text-[8px] uppercase">Reset and clear all historical statistics and cached data</p>
          </div>
          <button
            onClick={() => setShowConfirm(true)}
            className="px-4 py-2 bg-brand-danger/10 hover:bg-brand-danger/20 border border-brand-danger/30 hover:border-brand-danger text-brand-danger font-black text-[10px] uppercase tracking-wider rounded-lg transition-all"
          >
            Reset Trading History
          </button>
        </div>

        <EmptyAnalytics />

        {showConfirm && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#0c0c0c] border border-border-main rounded-2xl max-w-md w-full p-6 space-y-6">
              <div className="space-y-2">
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Reset Trading History</h3>
                <p className="text-text-muted text-[10px] leading-relaxed uppercase">
                  Are you absolutely sure you want to completely reset your trading history?
                </p>
                <div className="bg-brand-danger/10 border border-brand-danger/20 rounded p-3 text-[8px] text-brand-danger font-mono uppercase space-y-1">
                  <p>• Deletes: Trade History, Closed Positions, Open Positions</p>
                  <p>• Deletes: Bot Statistics, Win Rate, PnL History</p>
                  <p>• Deletes: Leaderboard Statistics, AI Accuracy Statistics, Purchase Registry</p>
                  <p className="font-bold mt-1 text-white">WILL NOT DELETE: Wallets, Wallet balances, User accounts, Bot configuration, API keys, Admin settings</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="py-3 bg-bg-tertiary text-text-muted font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-bg-tertiary/80 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    setIsResetting(true);
                    try {
                      await resetTradingHistory();
                      setShowConfirm(false);
                    } catch (e) {
                      console.error(e);
                    } finally {
                      setIsResetting(false);
                    }
                  }}
                  disabled={isResetting}
                  className="py-3 bg-brand-danger text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:brightness-110 transition-all disabled:opacity-50"
                >
                  {isResetting ? "Resetting..." : "Confirm Reset"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const stats = [
    { label: 'Overall Win Rate', value: `${analytics?.winRate?.toFixed(1) || '0.0'}%`, trend: '+0%', icon: Target },
    { label: 'Avg Return', value: `${analytics?.avgReturn?.toFixed(1) || '0.0'}%`, trend: '+0%', icon: Zap },
    { label: 'Total Volume', value: `${trades.length} Trades`, trend: 'Lifetime', icon: BarChart3 },
    { label: 'Total PnL', value: `${analytics?.totalPnL?.toFixed(2) || '0.00'} SOL`, trend: walletMode === WalletMode.SIMULATION ? 'SIMULATED' : 'REAL', icon: TrendingUp },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-[#0c0c0c] border border-border-main p-4 rounded-xl">
        <div className="space-y-1">
          <h3 className="text-xs font-black text-white uppercase tracking-wider">Trading Engine Control</h3>
          <p className="text-text-muted text-[8px] uppercase">Reset and clear all historical statistics and cached data</p>
        </div>
        <button
          onClick={() => setShowConfirm(true)}
          className="px-4 py-2 bg-brand-danger/10 hover:bg-brand-danger/20 border border-brand-danger/30 hover:border-brand-danger text-brand-danger font-black text-[10px] uppercase tracking-wider rounded-lg transition-all"
        >
          Reset Trading History
        </button>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0c0c0c] border border-border-main rounded-2xl max-w-md w-full p-6 space-y-6">
            <div className="space-y-2">
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Reset Trading History</h3>
              <p className="text-text-muted text-[10px] leading-relaxed uppercase">
                Are you absolutely sure you want to completely reset your trading history?
              </p>
              <div className="bg-brand-danger/10 border border-brand-danger/20 rounded p-3 text-[8px] text-brand-danger font-mono uppercase space-y-1">
                <p>• Deletes: Trade History, Closed Positions, Open Positions</p>
                <p>• Deletes: Bot Statistics, Win Rate, PnL History</p>
                <p>• Deletes: Leaderboard Statistics, AI Accuracy Statistics, Purchase Registry</p>
                <p className="font-bold mt-1 text-white">WILL NOT DELETE: Wallets, Wallet balances, User accounts, Bot configuration, API keys, Admin settings</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="py-3 bg-bg-tertiary text-text-muted font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-bg-tertiary/80 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setIsResetting(true);
                  try {
                    await resetTradingHistory();
                    setShowConfirm(false);
                  } catch (e) {
                    console.error(e);
                  } finally {
                    setIsResetting(false);
                  }
                }}
                disabled={isResetting}
                className="py-3 bg-brand-danger text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:brightness-110 transition-all disabled:opacity-50"
              >
                {isResetting ? "Resetting..." : "Confirm Reset"}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Profit / Loss Trend" subtitle="Performance over time">
          <div className="h-[300px] w-full mt-4">
            <ErrorBoundary componentName="PnLTrendChart">
              <PnLTrendChart data={historyData} />
            </ErrorBoundary>
          </div>
        </Card>

        <Card title="Trade Distribution" subtitle="Success vs Failure">
           <ErrorBoundary componentName="TradeDistributionChart">
             <TradeDistributionChart analytics={analytics} />
           </ErrorBoundary>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i}>
            <Card className="flex flex-col items-center justify-center text-center p-8">
              <stat.icon className="w-8 h-8 text-brand-primary mb-4" />
              <p className="text-[10px] font-bold text-text-muted uppercase mb-1">{stat.label}</p>
              <h4 className="text-2xl font-bold text-white">{stat.value}</h4>
              <span className="text-[10px] text-brand-primary font-bold mt-2">{stat.trend}</span>
            </Card>
          </div>
        ))}
      </div>

      <Card title="Trade History" subtitle="Recently closed positions and performance">
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left text-[10px] border-collapse">
            <thead>
              <tr className="text-text-muted uppercase tracking-widest font-black border-b border-border-main">
                <th className="px-4 py-3">Token / Source</th>
                <th className="px-4 py-3">Exit Details</th>
                <th className="px-4 py-3">Closed At</th>
                <th className="px-4 py-3">Realized PnL</th>
                <th className="px-4 py-3 text-right">Verification</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {trades
                .filter(t => t && (t.status === TradeStatus.COMPLETED || t.status === TradeStatus.FAILED))
                .sort((a, b) => safeDate(b.exitedAt || b.timestamp).getTime() - safeDate(a.exitedAt || a.timestamp).getTime())
                .slice(0, 15)
                .map((trade) => {
                  const pnl = trade.pnl || 0;
                  const isProfit = pnl >= 0;
                  return (
                    <tr key={trade.id} className="border-b border-border-main/30 hover:bg-white/[0.02] transition-colors relative">
                      <td className="px-4 py-4">
                        <div className="flex flex-col">
                          <span className="text-white font-bold">{trade.tokenSymbol || 'UNKNOWN'}</span>
                          <span className="text-[8px] text-text-muted uppercase flex items-center gap-2">
                             {trade.botType?.toUpperCase() || 'MANUAL'}
                             {trade.isPaper && <span className="text-[6px] px-1 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded">PAPER</span>}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-1">
                           <span className={cn(
                             "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border w-fit",
                             trade.closeReason === 'Take Profit' ? "bg-brand-primary/10 text-brand-primary border-brand-primary/20" :
                             trade.closeReason === 'Stop Loss' ? "bg-brand-danger/10 text-brand-danger border-brand-danger/20" :
                             trade.closeReason === 'Early Exit – Low Market Activity' ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
                             "bg-white/5 text-white border-white/10"
                           )}>
                             {trade.closeReason || 'Manual Close'}
                           </span>
                           {trade.exitPrice && <span className="text-[7px] text-text-muted uppercase">EXIT: ${trade.exitPrice.toFixed(8)}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-text-muted">
                        {formatDistanceToNow(safeDate(trade.exitedAt || trade.timestamp))} ago
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col">
                          <span className={cn("font-black", isProfit ? "text-brand-primary" : "text-brand-danger")}>
                            {isProfit ? '+' : ''}{pnl.toFixed(4)} SOL
                          </span>
                          <span className={cn("text-[9px] font-bold", isProfit ? "text-brand-primary" : "text-brand-danger")}>
                            {trade.pnlPercent?.toFixed(2)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        {trade.txHash ? (
                          <a 
                            href={`https://solscan.io/tx/${trade.txHash}`} 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-text-muted hover:text-brand-primary transition-colors text-[8px] font-black uppercase tracking-widest underline underline-offset-4"
                          >
                            SOLSCAN
                          </a>
                        ) : (
                          <span className="text-text-muted/30 italic text-[8px] uppercase font-black">UNVERIFIED</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export const AnalyticsTab = () => {
  return (
    <ErrorBoundary componentName="AnalyticsTab">
      <AnalyticsContent />
    </ErrorBoundary>
  );
};

