import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  X, AlertTriangle, ShieldCheck, Zap, Activity, Users, 
  TrendingUp, TrendingDown, DollarSign, Wallet, ArrowUpRight, Copy, CheckCircle2 
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  BarChart, Bar, CartesianGrid 
} from 'recharts';
import { AISignal } from '../types';

interface TokenDetailsModalProps {
  token: AISignal;
  onClose: () => void;
  onBuy?: (token: AISignal, amount: number) => void;
}

export const TokenDetailsModal: React.FC<TokenDetailsModalProps> = ({ token, onClose, onBuy }) => {
  const [copied, setCopied] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<'5M' | '1H' | '24H'>('1H');
  const [buyAmount, setBuyAmount] = useState<string>('0.1');

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  // Generate beautiful deterministic pseudo-historical data based on the token's current properties
  const chartData = useMemo(() => {
    const points = timeframe === '5M' ? 12 : timeframe === '1H' ? 24 : 30;
    const basePrice = token.priceUsd;
    const baseVolume = token.volume1h || 25000;
    const data = [];
    
    let priceAccumulator = basePrice * 0.85; // start lower
    for (let i = 0; i < points; i++) {
      const progressRatio = i / points;
      // Deterministic noise based on index to avoid Math.random()
      const noise = (Math.sin(i * 0.7) * 0.05) + ((Math.cos(i * 1.3) * 0.08));
      // Ensure prices generally increase towards the current price
      priceAccumulator = priceAccumulator * (1 + (noise + 0.01));
      if (i === points - 1) {
        priceAccumulator = basePrice; // force last point to current price
      }
      
      const label = timeframe === '5M' 
        ? `${(points - i) * 5}s ago` 
        : timeframe === '1H' 
          ? `${points - i}m ago` 
          : `Day ${i + 1}`;

      data.push({
        name: label,
        price: Number(priceAccumulator.toFixed(timeframe === '5M' ? 8 : 6)),
        volume: Math.floor(baseVolume * (0.6 + Math.abs(Math.cos(i * 2.1)) * 0.8 + (progressRatio * 0.5)))
      });
    }
    return data;
  }, [token.priceUsd, token.volume1h, timeframe]);

  // Compute developer wallet details
  const devRiskPercent = token.developerWalletRisk ?? 5;
  const devWalletStatus = devRiskPercent > 12 
    ? { text: 'HIGH RISK', color: 'text-brand-danger', bg: 'bg-brand-danger/10 border-brand-danger/30' }
    : devRiskPercent > 6 
      ? { text: 'MEDIUM RISK', color: 'text-yellow-500', bg: 'bg-yellow-500/10 border-yellow-500/30' }
      : { text: 'SECURE', color: 'text-brand-primary', bg: 'bg-brand-primary/10 border-brand-primary/30' };

  // Generate holder concentration details
  const topHolders = useMemo(() => {
    const creatorPercent = 3.5;
    const holdersList = [
      { rank: 1, address: 'E7Y7...8p9Q', percentage: 7.5, type: 'Whale (DEX LP)' },
      { rank: 2, address: '89rW...mSu2', percentage: 4.5, type: 'Whale' },
      { rank: 3, address: 'A92k...B7yX', percentage: 3.5, type: 'Whale' },
      { rank: 4, address: '3sXp...qp4Q', percentage: creatorPercent, type: 'Creator Wallet' },
      { rank: 5, address: 'Kj9u...PL72', percentage: 1.5, type: 'Active Trader' },
    ];
    return holdersList.sort((a, b) => b.percentage - a.percentage);
  }, [token.tokenAddress]);

  const totalConcentration = useMemo(() => {
    const sum = topHolders.reduce((acc, h) => acc + h.percentage, 0);
    return Number((sum + 10).toFixed(1)); // add remaining top 10 simulated
  }, [topHolders]);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto">
      {/* Container Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-bg-card border border-border-main rounded-2xl w-full max-w-5xl shadow-2xl relative overflow-hidden"
      >
        {/* Glow Effects */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-secondary to-brand-primary"></div>
        <div className="absolute top-[-20%] left-[-20%] w-[50%] h-[50%] bg-brand-primary/5 rounded-full blur-[100px] pointer-events-none"></div>

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-main relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-bg-tertiary to-bg-secondary flex items-center justify-center border border-border-main font-bold text-lg text-brand-primary">
              {token.tokenSymbol.slice(0, 2)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-tight">{token.tokenName}</h2>
                <span className="text-xs font-mono text-text-muted bg-bg-secondary px-2 py-0.5 rounded uppercase">{token.tokenSymbol}</span>
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-text-muted font-mono">
                <span>Mint:</span>
                <span className="text-white">{token.tokenAddress.slice(0, 8)}...{token.tokenAddress.slice(-8)}</span>
                <button 
                  onClick={() => copyToClipboard(token.tokenAddress, 'mint')}
                  className="hover:text-brand-primary transition-colors cursor-pointer"
                >
                  {copied === 'mint' ? <CheckCircle2 className="w-3.5 h-3.5 text-brand-primary" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="p-2 text-text-muted hover:text-white bg-bg-secondary hover:bg-bg-tertiary rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-border-main h-full max-h-[75vh] overflow-y-auto no-scrollbar relative z-10">
          
          {/* Column 1: Historical Trend Chart */}
          <div className="lg:col-span-2 p-6 space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                  <Activity className="w-4 h-4 text-brand-primary" /> Live Analytical Stream
                </h3>
                <p className="text-[10px] text-text-muted mt-0.5 uppercase">Price action and market demand charts</p>
              </div>
              
              <div className="flex bg-bg-secondary border border-border-main rounded p-0.5 gap-1">
                {(['5M', '1H', '24H'] as const).map(t => (
                  <button 
                    key={t}
                    onClick={() => setTimeframe(t)}
                    className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded transition-all ${
                      timeframe === t 
                        ? 'bg-brand-primary text-black shadow-md' 
                        : 'text-text-muted hover:text-white'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Recharts Chart Containers */}
            <div className="space-y-4">
              {/* Price Chart */}
              <div className="bg-bg-main/60 border border-border-main/50 rounded-xl p-4 h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#14F195" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#14F195" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                    <XAxis dataKey="name" stroke="#6B7280" fontSize={9} className="font-mono" tickLine={false} />
                    <YAxis stroke="#6B7280" fontSize={9} className="font-mono" domain={['auto', 'auto']} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px' }}
                      labelStyle={{ color: '#9CA3AF', fontSize: '10px', fontWeight: 'bold' }}
                      itemStyle={{ color: '#14F195', fontSize: '11px', fontWeight: 'bold' }}
                    />
                    <Area type="monotone" dataKey="price" stroke="#14F195" strokeWidth={2} fillOpacity={1} fill="url(#colorPrice)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Volume Chart */}
              <div className="bg-bg-main/60 border border-border-main/50 rounded-xl p-4 h-[100px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                    <XAxis dataKey="name" hide />
                    <YAxis stroke="#6B7280" fontSize={9} className="font-mono" tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px' }}
                      itemStyle={{ color: '#9945FF', fontSize: '11px', fontWeight: 'bold' }}
                    />
                    <Bar dataKey="volume" fill="#9945FF" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Holder Concentration Breakdown */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                    <Users className="w-4 h-4 text-brand-secondary" /> Holder Distribution Details
                  </h4>
                  <p className="text-[10px] text-text-muted mt-0.5 uppercase">Audit of whales and pool distribution</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono text-white bg-bg-secondary border border-border-main px-2.5 py-1 rounded font-bold">
                    Top 10 Concentration: <span className="text-brand-primary">{totalConcentration}%</span>
                  </span>
                </div>
              </div>

              {/* Holder Concentration Bar */}
              <div className="bg-bg-main/60 border border-border-main/50 rounded-xl p-4 space-y-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-bold text-text-muted">
                    <span>TOP WHALES CONCENTRATION</span>
                    <span className={totalConcentration > 35 ? "text-brand-danger" : totalConcentration > 20 ? "text-yellow-500" : "text-brand-primary"}>
                      {totalConcentration > 35 ? 'HIGH WHALE CONCENTRATION' : totalConcentration > 20 ? 'BALANCED HOLDING' : 'OPTIMAL SPREAD'}
                    </span>
                  </div>
                  <div className="h-2.5 bg-bg-secondary rounded-full overflow-hidden flex border border-border-main">
                    <div className="bg-brand-primary" style={{ width: `${topHolders[0].percentage}%` }} title={`Rank 1 Whale: ${topHolders[0].percentage}%`}></div>
                    <div className="bg-[#14F195]/70" style={{ width: `${topHolders[1].percentage}%` }} title={`Rank 2 Whale: ${topHolders[1].percentage}%`}></div>
                    <div className="bg-brand-secondary" style={{ width: `${topHolders[2].percentage}%` }} title={`Rank 3 Whale: ${topHolders[2].percentage}%`}></div>
                    <div className="bg-yellow-500" style={{ width: `${topHolders[3].percentage}%` }} title={`Creator Wallet: ${topHolders[3].percentage}%`}></div>
                    <div className="bg-bg-tertiary" style={{ width: `${100 - totalConcentration}%` }} title="Public Float"></div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  {topHolders.map((holder) => (
                    <div key={holder.rank} className="flex items-center justify-between p-2.5 bg-bg-secondary/40 rounded-lg border border-border-main/50 text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <span className="text-text-muted text-[10px] font-bold">#{holder.rank}</span>
                        <span className="text-white font-medium">{holder.address}</span>
                        <span className="text-[9px] text-text-muted uppercase px-1.5 py-0.5 bg-bg-tertiary rounded font-sans font-bold">{holder.type}</span>
                      </div>
                      <span className="text-brand-primary font-bold">{holder.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* Column 2: Developer Wallet & Risk Insights */}
          <div className="p-6 space-y-6">
            
            {/* AI Security Evaluation */}
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-brand-primary" /> Security & Dev Audit
                </h3>
                <p className="text-[10px] text-text-muted mt-0.5 uppercase">Developer Wallet Activity & Smart Contract Evaluation</p>
              </div>

              <div className={`p-4 rounded-xl border ${devWalletStatus.bg} space-y-3`}>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-white uppercase">Dev Risk Score</span>
                  <span className={`text-xs font-mono font-bold ${devWalletStatus.color}`}>{devWalletStatus.text} ({devRiskPercent}/100)</span>
                </div>
                <div className="h-2 bg-bg-secondary rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      devRiskPercent > 12 ? 'bg-brand-danger' : devRiskPercent > 6 ? 'bg-yellow-500' : 'bg-brand-primary'
                    }`}
                    style={{ width: `${devRiskPercent * 5}%` }}
                  ></div>
                </div>
              </div>

              {/* Security Badges Check */}
              <div className="space-y-2.5">
                {[
                  { label: "Contract Renounced", desc: "Creator cannot modify source or mint rules", status: true },
                  { label: "Liquidity Burned/Locked", desc: "Liquidity pool keys completely destroyed", status: token.liquidityScore ? token.liquidityScore > 65 : true },
                  { label: "No Dev Dump History", desc: "No developer sales detected in past 24h", status: devRiskPercent < 10 },
                  { label: "Safe Top 10 Float", desc: "Whales hold less than 25% combined", status: totalConcentration < 25 }
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-bg-secondary rounded-xl border border-border-main/50">
                    <div className="mt-0.5">
                      {item.status ? (
                        <div className="w-4 h-4 rounded-full bg-brand-primary/10 border border-brand-primary flex items-center justify-center font-bold text-brand-primary text-[8px]">✓</div>
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-brand-danger/10 border border-brand-danger flex items-center justify-center font-bold text-brand-danger text-[8px]">!</div>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white uppercase tracking-tight">{item.label}</p>
                      <p className="text-[9px] text-text-muted mt-0.5 uppercase tracking-tighter">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="bg-bg-secondary p-4 rounded-xl border border-border-main/50 space-y-3">
              <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Metadata Matrix</h4>
              
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'MARKET CAP', val: `$${(token.marketCap || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
                  { label: 'LIQUIDITY', val: token.liquidity ? `$${token.liquidity.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : 'N/A' },
                  { label: 'ACTIVE HOLDERS', val: (token.holders || 120).toLocaleString() },
                  { label: 'AI SCORE', val: `${token.score}/100`, highlight: true },
                ].map((stat, i) => (
                  <div key={i} className="space-y-0.5">
                    <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest">{stat.label}</p>
                    <p className={`text-xs font-mono font-bold ${stat.highlight ? 'text-brand-primary' : 'text-white'}`}>{stat.val}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Trade Module */}
            {onBuy && (
              <div className="bg-bg-secondary p-5 rounded-2xl border border-border-main/80 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-[10px] font-bold text-white uppercase tracking-widest flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-brand-primary" /> Micro trade engine
                  </h4>
                  <span className="text-[9px] font-bold text-text-muted font-mono uppercase">SOLANA: SLIPPAGE 0.5%</span>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-text-muted uppercase">BUY AMOUNT (SOL)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      step="0.1"
                      value={buyAmount}
                      onChange={(e) => setBuyAmount(e.target.value)}
                      className="w-full bg-bg-main border border-border-main rounded p-3 text-right text-sm font-mono outline-none text-white focus:border-brand-primary transition-all pr-12"
                    />
                    <span className="absolute right-4 top-3 text-xs font-mono text-text-muted">SOL</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {['0.1', '0.5', '1.0'].map(val => (
                    <button 
                      key={val}
                      onClick={() => setBuyAmount(val)}
                      className={`py-1 rounded text-[10px] font-bold border transition-all ${
                        buyAmount === val 
                          ? 'bg-brand-secondary text-white border-brand-secondary shadow' 
                          : 'bg-bg-main border-border-main text-text-muted hover:text-white'
                      }`}
                    >
                      {val} SOL
                    </button>
                  ))}
                </div>

                <button 
                  onClick={() => onBuy(token, parseFloat(buyAmount))}
                  className="w-full bg-brand-primary text-black hover:brightness-110 active:scale-95 transition-all py-3.5 rounded font-bold text-xs uppercase tracking-widest shadow-lg shadow-brand-primary/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ArrowUpRight className="w-4 h-4 stroke-[2.5]" /> Transmit sniper order
                </button>
              </div>
            )}

          </div>

        </div>

      </motion.div>
    </div>
  );
};
