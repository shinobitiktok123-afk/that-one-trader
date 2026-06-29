export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
}

export enum UserStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  DISABLED = 'disabled',
}

export interface ExecutionLog {
  id: string;
  timestamp: string;
  botType: string;
  tokenSymbol: string;
  walletName: string;
  stage: string;
  status: 'info' | 'success' | 'error';
  message: string;
  details?: any;
}

export enum BotStatus {
  RUNNING = 'running',
  PAUSED = 'paused',
  STOPPED = 'stopped',
  SEARCHING = 'searching',
  BUYING = 'buying',
  MONITORING = 'monitoring',
  WAITING = 'waiting',
  ERROR = 'error'
}

export enum BotType {
  FRESH = 'fresh',
  HYPE = 'hype',
  AI = 'ai',
  MANUAL = 'manual'
}

export enum WalletMode {
  SIMULATION = 'simulation',
  REAL = 'real',
}

export enum SniperMode {
  FRESH = 'fresh',
  HYPE = 'hype',
  AI = 'ai',
}

export interface TakeProfitLevel {
  percentage: number; // e.g. 50% profit
  sellAmount: number; // e.g. 50% of position
}

export interface SniperSettings {
  enabled: boolean;
  minLiquidity: number;
  maxLiquidity: number;
  maxMarketCap: number;
  minHolders: number;
  maxBuyTax?: number;
  maxSellTax?: number;
  minLpLockMinutes?: number;
  checkMintAuthority: boolean;
  checkFreezeAuthority: boolean;
  autoSell: boolean;
  slippage: number;
  priorityFee: number;
}

export interface IndividualBotSettings {
  enabled: boolean;
  status: BotStatus;
  amountPerTrade: number;
  usePercentage: boolean;
  percentPerTrade: number;
  maxPositions: number;
  maxDailyInvestment: number;
  gasReserve: number;
  stopLoss: number;
  takeProfitLevels: TakeProfitLevel[];
  trailingStop: number;
  minLiquidity: number;
  maxLiquidity: number;
  minMarketCap: number;
  maxMarketCap: number;
  minHolders: number;
  maxRugRisk: number;
  queueEnabled: boolean;
  queueSize: number;
  autoResume: boolean;
  retryFailed: boolean;
  retryAttempts: number;
  stopThreshold: number; // Stop if balance below
  maxSlippage: number;
  priorityFee: number;
  // Fresh Sniper specific
  earlyExitTimeout?: number; // seconds
  minVolumeThreshold?: number;
  minBuysThreshold?: number;
  // Specifics
  minHypeScore?: number;
  minAIConfidence?: number;
  minVolumeGrowth?: number;
  minHolderGrowth?: number;
  allowMultipleEntries?: boolean;
}

export interface BotSettings {
  autoBuy: boolean;
  isHunting: boolean;
  amountPerTrade: number; // Global default
  stopLoss: number; // Global default
  trailingStop: number; // Global default
  takeProfitLevels: TakeProfitLevel[]; // Global default
  trailingTakeProfit: boolean;
  minMarketCap: number;
  gasReserve: number; // Global reserve
  freshBot: IndividualBotSettings;
  hypeBot: IndividualBotSettings;
  aiBot: IndividualBotSettings;
}

export enum WalletType {
  GENERATED = 'generated',
  IMPORTED = 'imported',
  EXTERNAL = 'external',
}

export interface BaseWallet {
  id: string;
  name: string;
  address: string;
  type: WalletType;
  isDefault: boolean;
  botSettings: BotSettings;
  createdAt: string;
}

export interface LiveWallet extends BaseWallet {
  mode: WalletMode.REAL;
  encryptedPrivateKey: string; // Required for live
  iv: string; // Required for live
  balance: number;
  portfolioValue: number;
}

export interface SimulationWallet extends BaseWallet {
  mode: WalletMode.SIMULATION;
  balance: number;
  portfolioValue: number;
}

export type Wallet = LiveWallet | SimulationWallet;

export interface UserProfile {
  uid: string;
  username: string;
  email?: string;
  role: UserRole;
  status: UserStatus;
  accessId?: string;
  passwordHash?: string;
  walletMode: WalletMode;
  wallets: Wallet[];
  activeWalletId: string;
  disabled?: boolean;
  // Legacy fields for compatibility during transition
  simulationBalance: number;
  realBalance?: number;
  realWalletAddress?: string;
  botSettings: BotSettings;
  profiles?: any[];
  currentProfileId?: string;
  analytics: {
    totalPnL: number;
    realizedPnL: number;
    unrealizedPnL: number;
    winRate: number;
    totalTrades: number;
    successRate: number;
    avgReturn: number;
    maxDrawdown: number;
    bestTrade: number;
    worstTrade: number;
    dailyPnL?: number;
    weeklyPnL?: number;
    monthlyPnL?: number;
    lifetimePnL?: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: any;
  action: string;
  adminId: string;
  adminUsername: string;
  targetId?: string;
  targetName?: string;
  details: any;
  ipAddress?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface WalletMetadata {
  address: string;
  userId: string;
  label: string;
  encryptedPrivateKey: string;
  iv: string;
  createdAt: string;
}

export enum ExitReason {
  TAKE_PROFIT = 'Take Profit',
  STOP_LOSS = 'Stop Loss',
  TRAILING_STOP = 'Trailing Stop',
  MANUAL = 'Manual Close',
  EARLY_EXIT = 'Early Exit – Low Market Activity',
  FAILED = 'Transaction Failed',
  BOT_STOPPED = 'User Stopped Bot'
}

export enum TradeStatus {
  PREPARING = 'preparing',
  SUBMITTED = 'submitted',
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  MONITORING = 'monitoring',
  TRAILING_ACTIVE = 'trailing_active',
  TP_PENDING = 'tp_pending',
  SL_PENDING = 'sl_pending',
  SELLING = 'selling',
  EXITING = 'exiting',
  COMPLETED = 'completed'
}

export interface TradeLog {
  timestamp: string;
  event: string;
  txHash?: string;
  price?: number;
}

export interface Trade {
  id: string;
  userId: string;
  walletMode: WalletMode;
  botType: BotType;
  tokenSymbol: string;
  tokenAddress: string;
  tokenName: string;
  tokenLogo?: string;
  type: 'buy' | 'sell';
  amount: number; // SOL invested
  quantity: number; // Token quantity
  price: number; // Entry/Action Price
  entryPrice: number;
  exitPrice?: number;
  exitedAt?: string;
  closeReason?: ExitReason;
  status: TradeStatus;
  timestamp: string;
  boughtAt?: string; // High precision timestamp
  lastActivityCheck?: string;
  volumeObserved?: number;
  buyCountObserved?: number;
  txHash?: string;
  isPaper: boolean;
  walletId: string;
  walletAddress: string;
  fees?: number;
  pnl?: number;
  pnlPercent?: number;
  retryCount?: number;
  maxRetries?: number;
  reason?: string;
  sniperMode?: SniperMode;
  
  // Monitoring Triggers
  stopLossPrice?: number;
  takeProfitLevels?: { percentage: number; sellAmount: number; hit?: boolean; price?: number }[];
  trailingStopActive?: boolean;
  trailingStopDistance?: number; // Percentage
  highestPriceObserved?: number;
  tpLevels?: { percentage: number; sellAmount: number; hit?: boolean; price?: number; txHash?: string }[];
  slPrice?: number;
  tsPrice?: number;
  tsDistance?: number;
  
  // Early Exit Check
  monitoringStartedAt?: string;
  initialVolume?: number;
  initialBuys?: number;
  activityMet?: boolean;
  
  // Live Analytics
  aiScore?: number;
  rugRisk?: string; // Values: Safe, Warning, High Risk, Skipped, etc.
  logs: TradeLog[];
  currentPrice?: number;
}

export interface AISignal {
  id?: string;
  tokenAddress: string;
  tokenSymbol: string;
  tokenName: string;
  tokenLogo?: string;
  marketCap: number;
  score: number;
  hypeScore?: number;
  potential: string; // e.g. "2x-20x"
  recommendation: 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'avoid';
  reasons: string[];
  timestamp: string;
  priceUsd: number;
  bondingCurveProgress?: number; // 0-100
  launchpad?: 'pump' | 'axiom' | 'moonshot';
  holders?: number;
  volume5m?: number;
  volume1h?: number;
  migrated?: boolean;
  migrationTime?: string;
  dex?: string;
  liquidity?: number;
  volume24h?: number;
  txCount5m?: number;
  txCount1h?: number;
  momentumScore?: number;
  liquidityScore?: number;
  holderDistributionScore?: number;
  developerWalletRisk?: number;
  rugRiskScore?: number;
  whaleActivityScore?: number;
  socialMomentumScore?: number;
  overallConfidenceScore?: number;
  riskLevel?: 'low' | 'medium' | 'high';
  suggestedEntry?: number;
  suggestedExit?: number;
  suggestedStopLoss?: number;
}
