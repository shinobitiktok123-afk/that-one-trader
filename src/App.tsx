import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Layout } from "./components/layout/Layout";
import {
  LayoutDashboard,
  Wallet,
  TrendingUp,
  Target,
  PieChart,
  LogOut,
  ShieldCheck,
  Zap,
  ChevronRight,
  Search,
  AlertTriangle,
  Copy,
  CheckCircle2,
  History,
  Settings,
  Users,
  DollarSign,
  Activity,
  Bell,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  ChevronDown,
  Plus,
  Menu,
  X,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Cell,
  BarChart,
  Bar,
  PieChart as RePieChart,
  Pie,
} from "recharts";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { AnalyticsTab } from "./components/Analytics";
import { WalletManager } from "./components/WalletManager";
import { SniperTab } from "./components/Sniper";
import { AdminDashboard } from "./components/AdminDashboard";
import { ExecutionLogPanel } from "./components/ExecutionLogPanel";
import { LiveTrades } from "./components/LiveTrades";
import { TradeDrawer } from "./components/TradeDrawer";
import { MobileNavDrawer } from "./components/common/MobileNav";
import {
  UserRole,
  UserProfile,
  AISignal,
  Trade,
  BotSettings,
  WalletMode,
  BotType,
  BotStatus,
  TradeStatus,
} from "./types";
import { WebSocketProvider, useWebSocketSignals } from "./lib/WebSocketContext";
import { TokenDetailsModal } from "./components/TokenDetailsModal";
import { WalletProvider, useWallet } from "./lib/WalletContext";
import { createWallet, importWalletFromKey } from "./lib/solana";
import { cn } from "./lib/utils";

// --- Mock Data & Constants ---

const SENTIMENT_DATA = [
  { name: "Mon", sentiment: 45, volume: 1200 },
  { name: "Tue", sentiment: 52, volume: 1500 },
  { name: "Wed", sentiment: 48, volume: 1100 },
  { name: "Thu", sentiment: 65, volume: 1800 },
  { name: "Fri", sentiment: 72, volume: 2200 },
  { name: "Sat", sentiment: 68, volume: 1900 },
  { name: "Sun", sentiment: 75, volume: 2500 },
];

// --- Shared Components ---

const Button = ({
  children,
  className,
  variant = "primary",
  size = "md",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?:
    "primary" | "secondary" | "ghost" | "outline" | "danger" | "vibrant";
  size?: "sm" | "md" | "lg";
}) => {
  const variants = {
    primary:
      "bg-brand-primary text-black hover:brightness-110 shadow-lg shadow-brand-primary/20",
    vibrant:
      "bg-gradient-to-r from-brand-secondary to-brand-primary text-white hover:brightness-110 shadow-lg shadow-brand-secondary/20",
    secondary: "bg-brand-secondary text-white hover:brightness-110",
    outline:
      "border border-border-main text-text-muted hover:text-white hover:bg-bg-tertiary",
    ghost: "text-text-muted hover:text-white hover:bg-bg-tertiary",
    danger: "bg-brand-danger text-white hover:brightness-110",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-[10px]",
    md: "px-4 py-2 text-xs",
    lg: "px-6 py-3 text-sm",
  };

  return (
    <button
      className={cn(
        "rounded font-bold transition-all active:scale-95 flex items-center justify-center gap-2 uppercase tracking-widest",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
};

const Card = ({
  children,
  className,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
}) => (
  <div
    className={cn(
      "bg-bg-card border border-border-main rounded-xl p-4 sm:p-5 relative overflow-hidden group hover:border-brand-primary/30 transition-all duration-300",
      className,
    )}
  >
    {(title || subtitle) && (
      <div className="mb-4">
        {title && (
          <h3 className="text-xs font-bold text-white uppercase tracking-widest">
            {title}
          </h3>
        )}
        {subtitle && (
          <p className="text-[10px] text-text-muted mt-1 uppercase tracking-tighter">
            {subtitle}
          </p>
        )}
      </div>
    )}
    {children}
  </div>
);

const Badge = ({
  children,
  variant = "primary",
  className,
}: {
  children: React.ReactNode;
  variant?: "primary" | "danger" | "warning" | "outline";
  className?: string;
}) => {
  const styles = {
    primary: "bg-brand-primary/10 text-brand-primary border-brand-primary/30",
    danger: "bg-brand-danger/10 text-brand-danger border-brand-danger/30",
    warning: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30",
    outline: "bg-transparent border-border-main text-text-muted",
  };
  return (
    <span
      className={cn(
        "px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-tighter",
        styles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
};

const CountdownTimer = React.memo(({ trade }: { trade: any }) => {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (trade.status !== "monitoring") return;
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 200);
    return () => clearInterval(interval);
  }, [trade.status]);

  if (trade.status !== "monitoring") {
    return <span className="text-text-muted text-[10px]">—</span>;
  }

  const lastActiveTime = trade.lastActivityCheck || trade.monitoringStartedAt || trade.timestamp;
  if (!lastActiveTime) {
    return <span className="text-text-muted text-[10px]">No activity</span>;
  }

  const elapsedMs = Date.now() - new Date(lastActiveTime).getTime();
  const remainingSecs = Math.max(0, (25000 - elapsedMs) / 1000);

  let colorClass = "text-brand-primary";
  let bgClass = "bg-brand-primary/10 border-brand-primary/20";
  if (remainingSecs <= 5) {
    colorClass = "text-brand-danger animate-pulse font-black";
    bgClass = "bg-brand-danger/20 border-brand-danger/30 animate-pulse";
  } else if (remainingSecs <= 12) {
    colorClass = "text-yellow-500 font-bold";
    bgClass = "bg-yellow-500/10 border-yellow-500/20";
  }

  return (
    <div className="flex items-center">
      <div className={cn("px-2 py-0.5 rounded text-[9px] border font-mono flex items-center gap-1", bgClass)}>
        <span className={cn("w-1.5 h-1.5 rounded-full", remainingSecs <= 5 ? "bg-brand-danger animate-ping" : remainingSecs <= 12 ? "bg-yellow-500 animate-pulse" : "bg-brand-primary animate-pulse")} />
        <span className={colorClass}>{remainingSecs.toFixed(1)}s</span>
      </div>
    </div>
  );
});

CountdownTimer.displayName = "CountdownTimer";

const MiniPnLChart = React.memo(({ data }: { data: any[] }) => {
  const pnlValues = data.map((d) => d.pnl);
  const minVal = Math.min(...pnlValues, 0);
  const maxVal = Math.max(...pnlValues, 0.01);
  const padding = (maxVal - minVal) * 0.1 || 0.01;

  return (
    <div className="bg-[#080808] border border-border-main/50 rounded-xl p-4 flex flex-col justify-between h-full">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h4 className="text-[10px] font-black text-text-muted uppercase tracking-wider">
            24H PNL HISTORY (SOL)
          </h4>
          <p className="text-[16px] font-black text-white font-mono mt-0.5">
            {data[data.length - 1]?.pnl >= 0 ? "+" : ""}
            {data[data.length - 1]?.pnl.toFixed(4)} SOL
          </p>
        </div>
        <div className="text-right">
          <span className="text-[8px] font-black text-text-muted uppercase tracking-widest bg-bg-tertiary px-1.5 py-0.5 rounded border border-border-main/50">
            Real-time Tracker
          </span>
        </div>
      </div>
      <div className="h-[100px] w-full mt-2 relative">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
            <defs>
              <linearGradient id="colorMiniPnL" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#14F195" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#14F195" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="time" hide />
            <YAxis domain={[minVal - padding, maxVal + padding]} hide />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0c0c0c",
                border: "1px solid #2B2F36",
                fontSize: "9px",
                borderRadius: "6px",
                padding: "4px 8px",
              }}
              itemStyle={{ color: "#14F195", fontWeight: "bold" }}
              labelStyle={{ color: "#848E9C" }}
              formatter={(value: any) => [`${parseFloat(value).toFixed(4)} SOL`, "PnL"]}
            />
            <Area
              type="monotone"
              dataKey="pnl"
              stroke="#14F195"
              strokeWidth={1.5}
              fillOpacity={1}
              fill="url(#colorMiniPnL)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

MiniPnLChart.displayName = "MiniPnLChart";

const TerminalTab = ({
  subTab,
  setSubTab,
  onBuy,
  onSell,
  signals = [],
}: {
  subTab: "newly_launched" | "nearly_migrated" | "migrated";
  setSubTab: (t: "newly_launched" | "nearly_migrated" | "migrated") => void;
  onBuy: (s: AISignal) => void;
  onSell?: (s: AISignal) => void;
  signals?: AISignal[];
}) => {
  const [tokens, setTokens] = useState<AISignal[]>([]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [launchpad, setLaunchpad] = useState("");
  const [minMcap, setMinMcap] = useState<number | "">("");
  const [maxMcap, setMaxMcap] = useState<number | "">("");
  const [minLiquidity, setMinLiquidity] = useState<number | "">("");
  const [minAiScore, setMinAiScore] = useState<number | "">("");
  const [maxRugRisk, setMaxRugRisk] = useState<number | "">("");
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Live automatic-refresh polling from server-side Solana Tracker Service
  useEffect(() => {
    // If we have signals from parent, we can prioritize them for the specific subtabs
    if (signals.length > 0) {
      setIsLoading(false);
      return;
    }

    let active = true;
    const fetchTokens = async () => {
      try {
        const params = new URLSearchParams();
        if (search) params.append("search", search);
        if (sortBy) params.append("sortBy", sortBy);
        if (launchpad) params.append("launchpad", launchpad);
        if (minMcap !== "") params.append("minMcap", String(minMcap));
        if (maxMcap !== "") params.append("maxMcap", String(maxMcap));
        if (minLiquidity !== "")
          params.append("minLiquidity", String(minLiquidity));
        if (minAiScore !== "") params.append("minAiScore", String(minAiScore));
        if (maxRugRisk !== "") params.append("maxRugRisk", String(maxRugRisk));

        const res = await fetch(`/api/tokens?${params.toString()}`);
        if (res.ok && active) {
          const data = await res.json();
          setTokens(data);
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Error fetching live tokens in Terminal:", err);
      }
    };

    fetchTokens();
    const interval = setInterval(fetchTokens, 3000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [
    search,
    sortBy,
    launchpad,
    minMcap,
    maxMcap,
    minLiquidity,
    minAiScore,
    maxRugRisk,
  ]);

  // Client-side filtering for immediate sub-tab transition responsiveness
  const filteredTokens = useMemo(() => {
    const source = signals.length > 0 ? signals : tokens;
    if (subTab === "newly_launched") {
      return source.filter(
        (t) => !t.migrated && (t.bondingCurveProgress || 0) < 80,
      );
    }
    if (subTab === "nearly_migrated") {
      return source.filter(
        (t) => !t.migrated && (t.bondingCurveProgress || 0) >= 80,
      );
    }
    if (subTab === "migrated") {
      return source.filter((t) => t.migrated);
    }
    return source;
  }, [tokens, signals, subTab]);

  const handleQuickFilter = (type: string) => {
    // Toggle/Reset values to filter live stream
    if (type === "min_5k") {
      setMinMcap(minMcap === 5000 ? "" : 5000);
    } else if (type === "max_100k") {
      setMaxMcap(maxMcap === 100000 ? "" : 100000);
    } else if (type === "high_score") {
      setMinAiScore(minAiScore === 80 ? "" : 80);
    } else if (type === "low_risk") {
      setMaxRugRisk(maxRugRisk === 15 ? "" : 15);
    } else if (type === "high_liq") {
      setMinLiquidity(minLiquidity === 20000 ? "" : 20000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Tabs Header */}
      <div className="flex flex-col lg:flex-row justify-between items-center bg-bg-card p-4 rounded-xl border border-border-main gap-4 shadow-xl">
        <div className="flex gap-2 w-full lg:w-auto overflow-x-auto no-scrollbar">
          {[
            { id: "newly_launched", label: "Newly Launched", icon: Zap },
            { id: "nearly_migrated", label: "Nearly Migrated", icon: Target },
            { id: "migrated", label: "Migrated", icon: Activity },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id as any)}
              className={cn(
                "flex items-center gap-2 px-6 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                subTab === t.id
                  ? "bg-brand-primary text-black shadow-lg shadow-brand-primary/20"
                  : "text-text-muted hover:text-white hover:bg-bg-tertiary",
              )}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 w-full lg:w-auto">
          <div className="flex-1 lg:w-72 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Symbol, Name or Contract Address..."
              className="w-full bg-bg-main border border-border-main rounded-lg py-2.5 pl-9 pr-4 text-[10px] text-white focus:border-brand-primary outline-none transition-all font-bold placeholder-text-muted/60"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={showFilters ? "vibrant" : "outline"}
              className="h-10 px-4 gap-2 border-border-main hover:border-brand-primary/30"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-3.5 h-3.5" />
              <span className="text-[9px] font-bold uppercase">Filters</span>
            </Button>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-10 px-4 bg-bg-main border border-border-main rounded-lg text-[9px] font-bold uppercase text-white outline-none focus:border-brand-primary cursor-pointer appearance-none pr-8 hover:border-brand-primary/30"
              >
                <option value="newest">Newest Launch</option>
                <option value="oldest">Oldest Launch</option>
                <option value="ai_score">Highest AI Score</option>
                <option value="rug_risk">Lowest Rug Risk</option>
                <option value="volume">Highest Volume</option>
                <option value="liquidity">Highest Liquidity</option>
                <option value="momentum">Highest Momentum</option>
                <option value="holders">Holder Count</option>
                <option value="bonding_curve">Bonding Progress</option>
                <option value="market_cap">Market Cap</option>
              </select>
              <ChevronDown className="w-3 h-3 absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Collapsible Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-bg-card border border-border-main rounded-xl p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 shadow-xl">
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-text-muted uppercase tracking-wider">
                  Market Cap Range ($)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={minMcap}
                    onChange={(e) =>
                      setMinMcap(
                        e.target.value === "" ? "" : parseFloat(e.target.value),
                      )
                    }
                    className="bg-bg-main border border-border-main rounded p-2 text-[10px] text-white font-mono outline-none focus:border-brand-primary"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={maxMcap}
                    onChange={(e) =>
                      setMaxMcap(
                        e.target.value === "" ? "" : parseFloat(e.target.value),
                      )
                    }
                    className="bg-bg-main border border-border-main rounded p-2 text-[10px] text-white font-mono outline-none focus:border-brand-primary"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-text-muted uppercase tracking-wider">
                  Min Liquidity ($)
                </label>
                <input
                  type="number"
                  placeholder="Min USD"
                  value={minLiquidity}
                  onChange={(e) =>
                    setMinLiquidity(
                      e.target.value === "" ? "" : parseFloat(e.target.value),
                    )
                  }
                  className="w-full bg-bg-main border border-border-main rounded p-2 text-[10px] text-white font-mono outline-none focus:border-brand-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-text-muted uppercase tracking-wider">
                  Launchpad Provider
                </label>
                <select
                  value={launchpad}
                  onChange={(e) => setLaunchpad(e.target.value)}
                  className="w-full h-9 bg-bg-main border border-border-main rounded p-2 text-[10px] text-white font-mono outline-none focus:border-brand-primary"
                >
                  <option value="">All Launchpads</option>
                  <option value="pump">Pump.fun</option>
                  <option value="axiom">Axiom</option>
                  <option value="moonshot">Moonshot</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-text-muted uppercase tracking-wider">
                  Security & AI Risk Limits
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    placeholder="Min AI"
                    value={minAiScore}
                    onChange={(e) =>
                      setMinAiScore(
                        e.target.value === "" ? "" : parseFloat(e.target.value),
                      )
                    }
                    className="bg-bg-main border border-border-main rounded p-2 text-[10px] text-white font-mono outline-none focus:border-brand-primary"
                  />
                  <input
                    type="number"
                    placeholder="Max Rug"
                    value={maxRugRisk}
                    onChange={(e) =>
                      setMaxRugRisk(
                        e.target.value === "" ? "" : parseFloat(e.target.value),
                      )
                    }
                    className="bg-bg-main border border-border-main rounded p-2 text-[10px] text-white font-mono outline-none focus:border-brand-primary"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Filters Row */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-[8px] font-bold uppercase tracking-widest text-text-muted mr-1">
          Quick Selectors:
        </span>
        {[
          { key: "min_5k", label: "Min MCAP $5k", active: minMcap === 5000 },
          {
            key: "max_100k",
            label: "Max MCAP $100k",
            active: maxMcap === 100000,
          },
          {
            key: "high_score",
            label: "AI Score > 80",
            active: minAiScore === 80,
          },
          {
            key: "low_risk",
            label: "Rug Risk < 15%",
            active: maxRugRisk === 15,
          },
          {
            key: "high_liq",
            label: "Liquidity > $20k",
            active: minLiquidity === 20000,
          },
        ].map((filter) => (
          <button
            key={filter.key}
            onClick={() => handleQuickFilter(filter.key)}
            className={cn(
              "px-3.5 py-1.5 border rounded-full text-[9px] font-bold transition-all cursor-pointer",
              filter.active
                ? "bg-brand-primary/20 border-brand-primary text-brand-primary"
                : "bg-bg-tertiary/40 border-border-main text-text-muted hover:text-white hover:border-brand-primary/30",
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Token List */}
      {isLoading ? (
        <div className="py-24 text-center">
          <div className="w-8 h-8 rounded-full border-2 border-brand-primary border-t-transparent animate-spin mx-auto mb-4"></div>
          <p className="text-text-muted text-[10px] uppercase font-bold tracking-widest">
            Synchronizing live launchpad streams...
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredTokens.map((s) => (
              <TerminalTokenCard
                key={s.tokenAddress}
                signal={s}
                subTab={subTab}
                onBuy={() => onBuy(s)}
                onSell={onSell ? () => onSell(s) : undefined}
              />
            ))}
          </AnimatePresence>
          {filteredTokens.length === 0 && (
            <div className="col-span-full py-24 text-center bg-bg-card/20 border border-border-main border-dashed rounded-xl">
              <p className="text-text-muted text-xs uppercase tracking-widest font-bold">
                No active memecoins match the active sectors or filter queries
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const TerminalTokenCard = ({
  signal,
  subTab,
  onBuy,
  onSell,
}: {
  signal: AISignal;
  subTab: "newly_launched" | "nearly_migrated" | "migrated";
  onBuy: () => void;
  onSell?: () => void;
  key?: any;
}) => {
  const { setSelectedToken } = useWebSocketSignals();
  const [copied, setCopied] = useState(false);
  const [prevPrice, setPrevPrice] = useState(signal.priceUsd);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);

  // Animate price updates instantly based on live API streams
  useEffect(() => {
    if (signal.priceUsd !== prevPrice) {
      setFlash(signal.priceUsd > prevPrice ? "up" : "down");
      setPrevPrice(signal.priceUsd);
      const timer = setTimeout(() => setFlash(null), 1000);
      return () => clearTimeout(timer);
    }
  }, [signal.priceUsd, prevPrice]);

  const handleCopy = () => {
    navigator.clipboard.writeText(signal.tokenAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getEstMigrationTime = (progress?: number) => {
    if (!progress) return "N/A";
    const remaining = 100 - progress;
    if (remaining <= 0) return "Migrated";
    if (remaining < 5) return "~1m";
    if (remaining < 15) return "~3m";
    return `~${Math.floor(remaining * 0.4)}m`;
  };

  const formatAge = (timestampStr: string) => {
    const diffMs = Date.now() - new Date(timestampStr).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just Now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  const scores = [
    {
      label: "Momentum",
      value: signal.momentumScore ?? 50,
      color: "text-brand-primary",
    },
    {
      label: "Rug Risk",
      value: signal.rugRiskScore ?? 15,
      color: "text-brand-danger",
    },
    {
      label: "Whales",
      value: signal.whaleActivityScore ?? 45,
      color: "text-brand-secondary",
    },
    {
      label: "Social",
      value: signal.socialMomentumScore ?? 60,
      color: "text-white",
    },
  ];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      onClick={(e) => {
        if (
          (e.target as HTMLElement).closest("button") ||
          (e.target as HTMLElement).closest("a") ||
          (e.target as HTMLElement).closest("svg")
        ) {
          return;
        }
        setSelectedToken(signal);
      }}
      className="bg-bg-card/45 backdrop-blur-xl border border-border-main rounded-xl p-4.5 group hover:border-brand-primary/40 transition-all flex flex-col h-full relative overflow-hidden shadow-lg hover:shadow-brand-primary/5 cursor-pointer"
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-primary/25 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

      {/* Top Details Row */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-bg-tertiary flex items-center justify-center font-black text-brand-primary border border-white/5 relative shadow-inner">
            {(signal.tokenSymbol?.[0] || "M").toUpperCase()}
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-bg-main rounded-full border border-border-main flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-brand-primary animate-pulse"></div>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-bold text-white leading-none mb-1 flex items-center gap-1.5">
              {signal.tokenSymbol}
              {subTab === "newly_launched" && (
                <Badge
                  variant="outline"
                  className="text-[7px] py-0.5 px-1 border-brand-primary/30 text-brand-primary bg-brand-primary/5 font-mono"
                >
                  NEW
                </Badge>
              )}
            </h4>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-text-muted font-mono">
                {signal.tokenAddress.slice(0, 4)}...
                {signal.tokenAddress.slice(-4)}
              </span>
              <button
                onClick={handleCopy}
                className="text-text-muted hover:text-white transition-colors"
              >
                {copied ? (
                  <CheckCircle2 className="w-2.5 h-2.5 text-brand-primary" />
                ) : (
                  <Copy className="w-2.5 h-2.5" />
                )}
              </button>
            </div>
          </div>
        </div>
        <div className="text-right">
          <Badge
            variant={signal.migrated ? "primary" : "warning"}
            className="mb-1 block text-center uppercase tracking-wider text-[8px] px-2 py-0.5 font-black"
          >
            {signal.migrated
              ? "Migrated"
              : (signal.launchpad || "PUMP").toUpperCase()}
          </Badge>
          <p className="text-[8px] text-text-muted font-black uppercase tracking-wider">
            {signal.migrated ? signal.dex || "Raydium" : "IN CURVE"}
          </p>
        </div>
      </div>

      {/* Main Metric Cards */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="p-2.5 bg-bg-main/40 rounded-lg border border-border-main/50 relative overflow-hidden">
          <p className="text-[8px] text-text-muted uppercase font-bold tracking-wider mb-0.5">
            Price
          </p>
          <p
            className={cn(
              "text-xs font-mono transition-all duration-700",
              flash === "up"
                ? "text-brand-primary font-bold drop-shadow-[0_0_8px_rgba(20,241,149,0.5)] scale-105"
                : flash === "down"
                  ? "text-brand-danger font-bold drop-shadow-[0_0_8px_rgba(255,75,75,0.5)] scale-105"
                  : "text-white",
            )}
          >
            $
            {signal.priceUsd < 0.01
              ? signal.priceUsd.toFixed(8)
              : signal.priceUsd.toFixed(3)}
          </p>
          {flash && (
            <div
              className={cn(
                "absolute inset-0 opacity-10 pointer-events-none animate-ping",
                flash === "up" ? "bg-brand-primary" : "bg-brand-danger",
              )}
            ></div>
          )}
        </div>
        <div className="p-2.5 bg-bg-main/40 rounded-lg border border-border-main/50">
          <p className="text-[8px] text-text-muted uppercase font-bold tracking-wider mb-0.5">
            Market Cap
          </p>
          <p className="text-xs font-mono text-white font-bold">
            $
            {signal.marketCap >= 1000000
              ? `${(signal.marketCap / 1000000).toFixed(2)}M`
              : `${(signal.marketCap / 1000).toFixed(1)}K`}
          </p>
        </div>
      </div>

      <div className="space-y-4 mb-4 flex-1">
        {/* Bonding Curve Section for Newly Launched & Nearly Migrated */}
        {!signal.migrated && (
          <div className="space-y-1.5 bg-bg-main/20 p-2.5 rounded-lg border border-border-main/30">
            <div className="flex justify-between items-center text-[8px] font-bold uppercase">
              <span className="text-text-muted flex items-center gap-1">
                <Target className="w-2.5 h-2.5" /> Bonding Curve Progress
              </span>
              <span className="text-brand-primary font-mono">
                {signal.bondingCurveProgress?.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-bg-tertiary h-2 rounded-full overflow-hidden p-[1px] border border-white/5">
              <div
                className="bg-brand-primary h-full rounded-full transition-all duration-1000 shadow-[0_0_12px_rgba(20,241,149,0.6)]"
                style={{ width: `${signal.bondingCurveProgress}%` }}
              ></div>
            </div>
            {subTab === "nearly_migrated" && (
              <div className="flex justify-between items-center text-[8px] text-text-muted uppercase font-bold mt-1">
                <span>EST. MIGRATION TIME</span>
                <span className="text-brand-secondary font-mono">
                  {getEstMigrationTime(signal.bondingCurveProgress)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Migrated Details Header for successfully migrated tokens */}
        {signal.migrated && (
          <div className="bg-brand-primary/5 border border-brand-primary/10 rounded-lg p-2.5 text-[10px] space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-text-muted font-bold text-[8px] uppercase">
                MIGRATION SUCCESS
              </span>
              <span className="text-brand-primary font-black uppercase text-[8px] tracking-wider">
                {formatAge(signal.migrationTime || signal.timestamp)}
              </span>
            </div>
            <div className="flex justify-between font-mono text-[9px]">
              <span className="text-text-muted">Target Pool:</span>
              <span className="text-white font-bold">
                {signal.dex || "Raydium"} Pool
              </span>
            </div>
          </div>
        )}

        {/* Detailed AI Subscores */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 bg-bg-main/20 p-2.5 rounded-lg border border-border-main/30">
          {scores.map((s) => (
            <div key={s.label} className="flex justify-between items-center">
              <span className="text-[8px] text-text-muted font-bold uppercase tracking-wider">
                {s.label}
              </span>
              <span className={cn("text-[9px] font-mono font-black", s.color)}>
                {s.value}%
              </span>
            </div>
          ))}
        </div>

        {/* Launch Details Row */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5 text-center">
          <div>
            <p className="text-[7px] text-text-muted uppercase font-bold tracking-wider">
              Holders
            </p>
            <p className="text-[10px] font-black text-white font-mono mt-0.5">
              {signal.holders?.toLocaleString() || "120"}
            </p>
          </div>
          <div>
            <p className="text-[7px] text-text-muted uppercase font-bold tracking-wider">
              Liquidity
            </p>
            <p className="text-[10px] font-black text-brand-primary font-mono mt-0.5">
              $
              {signal.liquidity
                ? signal.liquidity >= 1000
                  ? `${(signal.liquidity / 1000).toFixed(0)}K`
                  : signal.liquidity
                : "12K"}
            </p>
          </div>
          <div>
            <p className="text-[7px] text-text-muted uppercase font-bold tracking-wider">
              Token Age
            </p>
            <p className="text-[10px] font-black text-brand-secondary font-mono mt-0.5 whitespace-nowrap">
              {formatAge(signal.timestamp)}
            </p>
          </div>
        </div>

        {/* Volume (5m / 1h / 24h) Row */}
        <div className="grid grid-cols-3 gap-1 bg-bg-main/30 p-2 rounded-lg border border-border-main/30 text-center text-[9px]">
          <div>
            <p className="text-[6px] text-text-muted uppercase font-bold">
              Vol 5m
            </p>
            <span className="text-white font-mono font-bold">
              $
              {signal.volume5m
                ? signal.volume5m >= 1000
                  ? `${(signal.volume5m / 1000).toFixed(1)}K`
                  : signal.volume5m
                : "250"}
            </span>
          </div>
          <div>
            <p className="text-[6px] text-text-muted uppercase font-bold">
              Vol 1h
            </p>
            <span className="text-white font-mono font-bold">
              $
              {signal.volume1h
                ? signal.volume1h >= 1000
                  ? `${(signal.volume1h / 1000).toFixed(1)}K`
                  : signal.volume1h
                : "1.2K"}
            </span>
          </div>
          <div>
            <p className="text-[6px] text-text-muted uppercase font-bold">
              Vol 24h
            </p>
            <span className="text-white font-mono font-bold">
              $
              {signal.volume24h
                ? signal.volume24h >= 1000
                  ? `${(signal.volume24h / 1000).toFixed(1)}K`
                  : signal.volume24h
                : "5.4K"}
            </span>
          </div>
        </div>
      </div>

      {/* Button Controls */}
      <div className="grid grid-cols-3 gap-2 pt-4 border-t border-white/5">
        <Button
          size="sm"
          variant="vibrant"
          className="text-[9px] font-black h-9 shadow-lg shadow-brand-primary/10 tracking-widest uppercase hover:scale-[1.03] transition-transform"
          onClick={onBuy}
        >
          BUY
        </Button>
        {subTab === "migrated" && onSell ? (
          <Button
            size="sm"
            variant="danger"
            className="text-[9px] font-black h-9 tracking-widest uppercase hover:scale-[1.03] transition-transform"
            onClick={onSell}
          >
            SELL
          </Button>
        ) : (
          <Button
            size="sm"
            variant="primary"
            className="text-[9px] font-black h-9 opacity-90 tracking-widest uppercase hover:scale-[1.03] transition-transform"
          >
            AUTO
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          className="px-0 h-9 border-border-main hover:border-brand-primary/30"
          title="Create Price Alert"
        >
          <Bell className="w-3.5 h-3.5 text-text-muted hover:text-white" />
        </Button>
      </div>
    </motion.div>
  );
};

// --- Sub-sections ---

const SignalStream = React.memo(
  ({
    signals,
    onBuy,
  }: {
    signals: AISignal[];
    onBuy: (s: AISignal) => void;
  }) => {
    const { setSelectedToken } = useWebSocketSignals();
    return (
      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {signals.map((signal) => (
            <motion.div
              key={signal.id}
              initial={{ opacity: 0, x: -30, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 30, scale: 0.9 }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 30,
                mass: 0.8,
                opacity: { duration: 0.2 },
              }}
              onClick={(e) => {
                if (
                  (e.target as HTMLElement).closest("button") ||
                  (e.target as HTMLElement).closest("a")
                ) {
                  return;
                }
                setSelectedToken(signal);
              }}
              className="p-3 bg-bg-secondary border-l-2 border-brand-primary rounded-r group hover:bg-bg-tertiary transition-colors cursor-pointer overflow-hidden"
            >
              <div className="flex justify-between text-[10px] mb-1 font-bold">
                <span className="text-brand-primary uppercase tracking-tighter">
                  {signal.potential} POTENTIAL
                </span>
                <span className="text-text-muted">JUST NOW</span>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm font-bold text-white">
                    {signal.tokenSymbol}
                  </div>
                  <div className="text-[10px] text-text-muted truncate max-w-[150px]">
                    {signal.reasons[0]}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-brand-primary">
                    {signal.score}%
                  </div>
                  <div className="text-[10px] text-text-muted">AI Score</div>
                </div>
              </div>
              <div className="mt-2 flex gap-2">
                <Button
                  size="sm"
                  variant="vibrant"
                  className="flex-1"
                  onClick={() => onBuy(signal)}
                >
                  SNIPE
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="px-2"
                  onClick={() =>
                    navigator.clipboard.writeText(signal.tokenAddress)
                  }
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    );
  },
);

const TokenCard = ({
  signal,
  onBuy,
}: {
  signal: AISignal;
  onBuy: () => void;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 bg-bg-secondary border border-border-main rounded-xl hover:border-brand-primary/40 transition-all relative group"
    >
      <div className="absolute top-2 right-2 flex gap-1">
        <Badge variant="primary">{signal.potential}</Badge>
        <div className="w-8 h-8 rounded-full bg-brand-primary/10 flex items-center justify-center text-[8px] font-bold text-brand-primary border border-brand-primary/20">
          {signal.overallConfidenceScore}%
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-bg-tertiary flex items-center justify-center font-bold text-brand-primary">
          {signal.tokenSymbol[0]}
        </div>
        <div>
          <h4 className="text-sm font-bold text-white">{signal.tokenSymbol}</h4>
          <p className="text-[10px] text-text-muted font-mono truncate w-24">
            {signal.tokenAddress.slice(0, 4)}...{signal.tokenAddress.slice(-4)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="p-2 bg-bg-main rounded border border-border-main">
          <p className="text-[8px] text-text-muted uppercase font-bold">
            Price
          </p>
          <p className="text-[10px] font-mono transition-colors duration-300 text-white">
            ${signal.priceUsd.toFixed(6)}
          </p>
        </div>
        <div className="p-2 bg-bg-main rounded border border-border-main">
          <p className="text-[8px] text-text-muted uppercase font-bold">
            Mkt Cap
          </p>
          <p className="text-[10px] font-mono text-white">
            ${(signal.marketCap / 1000).toFixed(1)}K
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button size="sm" variant="vibrant" className="flex-1" onClick={onBuy}>
          SNIPE
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigator.clipboard.writeText(signal.tokenAddress)}
        >
          <Copy className="w-3 h-3" />
        </Button>
      </div>
    </motion.div>
  );
};

const TradeTerminal = ({
  user,
  executeTrade,
  selectedToken,
}: {
  user: UserProfile;
  executeTrade: any;
  selectedToken: any;
}) => {
  const [activeTab, setActiveTab] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("0.1");
  const [isExecuting, setIsExecuting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleExecute = async () => {
    if (!selectedToken) return;
    setIsExecuting(true);
    setErrorMsg("");
    try {
      await executeTrade(
        selectedToken,
        parseFloat(amount),
        activeTab,
        BotType.MANUAL,
      );
    } catch (err: any) {
      setErrorMsg(err.message || "Execution failed");
    } finally {
      setIsExecuting(false);
    }
  };

  const activeWallet = user.wallets.find((w) => w.id === user.activeWalletId);

  return (
    <Card className="h-fit">
      <div className="flex border-b border-border-main -m-5 mb-5 overflow-hidden rounded-t-xl">
        <button
          onClick={() => setActiveTab("buy")}
          className={cn(
            "flex-1 py-4 font-bold text-[10px] uppercase tracking-widest transition-all",
            activeTab === "buy"
              ? "bg-brand-primary text-black"
              : "bg-bg-tertiary text-text-muted hover:text-white",
          )}
        >
          Buy
        </button>
        <button
          onClick={() => setActiveTab("sell")}
          className={cn(
            "flex-1 py-4 font-bold text-[10px] uppercase tracking-widest transition-all",
            activeTab === "sell"
              ? "bg-brand-danger text-white"
              : "bg-bg-tertiary text-text-muted hover:text-white",
          )}
        >
          Sell
        </button>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
            Select Wallet
          </label>
          <div className="p-3 bg-bg-main border border-border-main rounded text-xs text-white flex justify-between items-center cursor-pointer hover:border-brand-primary/50 transition-colors">
            <span>{activeWallet ? activeWallet.name : "No Wallet"}</span>
            <span className="text-[10px] text-brand-primary">{activeWallet ? `${activeWallet.balance.toFixed(2)} SOL` : "0.00 SOL"}</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-[10px] font-bold text-text-muted uppercase tracking-widest">
            <span>Amount</span>
            <span className="text-brand-primary">MAX</span>
          </div>
          <div className="relative">
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-bg-main border border-border-main rounded p-4 text-right text-lg font-mono outline-none focus:border-brand-primary transition-all"
            />
            <span className="absolute left-4 top-4 text-text-muted text-xs font-bold">
              SOL
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-bg-secondary rounded border border-border-main text-center">
            <p className="text-[10px] text-text-muted mb-1 font-bold">
              SLIPPAGE
            </p>
            <p className="text-xs text-white font-mono">1.0%</p>
          </div>
          <div className="p-3 bg-bg-secondary rounded border border-border-main text-center">
            <p className="text-[10px] text-text-muted mb-1 font-bold">
              PRIORITY
            </p>
            <p className="text-xs text-brand-primary font-mono">TURBO</p>
          </div>
        </div>

        <div className="p-4 bg-bg-main rounded border border-border-main relative">
          <div className="absolute top-0 right-0 p-1">
            <Zap className="w-3 h-3 text-brand-primary animate-pulse" />
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-bold text-text-muted uppercase">
              Bot Efficiency
            </span>
            <span className="text-[10px] font-bold text-brand-primary">
              98.2%
            </span>
          </div>
          <div className="w-full bg-bg-tertiary h-1.5 rounded-full overflow-hidden">
            <div className="bg-gradient-to-r from-brand-primary to-brand-secondary h-full w-[98%] shadow-[0_0_10px_#14F195]"></div>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold">
            {errorMsg}
          </div>
        )}

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleExecute}
          disabled={isExecuting || !selectedToken}
          className={cn(
            "w-full py-5 text-sm min-h-[44px] rounded font-bold transition-all flex items-center justify-center gap-2 uppercase tracking-widest",
            isExecuting
              ? "opacity-50 cursor-not-allowed bg-gray-500 text-white"
              : activeTab === "buy"
                ? "bg-brand-primary text-black hover:brightness-110 shadow-lg shadow-brand-primary/20"
                : "bg-brand-danger text-white hover:brightness-110",
          )}
        >
          {isExecuting
            ? "Executing..."
            : `Execute ${activeTab === "buy" ? "Buy" : "Sell"} Trade`}
        </motion.button>
      </div>
    </Card>
  );
};

// --- Main App Component ---

function AppContent() {
  const {
    user,
    trades,
    walletMode,
    setWalletMode,
    executeTrade,
    resetSimulation,
    activeWallet,
    executionLogs,
    switchWallet,
    createWallet,
    importWallet,
    renameWallet,
    setDefaultWallet,
    bulkAction,
    login,
    logout,
  } = useWallet();
  const [activeTab, setActiveTab] = useState<
    | "dashboard"
    | "terminal"
    | "live_trades"
    | "execution_logs"
    | "sniper"
    | "analytics"
    | "admin"
    | "wallets"
  >("dashboard");
  const [terminalSubTab, setTerminalSubTab] = useState<
    "newly_launched" | "nearly_migrated" | "migrated"
  >("newly_launched");
  const [isLogin, setIsLogin] = useState(true);
  const {
    signals,
    isConnected,
    connectionStatus,
    lastUpdated,
    selectedToken,
    setSelectedToken,
    isNeuralStreamEnabled,
  } = useWebSocketSignals();
  const [showSidebar, setShowSidebar] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [selectedTradeIds, setSelectedTradeIds] = useState<Set<string>>(
    new Set(),
  );
  const [isNeuralStreamOpen, setIsNeuralStreamOpen] = useState(false);

  // Throttling mechanism for Terminal
  const [throttledSignals, setThrottledSignals] = useState<AISignal[]>([]);
  const lastPriceRef = useRef<Record<string, number>>({});

  useEffect(() => {
    // Only update if there's a significant price change or new token
    const hasSignificantChange = signals.some((s) => {
      const lastPrice = lastPriceRef.current[s.tokenAddress];
      if (lastPrice === undefined) return true;
      return Math.abs(s.priceUsd - lastPrice) / lastPrice > 0.0001;
    });

    if (hasSignificantChange || throttledSignals.length !== signals.length) {
      setThrottledSignals(signals);
      signals.forEach((s) => {
        lastPriceRef.current[s.tokenAddress] = s.priceUsd;
      });
    }
  }, [signals, throttledSignals.length]);

  const liveTrades = useMemo(() => {
    return [...trades]
      .sort((a, b) => {
        const dateA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const dateB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return dateB - dateA;
      })
      .map((trade) => {
        const liveToken = signals.find(
          (s) => s.tokenAddress === trade.tokenAddress,
        );
        const currentPrice = liveToken ? liveToken.priceUsd : trade.price;

        const fees = trade.fees || 0;
        const currentVal = currentPrice * trade.quantity;
        const entryVal = trade.entryPrice * trade.quantity;
        const pnl =
          trade.type === "buy"
            ? currentVal - entryVal - fees
            : entryVal - currentVal - fees;
        const pnlPercent = entryVal > 0 ? (pnl / entryVal) * 100 : 0;

        return {
          ...trade,
          price: currentPrice,
          pnl,
          pnlPercent,
        };
      });
  }, [trades, signals]);

  const pnlHistory24h = useMemo(() => {
    const now = new Date();
    const points = [];
    const completedTrades = trades.filter(
      (t) => t.status === TradeStatus.COMPLETED
    );

    for (let i = 24; i >= 0; i--) {
      const timeAtPoint = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hourStr = timeAtPoint.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      let cumulativePnL = 0;
      completedTrades.forEach((t) => {
        const completedTime = t.exitedAt
          ? new Date(t.exitedAt)
          : t.timestamp
          ? new Date(t.timestamp)
          : now;
        if (completedTime.getTime() <= timeAtPoint.getTime()) {
          cumulativePnL += t.pnl || 0;
        }
      });

      if (completedTrades.length === 0) {
        const wiggle = Math.sin(i * 0.5) * 0.05 - i * 0.002;
        cumulativePnL = wiggle;
      }

      points.push({
        time: hourStr,
        pnl: parseFloat(cumulativePnL.toFixed(4)),
      });
    }

    return points;
  }, [trades]);

  const activeLiveTrades = useMemo(() => {
    return liveTrades.filter(
      (t) =>
        t.status !== "completed" &&
        t.status !== "failed" &&
        t.status !== "cancelled"
    );
  }, [liveTrades]);

  // Auth Form State
  const [authData, setAuthData] = useState({
    username: "",
    password: "",
    accessId: "",
    accessKey: "",
  });

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(authData.username, authData.password, authData.accessId);
    } catch (err: any) {
      alert(err.message || "Authentication failed.");
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-bg-main flex items-center justify-center p-4 relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-primary/10 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-secondary/10 rounded-full blur-[120px] animate-pulse delay-700"></div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md relative z-10"
        >
          <Card className="p-8 backdrop-blur-xl bg-bg-card/80 border-white/5">
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-tr from-brand-secondary to-brand-primary rounded-xl flex items-center justify-center font-bold text-black text-xl shadow-lg shadow-brand-primary/20">
                  S
                </div>
                <h1 className="text-3xl font-bold tracking-tight">
                  SOLANA<span className="text-brand-primary">AI</span>
                </h1>
              </div>
              <p className="text-text-muted text-xs uppercase tracking-widest font-bold">
                Terminal Entry Protocol
              </p>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              {isLogin ? (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-muted uppercase">
                      Username
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="ENTER USERNAME"
                      value={authData.username}
                      onChange={(e) =>
                        setAuthData({ ...authData, username: e.target.value })
                      }
                      className="w-full bg-bg-main border border-border-main rounded p-4 text-xs font-mono outline-none focus:border-brand-primary transition-all text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-muted uppercase">
                      Access Password
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={authData.password}
                      onChange={(e) =>
                        setAuthData({ ...authData, password: e.target.value })
                      }
                      className="w-full bg-bg-main border border-border-main rounded p-4 text-xs font-mono outline-none focus:border-brand-primary transition-all text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-muted uppercase">
                      Access ID
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="ENTER ID"
                      value={authData.accessId}
                      onChange={(e) =>
                        setAuthData({ ...authData, accessId: e.target.value })
                      }
                      className="w-full bg-bg-main border border-border-main rounded p-4 text-xs font-mono outline-none focus:border-brand-primary transition-all text-white"
                    />
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-text-muted text-xs">
                  Account creation restricted. Use Access ID protocols.
                  <Button
                    variant="outline"
                    className="mt-4 w-full"
                    onClick={() => setIsLogin(true)}
                  >
                    Return to Protocol
                  </Button>
                </div>
              )}

              {isLogin && (
                <Button
                  variant="vibrant"
                  type="submit"
                  className="w-full py-4 text-sm mt-4"
                >
                  Authorize Access
                </Button>
              )}
            </form>

            <div className="mt-8 pt-8 border-t border-border-main text-center">
              <div className="flex justify-center gap-6">
                <a
                  href="#"
                  className="text-[10px] text-text-muted hover:text-white transition-colors uppercase font-bold tracking-widest"
                >
                  Support
                </a>
                <a
                  href="#"
                  className="text-[10px] text-text-muted hover:text-white transition-colors uppercase font-bold tracking-widest"
                >
                  API
                </a>
                <a
                  href="#"
                  className="text-[10px] text-text-muted hover:text-white transition-colors uppercase font-bold tracking-widest"
                >
                  Security
                </a>
              </div>
            </div>
          </Card>
          <p className="text-center mt-6 text-[10px] text-text-muted/50 uppercase tracking-tighter">
            Encrypted with AES-256-GCM • Secure Session Bound
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-bg-main text-text-main overflow-hidden">
      {/* Mobile Navigation Drawer */}
      <MobileNavDrawer
        isOpen={showMobileNav}
        onClose={() => setShowMobileNav(false)}
        setActiveTab={setActiveTab}
        activeTab={activeTab}
        user={user}
      />

      {/* Navigation */}
      <nav className="h-16 border-b border-border-main flex items-center justify-between px-4 sm:px-6 bg-bg-card relative z-50 shadow-2xl">
        <div className="flex items-center space-x-3 sm:space-x-10">
          <button
            onClick={() => setShowMobileNav(true)}
            className="lg:hidden p-1.5 text-text-muted hover:text-white bg-bg-secondary rounded border border-border-main flex items-center justify-center cursor-pointer"
            title="Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-2 group cursor-pointer">
            <div className="w-8 h-8 bg-gradient-to-tr from-brand-secondary to-brand-primary rounded-lg flex items-center justify-center font-bold text-black text-xs shadow-lg shadow-brand-primary/20 transition-transform group-hover:scale-110">
              S
            </div>
            <span className="text-lg font-bold tracking-tighter hidden md:inline">
              SOLANA<span className="text-brand-primary">AI</span>
            </span>
          </div>
          <div className="hidden lg:flex space-x-4 md:space-x-8 text-[10px] font-bold uppercase tracking-widest text-text-muted overflow-x-auto no-scrollbar whitespace-nowrap max-w-[30vw] sm:max-w-none">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={cn(
                "hover:text-white transition-all pb-5 mt-5 border-b-2 cursor-pointer",
                activeTab === "dashboard"
                  ? "border-brand-primary text-white"
                  : "border-transparent",
              )}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab("terminal")}
              className={cn(
                "hover:text-white transition-all pb-5 mt-5 border-b-2 cursor-pointer",
                activeTab === "terminal"
                  ? "border-brand-primary text-white"
                  : "border-transparent",
              )}
            >
              Terminal
            </button>
            <button
              onClick={() => setActiveTab("live_trades")}
              className={cn(
                "hover:text-white transition-all pb-5 mt-5 border-b-2 cursor-pointer",
                activeTab === "live_trades"
                  ? "border-brand-primary text-white"
                  : "border-transparent",
              )}
            >
              Live Trades
            </button>
            <button
              onClick={() => setActiveTab("execution_logs")}
              className={cn(
                "hover:text-white transition-all pb-5 mt-5 border-b-2 cursor-pointer",
                activeTab === "execution_logs"
                  ? "border-brand-primary text-white"
                  : "border-transparent",
              )}
            >
              Execution Logs
            </button>
            <button
              onClick={() => setActiveTab("sniper")}
              className={cn(
                "hover:text-white transition-all pb-5 mt-5 border-b-2 cursor-pointer",
                activeTab === "sniper"
                  ? "border-brand-primary text-white"
                  : "border-transparent",
              )}
            >
              Bot Sniper
            </button>
            <button
              onClick={() => setActiveTab("wallets")}
              className={cn(
                "hover:text-white transition-all pb-5 mt-5 border-b-2 cursor-pointer",
                activeTab === "wallets"
                  ? "border-brand-primary text-white"
                  : "border-transparent",
              )}
            >
              Wallets
            </button>
            <button
              onClick={() => setActiveTab("analytics")}
              className={cn(
                "hover:text-white transition-all pb-5 mt-5 border-b-2 cursor-pointer",
                activeTab === "analytics"
                  ? "border-brand-primary text-white"
                  : "border-transparent",
              )}
            >
              Analytics
            </button>
            {(user?.role === UserRole.ADMIN ||
              user?.role === UserRole.SUPER_ADMIN) && (
              <button
                onClick={() => setActiveTab("admin")}
                className={cn(
                  "hover:text-white transition-all pb-5 mt-5 border-b-2 cursor-pointer",
                  activeTab === "admin"
                    ? "border-brand-primary text-white"
                    : "border-transparent",
                )}
              >
                Admin
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-6">
          {!isNeuralStreamOpen && isNeuralStreamEnabled && (
            <button
              onClick={() => setIsNeuralStreamOpen(true)}
              className="px-3 py-1.5 bg-bg-tertiary border border-border-main rounded text-[10px] font-bold text-white hover:border-brand-primary transition-all"
            >
              Show Stream
            </button>
          )}
          {/* Wallet Profile Switcher */}
          {user?.wallets && user.wallets.length > 0 && (
            <div className="relative group">
              <button className="flex items-center gap-2 px-3 py-1.5 bg-bg-tertiary/50 border border-border-main rounded text-[10px] font-bold text-white hover:border-brand-primary transition-all">
                <Wallet className="w-3.5 h-3.5 text-brand-primary" />
                <span className="hidden sm:inline">
                  {activeWallet?.name || "Wallets"}
                </span>
                <ChevronDown className="w-3 h-3 text-text-muted" />
              </button>
              <div className="absolute top-full right-0 mt-2 w-72 bg-bg-card border border-border-main rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[100] p-1 backdrop-blur-xl">
                <div className="px-3 py-2 text-[8px] font-black text-text-muted uppercase tracking-widest border-b border-border-main mb-1">
                  Select Active Wallet
                </div>
                <div className="max-h-64 overflow-y-auto no-scrollbar">
                  {user.wallets.map((wallet) => (
                    <button
                      key={wallet.id}
                      onClick={() => switchWallet(wallet.id)}
                      className={cn(
                        "w-full px-3 py-2 text-left rounded flex items-center justify-between hover:bg-bg-tertiary transition-colors",
                        activeWallet?.id === wallet.id ? "bg-bg-secondary" : "",
                      )}
                    >
                      <div>
                        <div className="text-[10px] font-bold text-white">
                          {wallet.name}
                        </div>
                        <div className="text-[8px] text-text-muted font-mono">
                          {wallet.address.slice(0, 8)}...
                          {wallet.address.slice(-4)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-mono text-brand-primary">
                          {wallet.balance.toFixed(4)} SOL
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="p-2 border-t border-border-main mt-1">
                  <button
                    onClick={() => {
                      const name = prompt("Enter wallet name:");
                      if (name) createWallet(name);
                    }}
                    className="w-full py-2 text-[10px] font-bold uppercase tracking-widest text-brand-primary hover:text-white transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-3 h-3" /> Create New Wallet
                  </button>
                </div>
              </div>
            </div>
          )}

          {(user?.role === UserRole.ADMIN ||
            user?.role === UserRole.SUPER_ADMIN) && (
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "text-[9px] font-bold uppercase",
                  walletMode === WalletMode.SIMULATION
                    ? "text-brand-primary"
                    : "text-brand-secondary",
                )}
              >
                {walletMode === WalletMode.SIMULATION ? "SIMULATION" : "REAL"}
              </span>
              <button
                onClick={() =>
                  setWalletMode(
                    walletMode === WalletMode.SIMULATION
                      ? WalletMode.REAL
                      : WalletMode.SIMULATION,
                  )
                }
                className="w-8 h-4 bg-bg-tertiary rounded-full relative p-1 border border-border-main"
              >
                <div
                  className={cn(
                    "w-2 h-2 rounded-full transition-all duration-300",
                    walletMode === WalletMode.SIMULATION
                      ? "bg-brand-primary left-1"
                      : "bg-brand-secondary translate-x-4",
                  )}
                ></div>
              </button>
            </div>
          )}

          <div className="flex items-center space-x-1 sm:space-x-2 px-2.5 sm:px-3 py-2 border border-brand-primary/30 rounded text-brand-primary text-[10px] font-bold bg-brand-primary/5">
            <span className="hidden sm:inline">{user?.username}</span>
            {(user?.role === UserRole.ADMIN ||
              user?.role === UserRole.SUPER_ADMIN) && (
              <span className="bg-brand-primary text-black px-1 rounded text-[8px] ml-1 uppercase">
                {user?.role === UserRole.SUPER_ADMIN ? "Super" : "Admin"}
              </span>
            )}
            <div className="w-px h-3 bg-brand-primary/20 hidden sm:block"></div>
            <span>{activeWallet?.balance.toFixed(2) || "0.00"} SOL</span>
          </div>

          <button
            onClick={logout}
            className="p-1.5 bg-bg-tertiary hover:bg-brand-danger/20 rounded border border-border-main text-text-muted hover:text-brand-danger transition-all group"
            title="Logout Securely"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>

          {walletMode === WalletMode.SIMULATION && (
            <button
              onClick={resetSimulation}
              className="p-1.5 bg-bg-tertiary hover:bg-bg-secondary rounded border border-border-main text-text-muted hover:text-white"
              title="Reset Sim Balance"
            >
              <History className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => logout()}
            className="p-1.5 sm:p-2 text-text-muted hover:text-brand-danger transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </nav>

      <main className="flex-1 flex overflow-hidden relative">
        {/* Mobile Sidebar Backdrop Overlay */}
        {showSidebar && (
          <div
            onClick={() => setShowSidebar(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden cursor-pointer"
          />
        )}

        {/* Signal Sidebar */}
        <aside
          className={cn(
            "w-80 border-r border-border-main bg-bg-card flex flex-col p-4 z-40 transition-all duration-300",
            "fixed inset-y-0 left-0 -translate-x-full lg:translate-x-0 lg:relative lg:flex",
            showSidebar ? "translate-x-0" : "",
            (!isNeuralStreamOpen || !isNeuralStreamEnabled) &&
              "hidden lg:hidden",
          )}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
              Neural Stream
            </h3>
            <button
              onClick={() => setIsNeuralStreamOpen(false)}
              className="text-text-muted hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar">
            <SignalStream
              signals={throttledSignals}
              onBuy={(s) =>
                executeTrade(
                  s,
                  user?.botSettings?.amountPerTrade || 0.1,
                  "buy",
                  BotType.MANUAL,
                )
              }
            />
          </div>

          <div className="mt-6 pt-6 border-t border-border-main">
            <div className="p-4 bg-bg-tertiary rounded-xl border border-border-main group cursor-pointer hover:border-brand-secondary/40 transition-all">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest">
                  Auto-Sniper
                </span>
                <div
                  className={cn(
                    "w-7 h-3.5 rounded-full relative transition-all",
                    user?.botSettings?.autoBuy
                      ? "bg-brand-primary"
                      : "bg-bg-secondary",
                  )}
                >
                  <div
                    className={cn(
                      "absolute top-0.5 w-2.5 h-2.5 bg-white rounded-full transition-all",
                      user?.botSettings?.autoBuy ? "right-0.5" : "left-0.5",
                    )}
                  ></div>
                </div>
              </div>
              <div className="text-[10px] font-bold text-white uppercase mb-1">
                Configuration
              </div>
              <div className="flex justify-between text-[9px] text-text-muted uppercase tracking-tighter">
                <span>SL: {user?.botSettings?.stopLoss}%</span>
                <span>
                  TP:{" "}
                  {user?.botSettings?.takeProfitLevels?.[0]?.percentage || "∞"}%
                </span>
                <span>AMT: {user?.botSettings?.amountPerTrade} SOL</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <section className="flex-1 p-6 overflow-y-auto no-scrollbar bg-bg-main relative">
          <AnimatePresence mode="wait">
            {activeTab === "dashboard" && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Card className="lg:col-span-2">
                    <div className="flex justify-between items-center mb-8">
                      <div>
                        <h2 className="text-xl font-bold text-white tracking-tight">
                          Market Intelligence
                        </h2>
                        <p className="text-[10px] text-text-muted uppercase font-bold tracking-widest">
                          WIF / SOL • 15M Aggregator
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {["1M", "5M", "15M", "1H"].map((t) => (
                          <button
                            key={t}
                            className={cn(
                              "px-3 py-1 rounded text-[9px] font-bold border transition-all",
                              t === "15M"
                                ? "bg-brand-primary text-black border-brand-primary"
                                : "bg-bg-tertiary border-transparent text-text-muted hover:text-white",
                            )}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="h-[280px] w-full flex items-end justify-between space-x-1.5 px-2 pb-6 border-b border-border-main relative">
                      <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
                        <TrendingUp className="w-64 h-64" />
                      </div>
                      {[
                        40, 55, 70, 85, 60, 45, 75, 90, 50, 65, 80, 40, 60, 55,
                        70, 80, 45, 65, 75, 90,
                      ].map((h, i) => (
                        <motion.div
                          key={i}
                          initial={{ height: 0 }}
                          animate={{ height: `${h}%` }}
                          className={cn(
                            "w-full rounded-t-sm transition-colors duration-500",
                            i % 4 === 0
                              ? "bg-brand-danger"
                              : "bg-brand-primary",
                            "shadow-[0_0_15px_rgba(20,241,149,0.1)]",
                          )}
                        ></motion.div>
                      ))}
                    </div>
                    <div className="grid grid-cols-4 mt-6">
                      {[
                        { label: "PRICE", val: "$0.000021" },
                        { label: "24H VOL", val: "1.2M SOL" },
                        { label: "MARKET CAP", val: "42.5M" },
                        { label: "HOLDERS", val: "12.8K" },
                      ].map((s, i) => (
                        <div key={i} className="text-center">
                          <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1">
                            {s.label}
                          </p>
                          <p className="text-xs font-mono text-white font-bold">
                            {s.val}
                          </p>
                        </div>
                      ))}
                    </div>
                  </Card>
                  <TradeTerminal
                    user={user}
                    executeTrade={executeTrade}
                    selectedToken={selectedToken}
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card
                    title="Top 3 AI Called Tokens"
                    subtitle="Updated every 60m • High Conviction"
                  >
                    <div className="grid grid-cols-1 gap-4 mt-4">
                      {signals.slice(0, 3).map((s, i) => (
                        <div
                          key={i}
                          onClick={() => setSelectedToken(s)}
                          className="flex items-center justify-between p-4 bg-bg-secondary rounded-xl border border-border-main hover:border-brand-primary/30 transition-all cursor-pointer"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-bg-tertiary flex items-center justify-center font-bold text-brand-primary border border-brand-primary/20 text-xs">
                              #{i + 1}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white">
                                {s.tokenSymbol}
                              </p>
                              <p className="text-[10px] text-text-muted uppercase font-bold tracking-tighter">
                                MCAP: ${(s.marketCap / 1000).toFixed(1)}K •
                                SCORE: {s.score}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-brand-primary">
                              {s.potential}
                            </p>
                            <p className="text-[9px] text-text-muted uppercase font-bold tracking-widest">
                              EST. POTENTIAL
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>

                  <Card title="Leaderboard" subtitle="Top Performing AI Calls">
                    <div className="space-y-4 mt-4">
                      {[
                        {
                          token: "BONK",
                          gain: "+420%",
                          date: "2d ago",
                          score: 98,
                        },
                        {
                          token: "WIF",
                          gain: "+185%",
                          date: "5h ago",
                          score: 94,
                        },
                        {
                          token: "PEPE",
                          gain: "+92%",
                          date: "12h ago",
                          score: 89,
                        },
                      ].map((l, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-4 border-b border-border-main/30 last:border-0"
                        >
                          <div className="flex items-center gap-4">
                            <span className="text-xs font-bold text-text-muted">
                              #{i + 1}
                            </span>
                            <div>
                              <p className="text-sm font-bold text-white">
                                {l.token}
                              </p>
                              <p className="text-[10px] text-text-muted">
                                {l.date}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-brand-primary">
                              {l.gain}
                            </p>
                            <div className="flex items-center gap-1 justify-end">
                              <StarRating score={l.score} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>

                <Card
                  title="Active Positions"
                  subtitle="Real-time PnL Tracking"
                  className="relative overflow-visible"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <div className="lg:col-span-3 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            className="w-3.5 h-3.5 rounded border-border-main bg-bg-tertiary text-brand-primary focus:ring-brand-primary"
                            checked={
                              selectedTradeIds.size === activeLiveTrades.length &&
                              activeLiveTrades.length > 0
                            }
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedTradeIds(
                                  new Set(activeLiveTrades.map((t) => t.id)),
                                );
                              } else {
                                setSelectedTradeIds(new Set());
                              }
                            }}
                          />
                          <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                            Select All
                          </span>
                        </div>

                        <AnimatePresence>
                          {selectedTradeIds.size > 0 && (
                            <motion.div
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 20 }}
                              className="flex items-center gap-2"
                            >
                              <button
                                onClick={() => {
                                  bulkAction("close", Array.from(selectedTradeIds));
                                  setSelectedTradeIds(new Set());
                                }}
                                className="px-3 py-1.5 bg-brand-danger/10 border border-brand-danger/20 rounded text-[9px] font-bold text-brand-danger hover:bg-brand-danger/20 transition-all"
                              >
                                CLOSE ALL ({selectedTradeIds.size})
                              </button>
                              <button
                                onClick={() => {
                                  bulkAction(
                                    "cancel",
                                    Array.from(selectedTradeIds),
                                  );
                                  setSelectedTradeIds(new Set());
                                }}
                                className="px-3 py-1.5 bg-bg-tertiary border border-border-main rounded text-[9px] font-bold text-text-muted hover:text-white transition-all"
                              >
                                CANCEL PENDING
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                          <thead>
                            <tr className="text-text-muted border-b border-border-main uppercase tracking-tighter">
                              <th className="pb-4 w-8"></th>
                              <th className="pb-4">Asset</th>
                              <th className="pb-4">Status</th>
                              <th className="pb-4">Auto-Close</th>
                              <th className="pb-4">Entry</th>
                              <th className="pb-4">Current</th>
                              <th className="pb-4 text-right">PnL</th>
                            </tr>
                          </thead>
                          <tbody className="font-mono">
                            {activeLiveTrades.map((t) => (
                              <tr
                                key={t.id}
                                className="border-b border-border-main/50 group hover:bg-white/[0.02] transition-colors"
                              >
                                <td className="py-4">
                                  <input
                                    type="checkbox"
                                    className="w-3.5 h-3.5 rounded border-border-main bg-bg-tertiary text-brand-primary focus:ring-brand-primary"
                                    checked={selectedTradeIds.has(t.id)}
                                    onChange={(e) => {
                                      const next = new Set(selectedTradeIds);
                                      if (e.target.checked) next.add(t.id);
                                      else next.delete(t.id);
                                      setSelectedTradeIds(next);
                                    }}
                                  />
                                </td>
                                <td className="py-4 text-white font-sans font-bold">
                                  {t.tokenSymbol}
                                </td>
                                <td>
                                  <Badge
                                    variant={
                                      t.status === "confirmed" ||
                                      t.status === "monitoring"
                                        ? "primary"
                                        : "warning"
                                    }
                                  >
                                    {t.status?.toUpperCase() || "UNKNOWN"}
                                  </Badge>
                                </td>
                                <td className="py-4">
                                  <CountdownTimer trade={t} />
                                </td>
                                <td>${t.entryPrice.toFixed(6)}</td>
                                <td>
                                  $
                                  {t.currentPrice
                                    ? t.currentPrice.toFixed(6)
                                    : (
                                        signals.find(
                                          (s) => s.tokenAddress === t.tokenAddress,
                                        )?.priceUsd || t.entryPrice
                                      ).toFixed(6)}
                                </td>
                                <td
                                  className={cn(
                                    "text-right font-bold",
                                    (t.pnlPercent || 0) >= 0
                                      ? "text-brand-primary"
                                      : "text-brand-danger",
                                  )}
                                >
                                  {(t.pnlPercent || 0) >= 0 ? "+" : ""}
                                  {(t.pnlPercent || 0).toFixed(2)}%
                                </td>
                              </tr>
                            ))}
                            {activeLiveTrades.length === 0 && (
                              <tr>
                                <td
                                  colSpan={7}
                                  className="py-8 text-center text-text-muted uppercase tracking-widest text-[10px] font-bold"
                                >
                                  No active positions found
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="lg:col-span-1">
                      <MiniPnLChart data={pnlHistory24h} />
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}

            {activeTab === "execution_logs" && (
              <motion.div
                key="execution_logs"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-[calc(100vh-8rem)]"
              >
                <ExecutionLogPanel logs={executionLogs} />
              </motion.div>
            )}

            {activeTab === "terminal" && (
              <motion.div
                key="terminal"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <TerminalTab
                  subTab={terminalSubTab}
                  setSubTab={setTerminalSubTab}
                  onBuy={(s) => setSelectedToken(s)}
                  signals={throttledSignals}
                />
              </motion.div>
            )}

            {activeTab === "live_trades" && (
              <motion.div
                key="live_trades"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <LiveTrades onSelectTrade={(t) => setSelectedTrade(t)} />
              </motion.div>
            )}

            {activeTab === "sniper" && (
              <motion.div
                key="sniper"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <SniperTab />
              </motion.div>
            )}

            {activeTab === "wallets" && (
              <motion.div
                key="wallets"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <WalletManager />
              </motion.div>
            )}

            {activeTab === "analytics" && (
              <motion.div
                key="analytics"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
              >
                <AnalyticsTab />
              </motion.div>
            )}

            {activeTab === "admin" &&
              (user?.role === UserRole.ADMIN ||
                user?.role === UserRole.SUPER_ADMIN) && (
                <motion.div
                  key="admin"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <AdminDashboard />
                </motion.div>
              )}
          </AnimatePresence>
        </section>
      </main>

      <AnimatePresence>
        {selectedToken && (
          <TokenDetailsModal
            token={selectedToken}
            onClose={() => setSelectedToken(null)}
            onBuy={(token, amount) => {
              executeTrade(token, amount, "buy", BotType.MANUAL);
              setSelectedToken(null);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedTrade && (
          <TradeDrawer
            trade={selectedTrade}
            onClose={() => setSelectedTrade(null)}
          />
        )}
      </AnimatePresence>

      <footer className="h-10 border-t border-border-main bg-bg-card flex items-center justify-between px-6 text-[9px] text-text-muted font-mono z-50">
        <div className="flex space-x-8">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "w-1.5 h-1.5 rounded-full shadow-[0_0_8px]",
                connectionStatus === "connected"
                  ? "bg-brand-primary shadow-brand-primary/50"
                  : connectionStatus === "reconnecting"
                    ? "bg-yellow-500 shadow-yellow-500/50 animate-pulse"
                    : "bg-brand-danger shadow-brand-danger/50",
              )}
            ></div>
            <span className="uppercase tracking-widest text-white">
              SOCKET:{" "}
              {connectionStatus === "connected"
                ? "CONNECTED"
                : connectionStatus === "reconnecting"
                  ? "RECONNECTING"
                  : "OFFLINE"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-brand-primary"></div>
            <span>
              LAST SYNC:{" "}
              {lastUpdated
                ? new Date(lastUpdated).toLocaleTimeString()
                : "NEVER"}
            </span>
          </div>
          <div className="flex items-center gap-2 hidden md:flex">
            <span>RPC LATENCY: 42ms</span>
          </div>
        </div>
        <div className="flex items-center space-x-6">
          <span className="font-bold uppercase tracking-widest text-white/40 hidden lg:inline">
            Secure Trading Protocol v4.0.1
          </span>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3 h-3 text-brand-primary" />
            <span className="uppercase font-bold">Contact Dev: @egoinweb3</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <WebSocketProvider>
      <WalletProvider>
        <AppContent />
      </WalletProvider>
    </WebSocketProvider>
  );
}

const StarRating = ({ score }: { score: number }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((i) => (
      <div
        key={i}
        className={cn(
          "w-1 h-1 rounded-full",
          i <= score / 20
            ? "bg-brand-primary shadow-[0_0_5px_#14F195]"
            : "bg-bg-tertiary",
        )}
      ></div>
    ))}
  </div>
);
