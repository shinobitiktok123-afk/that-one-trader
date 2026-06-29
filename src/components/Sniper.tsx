import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, Activity, ShieldCheck, Settings, Play, 
  Square, Pause, RotateCcw, AlertTriangle, 
  BarChart3, Wallet, Clock, Target, 
  Layers, Search, Filter, Trash2, 
  ShieldAlert, TrendingUp, TrendingDown,
  Info, Cpu, Rocket, Gauge, ChevronRight
} from 'lucide-react';
import { useWallet } from '../lib/WalletContext';
import { createDefaultIndividualBotSettings } from '../lib/constants';
import { BotType, BotStatus, TradeStatus, IndividualBotSettings, WalletMode } from '../types';
import { cn } from '../lib/utils';

const StatCard = ({ label, value, subValue, icon: Icon, trend }: any) => (
  <div className="bg-bg-tertiary border border-border-main p-6 rounded-xl space-y-2">
    <div className="flex justify-between items-start">
      <div className="p-2 bg-bg-main rounded-lg">
        <Icon className="w-5 h-5 text-brand-primary" />
      </div>
      <span className="text-[8px] font-black text-text-muted uppercase tracking-[0.2em]">{label}</span>
    </div>
    <div>
      <div className="text-lg font-black text-white">{value}</div>
      <div className="flex items-center gap-2 mt-0.5">
        <span className="text-[9px] font-bold text-text-muted uppercase">{subValue}</span>
        {trend && (
          <span className={cn("text-[9px] font-black", trend > 0 ? "text-brand-primary" : "text-brand-danger")}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
    </div>
  </div>
);

const ConfigSection = ({ id, title, icon: Icon, expandedSections, toggleSection, children }: { id: string, title: string, icon: any, expandedSections: string[], toggleSection: (id: string) => void, children: React.ReactNode }) => {
  const isExpanded = expandedSections.includes(id);
  return (
    <div className="bg-bg-main/50 border border-border-main rounded-xl overflow-hidden">
      <button 
        onClick={() => toggleSection(id)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon className="w-4 h-4 text-brand-primary" />
          <span className="text-[10px] font-black text-white uppercase tracking-widest">{title}</span>
        </div>
        <ChevronRight className={cn("w-4 h-4 text-text-muted transition-transform", isExpanded ? "rotate-90" : "")} />
      </button>
      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-6 border-t border-border-main grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ToggleField = React.memo(({ label, value, onChange, disabled }: any) => (
  <div className="flex items-center justify-between">
    <label className="text-[9px] font-black text-text-muted uppercase">{label}</label>
    <button 
      onClick={() => onChange(!value)}
      disabled={disabled}
      className={cn("w-10 h-5 rounded-full relative transition-all disabled:opacity-50", value ? "bg-brand-primary" : "bg-bg-tertiary")}
    >
      <div className={cn("w-3 h-3 bg-white rounded-full absolute top-1 transition-all shadow-sm", value ? "right-1" : "left-1")} />
    </button>
  </div>
));

const SliderField = React.memo(({ label, value, min, max, onChange, suffix = "%", error, disabled }: any) => (
  <div className="space-y-1.5">
    <div className="flex justify-between items-center">
      <label className="text-[9px] font-black text-text-muted uppercase">{label}</label>
      <div className="flex items-center gap-2">
        {error && <span className="text-[8px] font-bold text-brand-danger">{error}</span>}
        <span className="text-[10px] font-black text-white">{value}{suffix}</span>
      </div>
    </div>
    <input 
      type="range" min={min} max={max} value={value}
      disabled={disabled}
      onChange={e => onChange(parseInt(e.target.value))}
      className="w-full accent-brand-primary disabled:opacity-50"
    />
  </div>
));

const InputField = React.memo(({ label, value, onChange, type = "number", step = "1", suffix, error, id, disabled }: any) => (
  <div className="space-y-1.5">
    <div className="flex justify-between items-center">
      <label className="text-[9px] font-black text-text-muted uppercase">{label}</label>
      {error && <span className="text-[8px] font-bold text-brand-danger animate-pulse">{error}</span>}
    </div>
    <div className="relative">
      <input 
        type={type} step={step} value={value}
        disabled={disabled}
        onChange={e => onChange(type === "number" ? (parseFloat(e.target.value) || 0) : e.target.value)}
        className={cn(
          "w-full bg-bg-card border rounded-lg p-3 text-xs font-black text-white outline-none transition-all disabled:opacity-50",
          error ? "border-brand-danger" : "border-border-main focus:border-brand-primary/50"
        )}
      />
      {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-text-muted">{suffix}</span>}
    </div>
  </div>
));

const BotControlPanel = React.memo(({ botType }: { botType: BotType }) => {
  const { user, toggleBot, emergencyStop, updateBotSettings, restoreBotSettings, trades, walletMode, activeWallet, switchWallet } = useWallet();
  const [activeSubTab, setActiveSubTab] = useState<'status' | 'settings' | 'trades'>('status');
  const [isSaving, setIsSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [localSettings, setLocalSettings] = useState<IndividualBotSettings | null>(null);
  const [expandedSections, setExpandedSections] = useState<string[]>(['trading']);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isInitializing, setIsInitializing] = useState(true);
  const isDirtyRef = useRef(false);
  const prevWalletId = useRef<string | null>(null);
  const prevBotType = useRef<BotType | null>(null);

  const wallets = user?.wallets || [];

  const botSettings = useMemo(() => {
    if (!activeWallet || !activeWallet.botSettings) return null;
    const settings = activeWallet.botSettings;
    if (botType === BotType.FRESH) return settings.freshBot;
    if (botType === BotType.HYPE) return settings.hypeBot;
    if (botType === BotType.AI) return settings.aiBot;
    return null;
  }, [activeWallet?.botSettings, botType]);

  // Sync local settings with bot settings
  useEffect(() => {
    if (!botSettings) return;
    
    // Do not overwrite if currently dirty (user is editing)
    if (isDirtyRef.current) return;

    // Only update if wallet or botType changed, or initial load
    if (prevWalletId.current === activeWallet?.id && prevBotType.current === botType && !isInitializing) return;

    setLocalSettings(JSON.parse(JSON.stringify(botSettings)));
    setIsInitializing(false);
    prevWalletId.current = activeWallet?.id || null;
    prevBotType.current = botType;
  }, [botSettings, activeWallet?.id, botType, isInitializing]);

  const botTrades = useMemo(() => {
    return trades.filter(t => t.botType === botType && t.walletId === activeWallet?.id);
  }, [trades, botType, activeWallet?.id]);

  const openTrades = botTrades.filter(t => t.status !== TradeStatus.COMPLETED && t.status !== TradeStatus.FAILED && t.status !== TradeStatus.CANCELLED);
  
  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const todayTrades = botTrades.filter(t => new Date(t.timestamp).toDateString() === today);
    const todaySells = todayTrades.filter(t => t.status === TradeStatus.COMPLETED);
    const winCount = todaySells.filter(t => (t.pnl || 0) > 0).length;
    const todayPnL = todaySells.reduce((sum, t) => sum + (t.pnl || 0), 0);
    
    return {
      openCount: openTrades.length,
      todayBuys: todayTrades.filter(t => t.type === 'buy').length,
      todaySells: todaySells.length,
      todayPnL,
      winRate: todaySells.length > 0 ? (winCount / todaySells.length) * 100 : 0,
      avgHoldTime: '14m 20s',
    };
  }, [botTrades, openTrades]);

  if (!user) {
    return <div className="text-center p-8 text-text-muted font-bold uppercase tracking-widest">Please log in to use the Sniper.</div>;
  }

  if (!activeWallet) {
    return <div className="text-center p-8 text-text-muted font-bold uppercase tracking-widest">Please create or import a wallet to start trading.</div>;
  }

  if (isInitializing || !localSettings) {
    return (
      <div className="space-y-6">
        <div className="bg-bg-card border border-border-main p-8 rounded-2xl">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-bg-main rounded-xl animate-pulse" />
            <div className="space-y-2">
              <div className="w-32 h-4 bg-bg-main rounded animate-pulse" />
              <div className="w-48 h-3 bg-bg-main rounded animate-pulse opacity-50" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1,2,3].map(i => (
              <div key={i} className="bg-bg-main/50 border border-border-main rounded-xl p-6 space-y-4">
                <div className="w-24 h-3 bg-bg-card rounded animate-pulse" />
                <div className="w-full h-10 bg-bg-card rounded-lg animate-pulse" />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          {[1,2,3].map(i => (
            <div key={i} className="bg-bg-card border border-border-main h-16 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
    );
  };

  const handleUpdateLocal = (update: Partial<IndividualBotSettings>) => {
    setLocalSettings(prev => prev ? { ...prev, ...update } : null);
    isDirtyRef.current = true;
    // Clear validation error for the fields being updated
    const newErrors = { ...validationErrors };
    Object.keys(update).forEach(key => delete newErrors[key]);
    setValidationErrors(newErrors);
  };

  const validateSettings = () => {
    const errors: Record<string, string> = {};
    if (localSettings.amountPerTrade <= 0) errors.amountPerTrade = "Must be > 0";
    if (localSettings.maxPositions <= 0) errors.maxPositions = "Must be > 0";
    if (localSettings.gasReserve < 0) errors.gasReserve = "Cannot be negative";
    if (localSettings.gasReserve >= activeWallet.balance && walletMode === WalletMode.REAL) {
      errors.gasReserve = "Insufficient balance";
    }
    if (localSettings.stopLoss < 0 || localSettings.stopLoss > 95) errors.stopLoss = "Range: 0-95%";
    if (localSettings.takeProfitLevels[0].percentage < 0 || localSettings.takeProfitLevels[0].percentage > 500) errors.takeProfitLevels = "Range: 0-500%";
    if (localSettings.trailingStop < 0 || localSettings.trailingStop > 25) errors.trailingStop = "Range: 0-25%";
    if (localSettings.maxSlippage < 1 || localSettings.maxSlippage > 100) errors.maxSlippage = "Range: 1-100%";
    if (localSettings.maxRugRisk < 0 || localSettings.maxRugRisk > 100) errors.maxRugRisk = "Range: 0-100%";
    if (localSettings.minLiquidity < 0) errors.minLiquidity = "Must be >= 0";
    if (localSettings.minMarketCap < 0) errors.minMarketCap = "Must be >= 0";
    if (localSettings.maxMarketCap < 0) errors.maxMarketCap = "Must be >= 0";
    if (localSettings.minMarketCap > localSettings.maxMarketCap) errors.minMarketCap = "Cannot exceed Max Market Cap";
    if (localSettings.minHolders < 0) errors.minHolders = "Must be >= 0";
    
    if (botType === BotType.FRESH) {
      if ((localSettings.earlyExitTimeout || 0) < 5) errors.earlyExitTimeout = "Min 5s";
      if ((localSettings.minVolumeThreshold || 0) < 0) errors.minVolumeThreshold = "Must be >= 0";
      if ((localSettings.minBuysThreshold || 0) < 0) errors.minBuysThreshold = "Must be >= 0";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    const isValid = validateSettings();
    if (!isValid) return;

    setIsSaving(true);
    try {
      await updateBotSettings(botType, localSettings, activeWallet.id);
      isDirtyRef.current = false;
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 3000);
    } catch (err) {
      console.error("Failed to save settings:", err);
      setValidationErrors({ general: "Failed to sync settings with cloud." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setLocalSettings(JSON.parse(JSON.stringify(botSettings)));
    setValidationErrors({});
    isDirtyRef.current = false;
  };

  const handleRestoreDefaults = async () => {
    if (confirm("Restore all settings for this bot to factory defaults?")) {
      setIsSaving(true);
      try {
        await restoreBotSettings(botType, activeWallet.id);
        setShowSaved(true);
        setTimeout(() => setShowSaved(false), 3000);
      } catch (err) {
        console.error("Failed to restore defaults:", err);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const tradableBal = Math.max(0, (walletMode === WalletMode.SIMULATION ? activeWallet.balance : (activeWallet.balance || 0)) - localSettings.gasReserve);
  const maxSlots = localSettings.maxPositions;
  const availSlots = Math.max(0, maxSlots - openTrades.length);

  const getStatusColor = (status: BotStatus) => {
    switch (status) {
      case BotStatus.RUNNING: return "text-brand-primary";
      case BotStatus.PAUSED: return "text-yellow-500";
      case BotStatus.STOPPED: return "text-brand-danger";
      default: return "text-text-muted";
    }
  };

  return (
    <div className="space-y-6">
      {/* Bot Header & Controls */}
      <div className="bg-bg-card border border-border-main p-6 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-6">
          <div className={cn(
            "p-5 rounded-2xl bg-bg-tertiary border border-border-main relative",
            botSettings?.status === BotStatus.RUNNING && "shadow-[0_0_20px_rgba(var(--brand-primary-rgb),0.2)]"
          )}>
            {botType === BotType.FRESH && <Zap className={cn("w-8 h-8", getStatusColor(botSettings?.status || BotStatus.STOPPED))} />}
            {botType === BotType.HYPE && <Rocket className={cn("w-8 h-8", getStatusColor(botSettings?.status || BotStatus.STOPPED))} />}
            {botType === BotType.AI && <Cpu className={cn("w-8 h-8", getStatusColor(botSettings?.status || BotStatus.STOPPED))} />}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-black text-white uppercase tracking-wider">{botType} SNIPER</h2>
              <span className={cn("text-[9px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded border", 
                botSettings?.status === BotStatus.RUNNING ? "bg-brand-primary/10 border-brand-primary/20 text-brand-primary" : "bg-bg-tertiary border-border-main text-text-muted"
              )}>
                {botSettings?.status || BotStatus.STOPPED}
              </span>
            </div>
            <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest mt-1">
              Active Wallet: {activeWallet.name} ({activeWallet.address.slice(0, 4)}...{activeWallet.address.slice(-4)})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {botSettings?.status === BotStatus.STOPPED ? (
            <button 
              onClick={() => toggleBot(botType, BotStatus.RUNNING, activeWallet.id)}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-3 bg-brand-primary text-black rounded-xl font-black text-[10px] uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all"
            >
              <Play className="w-4 h-4 fill-current" />
              Start Bot
            </button>
          ) : (
            <>
              <button 
                onClick={() => toggleBot(botType, botSettings?.status === BotStatus.PAUSED ? BotStatus.RUNNING : BotStatus.PAUSED, activeWallet.id)}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-bg-tertiary border border-border-main text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:border-brand-primary transition-all"
              >
                {botSettings?.status === BotStatus.PAUSED ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                {botSettings?.status === BotStatus.PAUSED ? 'Resume' : 'Pause'}
              </button>
              <button 
                onClick={() => toggleBot(botType, BotStatus.STOPPED, activeWallet.id)}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-bg-tertiary border border-border-main text-brand-danger rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-brand-danger/10 hover:border-brand-danger transition-all"
              >
                <Square className="w-4 h-4 fill-current" />
                Stop Bot
              </button>
            </>
          )}
          <button 
            onClick={() => emergencyStop(botType, activeWallet.id)}
            className="p-3 bg-brand-danger/10 border border-brand-danger/20 text-brand-danger rounded-xl hover:bg-brand-danger hover:text-white transition-all"
          >
            <AlertTriangle className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        <StatCard label="Position Slots" value={`${openTrades.length} / ${maxSlots}`} subValue={`${availSlots} Available`} icon={Layers} />
        <StatCard label="Today's PnL" value={`${stats.todayPnL >= 0 ? '+' : ''}${stats.todayPnL.toFixed(3)} SOL`} subValue="Daily Growth" icon={TrendingUp} />
        <StatCard label="Win Rate" value={`${stats.winRate.toFixed(1)}%`} subValue="Bot Performance" icon={Target} />
        <StatCard label="Tradable" value={`${tradableBal.toFixed(2)} SOL`} subValue={`Wallet: ${activeWallet.balance.toFixed(2)}`} icon={Wallet} />
      </div>

      <div className="bg-bg-card border border-border-main rounded-2xl overflow-hidden">
        <div className="flex border-b border-border-main">
          {(['status', 'settings', 'trades'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveSubTab(tab)}
              className={cn(
                "px-8 py-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all",
                activeSubTab === tab ? "border-brand-primary text-white" : "border-transparent text-text-muted hover:text-white"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeSubTab === 'status' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-bg-main border border-border-main rounded-xl">
                  <span className="text-[8px] font-black text-text-muted uppercase">Execution Speed</span>
                  <div className="text-sm font-black text-brand-primary">~120ms</div>
                </div>
                <div className="p-4 bg-bg-main border border-border-main rounded-xl">
                  <span className="text-[8px] font-black text-text-muted uppercase">Network Priority</span>
                  <div className="text-sm font-black text-white">{localSettings.priorityFee} SOL</div>
                </div>
              </div>
              <div className="bg-bg-main border border-border-main rounded-xl p-6 h-64 flex items-center justify-center text-text-muted uppercase font-bold text-[10px] tracking-widest">
                Real-time execution logs hidden in simulation mode
              </div>
            </div>
          )}

          {activeSubTab === 'settings' && (
            <div className="space-y-4">
              <div className="flex flex-col gap-4">
                {/* Trading Section */}
                <ConfigSection id="trading" title="Trading" icon={Activity} expandedSections={expandedSections} toggleSection={toggleSection}>
                  <div className="space-y-4">
                    <ToggleField 
                      label="Bot Engine Enabled" 
                      value={localSettings.enabled} 
                      onChange={(v: boolean) => handleUpdateLocal({ enabled: v })}
                      disabled={isSaving}
                    />
                    <ToggleField 
                      label="Allow Multiple Entries" 
                      value={!!localSettings.allowMultipleEntries} 
                      onChange={(v: boolean) => handleUpdateLocal({ allowMultipleEntries: v })}
                      disabled={isSaving}
                    />
                    <InputField 
                      label="Buy Amount" 
                      value={localSettings.amountPerTrade} 
                      onChange={(v: number) => handleUpdateLocal({ amountPerTrade: v })} 
                      step="0.01"
                      suffix="SOL"
                      error={validationErrors.amountPerTrade}
                      disabled={isSaving}
                    />
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-text-muted uppercase">Execution Wallet</label>
                      <select 
                        value={activeWallet.id}
                        onChange={e => switchWallet(e.target.value)}
                        className="w-full bg-bg-card border border-border-main rounded-lg p-3 text-xs font-black text-white outline-none focus:border-brand-primary/50 transition-all appearance-none"
                      >
                        {wallets.map(w => (
                          <option key={w.id} value={w.id}>{w.name} ({w.address.slice(0, 4)}...{w.address.slice(-4)})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <SliderField 
                      label="Concurrent Slots" 
                      value={localSettings.maxPositions} 
                      min={1} max={20} suffix=" SLOTS"
                      onChange={(v: number) => handleUpdateLocal({ maxPositions: v })}
                      disabled={isSaving}
                    />
                    <InputField 
                      label="Daily Cap (SOL)" 
                      value={localSettings.maxDailyInvestment} 
                      onChange={(v: number) => handleUpdateLocal({ maxDailyInvestment: v })} 
                      step="0.1"
                      disabled={isSaving}
                    />
                    <InputField 
                      label="Gas Reserve" 
                      value={localSettings.gasReserve} 
                      onChange={(v: number) => handleUpdateLocal({ gasReserve: v })} 
                      step="0.01"
                      suffix="SOL"
                      error={validationErrors.gasReserve}
                      disabled={isSaving}
                    />
                  </div>
                  <div className="space-y-4 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-x-12 pt-4 border-t border-white/5">
                    <InputField 
                        label="Slippage Allowance" 
                        value={localSettings.maxSlippage} 
                        onChange={(v: number) => handleUpdateLocal({ maxSlippage: v })} 
                        step="1"
                        suffix="%"
                        error={validationErrors.maxSlippage}
                        disabled={isSaving}
                     />
                     <InputField 
                        label="Priority Fee" 
                        value={localSettings.priorityFee} 
                        onChange={(v: number) => handleUpdateLocal({ priorityFee: v })} 
                        step="0.0001"
                        suffix="SOL"
                        disabled={isSaving}
                     />
                  </div>
                </ConfigSection>

                {/* Strategy Section */}
                <ConfigSection id="exit" title="Exit Strategy" icon={TrendingUp} expandedSections={expandedSections} toggleSection={toggleSection}>
                  <div className="space-y-4">
                    <ToggleField 
                      label="Enable Take Profit" 
                      value={localSettings.takeProfitLevels[0].percentage > 0} 
                      onChange={(v: boolean) => handleUpdateLocal({ takeProfitLevels: [{ percentage: v ? 20 : 0, sellAmount: 100 }] })}
                      disabled={isSaving}
                    />
                    <SliderField 
                      label="Primary Target (%)" 
                      value={localSettings.takeProfitLevels[0].percentage} 
                      min={1} max={500} 
                      onChange={(v: number) => handleUpdateLocal({ takeProfitLevels: [{ percentage: v, sellAmount: 100 }] })}
                      disabled={isSaving}
                    />
                    <ToggleField 
                      label="Multiple TP Levels" 
                      value={localSettings.takeProfitLevels.length > 1} 
                      onChange={() => {}}
                      disabled={isSaving}
                    />
                  </div>
                  <div className="space-y-4">
                    <ToggleField 
                      label="Enable Stop Loss" 
                      value={localSettings.stopLoss > 0} 
                      onChange={(v: boolean) => handleUpdateLocal({ stopLoss: v ? 15 : 0 })}
                      disabled={isSaving}
                    />
                    <SliderField 
                      label="Stop Loss (%)" 
                      value={localSettings.stopLoss} 
                      min={0} max={95} 
                      onChange={(v: number) => handleUpdateLocal({ stopLoss: v })} 
                      error={validationErrors.stopLoss}
                      disabled={isSaving}
                    />
                    <SliderField 
                      label="Trailing Stop (%)" 
                      value={localSettings.trailingStop || 0} 
                      min={0} max={25} 
                      onChange={(v: number) => handleUpdateLocal({ trailingStop: v })}
                      disabled={isSaving}
                    />
                  </div>
                </ConfigSection>

                {/* Filters Section */}
                <ConfigSection id="filters" title="Risk & Safety" icon={ShieldAlert} expandedSections={expandedSections} toggleSection={toggleSection}>
                  <div className="space-y-4">
                    <SliderField 
                      label="Max Rug Risk Score" 
                      value={localSettings.maxRugRisk} 
                      min={0} max={100} 
                      onChange={(v: number) => handleUpdateLocal({ maxRugRisk: v })}
                      disabled={isSaving}
                    />
                    <InputField 
                      label="Min Liquidity ($)" 
                      value={localSettings.minLiquidity} 
                      onChange={(v: number) => handleUpdateLocal({ minLiquidity: v })}
                      disabled={isSaving}
                    />
                  </div>
                  <div className="space-y-4">
                    <InputField 
                      label="Min Market Cap ($)" 
                      value={localSettings.minMarketCap} 
                      onChange={(v: number) => handleUpdateLocal({ minMarketCap: v })}
                      error={validationErrors.minMarketCap}
                      disabled={isSaving}
                    />
                    <InputField 
                      label="Max Market Cap ($)" 
                      value={localSettings.maxMarketCap} 
                      onChange={(v: number) => handleUpdateLocal({ maxMarketCap: v })}
                      error={validationErrors.maxMarketCap}
                      disabled={isSaving}
                    />
                    <InputField 
                      label="Min Holders" 
                      value={localSettings.minHolders} 
                      onChange={(v: number) => handleUpdateLocal({ minHolders: v })}
                      disabled={isSaving}
                    />
                  </div>
                </ConfigSection>

                {/* Bot Specific Section */}
                {botType === BotType.FRESH && (
                  <ConfigSection id="bot_specific" title="Fresh Activity Filters" icon={Zap} expandedSections={expandedSections} toggleSection={toggleSection}>
                    <div className="space-y-4">
                      <ToggleField label="Auto-Buy New Tokens" value={true} onChange={() => {}} disabled={isSaving} />
                      <ToggleField label="Honeypot Shield" value={true} onChange={() => {}} disabled={isSaving} />
                      <SliderField 
                        label="Early Exit Timer" 
                        value={localSettings.earlyExitTimeout || 25} 
                        min={5} max={120} suffix="s"
                        onChange={(v: number) => handleUpdateLocal({ earlyExitTimeout: v })}
                        disabled={isSaving}
                      />
                    </div>
                    <div className="space-y-4">
                      <InputField 
                        label="Min 5m Volume ($)" 
                        value={localSettings.minVolumeThreshold || 10} 
                        onChange={(v: number) => handleUpdateLocal({ minVolumeThreshold: v })}
                        disabled={isSaving}
                      />
                      <InputField 
                        label="Min 5m Buys" 
                        value={localSettings.minBuysThreshold || 5} 
                        onChange={(v: number) => handleUpdateLocal({ minBuysThreshold: v })}
                        disabled={isSaving}
                      />
                      <ToggleField label="Queue Enabled" value={localSettings.queueEnabled} onChange={(v: boolean) => handleUpdateLocal({ queueEnabled: v })} disabled={isSaving} />
                    </div>
                  </ConfigSection>
                )}

                {botType === BotType.HYPE && (
                  <ConfigSection id="bot_specific" title="Social Momentum" icon={Rocket} expandedSections={expandedSections} toggleSection={toggleSection}>
                    <div className="space-y-4">
                      <SliderField 
                        label="Min Hype Score" 
                        value={localSettings.minHypeScore || 70} 
                        min={0} max={100} 
                        onChange={(v: number) => handleUpdateLocal({ minHypeScore: v })}
                        disabled={isSaving}
                      />
                      <ToggleField label="Volume Spike Detection" value={true} onChange={() => {}} disabled={isSaving} />
                    </div>
                    <div className="space-y-4">
                      <InputField label="Min 1h Volume ($)" value={5000} onChange={() => {}} disabled={isSaving} />
                      <ToggleField label="Social Filter" value={true} onChange={() => {}} disabled={isSaving} />
                    </div>
                  </ConfigSection>
                )}

                {botType === BotType.AI && (
                  <ConfigSection id="bot_specific" title="Neural Configuration" icon={Cpu} expandedSections={expandedSections} toggleSection={toggleSection}>
                    <div className="space-y-4">
                      <SliderField 
                        label="Min Confidence" 
                        value={localSettings.minAIConfidence || 80} 
                        min={0} max={100} 
                        onChange={(v: number) => handleUpdateLocal({ minAIConfidence: v })}
                        disabled={isSaving}
                      />
                      <ToggleField label="Deep Scan Enabled" value={true} onChange={() => {}} disabled={isSaving} />
                    </div>
                    <div className="space-y-4">
                      <ToggleField label="Smart Exit Prediction" value={true} onChange={() => {}} disabled={isSaving} />
                      <ToggleField label="Whale Watcher" value={true} onChange={() => {}} disabled={isSaving} />
                    </div>
                  </ConfigSection>
                )}
              </div>

              {/* Action Bar */}
              <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-6 border-t border-border-main mt-8">
                <div className="flex gap-3 w-full md:w-auto">
                  <button 
                    onClick={handleRestoreDefaults}
                    disabled={isSaving}
                    className="flex-1 md:flex-none px-6 py-3 bg-bg-tertiary border border-border-main text-text-muted hover:text-white rounded-xl font-black text-[9px] uppercase tracking-widest transition-all disabled:opacity-50"
                  >
                    Restore Defaults
                  </button>
                  <button 
                    onClick={handleReset}
                    disabled={isSaving}
                    className="flex-1 md:flex-none px-6 py-3 bg-bg-tertiary border border-border-main text-text-muted hover:text-white rounded-xl font-black text-[9px] uppercase tracking-widest transition-all disabled:opacity-50"
                  >
                    Reset
                  </button>
                </div>

                <div className="flex items-center gap-6 w-full md:w-auto justify-end">
                  <AnimatePresence>
                    {(showSaved || validationErrors.general) && (
                      <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        className={cn("text-[9px] font-black uppercase tracking-widest", validationErrors.general ? "text-brand-danger" : "text-brand-primary")}
                      >
                        {validationErrors.general || "Configuration Synchronized"}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full md:w-auto px-12 py-3 bg-brand-primary text-black rounded-xl font-black text-[10px] uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-brand-primary/20"
                  >
                    {isSaving ? 'Syncing...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'trades' && (
            <div className="text-center py-12 text-text-muted uppercase font-bold text-[10px] tracking-widest">
              Trade history for this bot is empty
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export const SniperTab = React.memo(() => {
  const [activeBot, setActiveBot] = useState<BotType>(BotType.FRESH);

  const bots = [
    { id: BotType.FRESH, label: 'Fresh Sniper', icon: Zap, desc: 'Auto-buy new launches' },
    { id: BotType.HYPE, label: 'Hype Sniper', icon: Rocket, desc: 'Momentum spikes' },
    { id: BotType.AI, label: 'AI Sniper', icon: Cpu, desc: 'Neural confidence' }
  ];

  return (
    <div className="space-y-6">
      {/* Bot Selector */}
      <div className="flex bg-bg-card border border-border-main p-2 rounded-2xl gap-2">
        {bots.map(bot => (
          <button
            key={bot.id}
            onClick={() => setActiveBot(bot.id)}
            className={cn(
              "flex-1 flex flex-col items-center gap-2 p-4 rounded-xl transition-all relative overflow-hidden",
              activeBot === bot.id 
                ? "bg-bg-tertiary border border-border-main shadow-inner" 
                : "hover:bg-white/[0.02] border border-transparent"
            )}
          >
            <bot.icon className={cn("w-5 h-5", activeBot === bot.id ? "text-brand-primary" : "text-text-muted")} />
            <div className="text-center">
              <div className={cn("text-[10px] font-black uppercase tracking-widest", activeBot === bot.id ? "text-white" : "text-text-muted")}>
                {bot.label}
              </div>
              <div className="text-[8px] text-text-muted uppercase tracking-tighter mt-0.5">{bot.desc}</div>
            </div>
            {activeBot === bot.id && (
              <motion.div 
                layoutId="active-bot-pill"
                className="absolute bottom-0 left-0 right-0 h-1 bg-brand-primary"
              />
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeBot}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          <BotControlPanel botType={activeBot} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
});
