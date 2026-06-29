import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import {
  WalletMode,
  Trade,
  UserProfile,
  BotSettings,
  BotType,
  BotStatus,
  IndividualBotSettings,
  AISignal,
  UserRole,
  UserStatus,
  Wallet,
  WalletType,
  TradeStatus,
  ExecutionLog,
  ExitReason,
} from "../types";
import {
  DEFAULT_BOT_SETTINGS,
  createDefaultIndividualBotSettings,
} from "./constants";
import { useWebSocketSignals } from "./WebSocketContext";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import bcrypt from "bcryptjs";
import { encryptData } from "./security";
import { WalletRepository } from "./repository/WalletRepository";
import { LiveWalletService } from "./services/LiveWalletService";
import { SimulationWalletService } from "./services/SimulationWalletService";
import { SwapService } from "./services/SwapService";
import { SimulationTradeEngine } from "./services/SimulationTradeEngine";

export const PurchaseRegistry = {
  hasPurchased: (walletId: string, tokenAddress: string): boolean => {
    const saved = localStorage.getItem('purchase_registry');
    const registry = saved ? JSON.parse(saved) : {};
    return !!registry[walletId]?.[tokenAddress];
  },
  registerPurchase: (walletId: string, tokenAddress: string): boolean => {
    const saved = localStorage.getItem('purchase_registry');
    const registry = saved ? JSON.parse(saved) : {};
    if (!registry[walletId]) registry[walletId] = {};
    if (registry[walletId][tokenAddress]) {
      return false; // Already purchased
    }
    registry[walletId][tokenAddress] = true;
    localStorage.setItem('purchase_registry', JSON.stringify(registry));
    return true;
  },
  resetHistory: (walletId: string) => {
    const saved = localStorage.getItem('purchase_registry');
    const registry = saved ? JSON.parse(saved) : {};
    registry[walletId] = {};
    localStorage.setItem('purchase_registry', JSON.stringify(registry));
  }
};

const USER_STORAGE_KEY = "app_user_data";

interface WalletContextType {
  walletMode: WalletMode;
  setWalletMode: (mode: WalletMode) => void;
  user: UserProfile | null;
  trades: Trade[];
  activeWallet: Wallet | null;
  executionLogs: ExecutionLog[];
  addExecutionLog: (log: Omit<ExecutionLog, "id" | "timestamp">) => void;
  checkAndRegisterPurchase: (walletId: string, tokenAddress: string) => boolean;
  resetPurchaseHistory: (walletId: string) => void;
  resetTradingHistory: () => Promise<void>;
  executeTrade: (
    token: AISignal,
    amount: number,
    type: "buy" | "sell",
    botType: BotType,
    walletId?: string,
  ) => Promise<void>;
  resetSimulation: () => Promise<void>;
  updateSettings: (settings: Partial<BotSettings>) => Promise<void>;
  updateBotSettings: (
    botType: BotType,
    settings: Partial<IndividualBotSettings>,
    walletId?: string,
  ) => Promise<void>;
  restoreBotSettings: (botType: BotType, walletId?: string) => Promise<void>;
  switchWallet: (walletId: string) => Promise<void>;
  createWallet: (
    name: string,
  ) => Promise<{ publicKey: string; privateKey: string }>;
  createSimulationWallet: (name: string, balance: number) => Promise<void>;
  fundSimulationWallet: (walletId: string, amount: number) => Promise<void>;
  importWallet: (name: string, privateKey: string) => Promise<void>;
  revealPrivateKey: (walletId: string, password: string) => Promise<string>;
  renameWallet: (walletId: string, newName: string) => Promise<void>;
  setDefaultWallet: (walletId: string) => Promise<void>;
  toggleBot: (
    botType: BotType,
    status: BotStatus,
    walletId?: string,
  ) => Promise<void>;
  emergencyStop: (botType?: BotType, walletId?: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  approveUser: (username: string, accessKey: string) => Promise<void>;
  login: (
    username: string,
    password: string,
    accessKey: string,
  ) => Promise<void>;
  logout: () => void;
  // Global settings management
  updateGlobalSettings: (settings: any) => Promise<void>;
  // Admin functions
  adminGetAllUsers: () => Promise<UserProfile[]>;
  adminUpdateUser: (uid: string, data: Partial<UserProfile>) => Promise<void>;
  adminCreateUser: (data: Partial<UserProfile>) => Promise<void>;
  adminIssueMockBalance: (uid: string, amount: number) => Promise<void>;
  adminResetBalance: (uid: string) => Promise<void>;
  adminFundSimulationWallet: (
    userId: string,
    walletId: string,
    amount: number,
    reason: string,
  ) => Promise<void>;
  adminGetAuditLogs: () => Promise<any[]>;
  // Trade Management
  closeTrade: (tradeId: string) => Promise<void>;
  updateTradeTriggers: (tradeId: string, triggers: any) => Promise<void>;
  bulkAction: (action: "close" | "cancel", tradeIds: string[]) => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
};

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  useEffect(() => {
    WalletRepository.seedAdmin();
  }, []);

  const [user, setUser] = useState<UserProfile | null>(() => {
    const uid = localStorage.getItem("terminal_user_uid");
    return uid ? WalletRepository.loadUserByUid(uid) : null;
  });

  useEffect(() => {
    if (user) {
      WalletRepository.saveUser(user);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      const authUid = localStorage.getItem("terminal_user_uid");
      if (authUid) {
        const dummyWalletId = `sim_dummy_${Date.now()}`;
        setUser({
          uid: authUid,
          username: "Trader",
          role: UserRole.USER,
          status: UserStatus.APPROVED,
          walletMode: WalletMode.SIMULATION,
          wallets: [
            {
                id: dummyWalletId,
                name: "Default Simulation",
                address: `SIM_${Date.now()}`,
                type: 'generated' as any,
                balance: 1000,
                portfolioValue: 1000,
                isDefault: true,
                mode: WalletMode.SIMULATION,
                createdAt: new Date().toISOString(),
                botSettings: {
                    ...DEFAULT_BOT_SETTINGS,
                    freshBot: { ...DEFAULT_BOT_SETTINGS.freshBot },
                    hypeBot: { ...DEFAULT_BOT_SETTINGS.hypeBot },
                    aiBot: { ...DEFAULT_BOT_SETTINGS.aiBot }
                } as any
            }
          ],
          activeWalletId: dummyWalletId,
          simulationBalance: 1000,
          botSettings: DEFAULT_BOT_SETTINGS,
          analytics: { totalPnL: 0, realizedPnL: 0, unrealizedPnL: 0, winRate: 0, totalTrades: 0, successRate: 0, avgReturn: 0, maxDrawdown: 0, bestTrade: 0, worstTrade: 0 },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }
  }, [user]);

  const [trades, setTrades] = useState<Trade[]>(() => {
    const saved = localStorage.getItem('trades_state');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('trades_state', JSON.stringify(trades));
  }, [trades]);

  const updateSimulationBalance = useCallback((walletId: string, newBalance: number, reason: string) => {
    setUser((prev) => {
      if (!prev) return prev;
      const wallet = prev.wallets.find(w => w.id === walletId);
      const isSimulation = wallet?.mode === WalletMode.SIMULATION || walletId.startsWith('sim_') || prev.walletMode === WalletMode.SIMULATION;
      const oldBalance = wallet ? wallet.balance : 0;
      
      console.log(`[Unified Balance Setter] Balance transition initiated:`);
      console.log(`  - Wallet ID: ${walletId} (${wallet?.name || 'Unknown'})`);
      console.log(`  - Is Simulation: ${isSimulation}`);
      console.log(`  - Reason: ${reason}`);
      console.log(`  - Old Wallet Balance: ${oldBalance} SOL`);
      console.log(`  - New Wallet Balance: ${newBalance} SOL`);
      console.log(`  - Old User simulationBalance: ${prev.simulationBalance} SOL`);

      const updatedWallets = prev.wallets.map((w) =>
        w.id === walletId ? { ...w, balance: newBalance } : w
      );

      let nextSimulationBalance = prev.simulationBalance;
      if (isSimulation) {
        if (walletId === prev.activeWalletId) {
          nextSimulationBalance = newBalance;
        }
      }
      
      console.log(`  - New User simulationBalance: ${nextSimulationBalance} SOL`);

      return {
        ...prev,
        wallets: updatedWallets,
        simulationBalance: nextSimulationBalance
      };
    });
  }, []);

  const [walletMode, setWalletMode] = useState<WalletMode>(
    WalletMode.SIMULATION,
  );
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([]);
  const [purchaseRegistry, setPurchaseRegistry] = useState<Record<string, Record<string, boolean>>>(() => {
    const saved = localStorage.getItem('purchase_registry');
    return saved ? JSON.parse(saved) : {};
  });
  const executingPurchases = useRef<Set<string>>(new Set());

  const checkAndRegisterPurchase = useCallback((walletId: string, tokenAddress: string) => {
    const registered = PurchaseRegistry.registerPurchase(walletId, tokenAddress);
    if (registered) {
      const saved = localStorage.getItem('purchase_registry');
      setPurchaseRegistry(saved ? JSON.parse(saved) : {});
    }
    return registered;
  }, []);

  const addExecutionLog = useCallback(
    (log: Omit<ExecutionLog, "id" | "timestamp">) => {
      setExecutionLogs((prev) =>
        [
          {
            ...log,
            id: `log_${Date.now()}_${performance.now().toString().replace('.', '')}`,
            timestamp: new Date().toISOString(),
          },
          ...prev,
        ].slice(0, 100),
      ); // Keep last 100 logs
    },
    [],
  );

  const resetPurchaseHistory = useCallback((walletId: string) => {
    PurchaseRegistry.resetHistory(walletId);
    const saved = localStorage.getItem('purchase_registry');
    setPurchaseRegistry(saved ? JSON.parse(saved) : {});
  }, []);

  const resetTradingHistory = useCallback(async () => {
    if (!user) return;

    setTrades([]);
    localStorage.removeItem('trades_state');

    user.wallets.forEach((w) => {
      PurchaseRegistry.resetHistory(w.id);
    });
    const savedRegistry = localStorage.getItem('purchase_registry');
    setPurchaseRegistry(savedRegistry ? JSON.parse(savedRegistry) : {});

    const defaultAnalytics = {
      totalPnL: 0,
      realizedPnL: 0,
      unrealizedPnL: 0,
      winRate: 0,
      totalTrades: 0,
      successRate: 0,
      avgReturn: 0,
      maxDrawdown: 0,
      bestTrade: 0,
      worstTrade: 0,
      dailyPnL: 0,
      weeklyPnL: 0,
      monthlyPnL: 0,
      lifetimePnL: 0
    };

    setUser((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        analytics: defaultAnalytics
      };
    });

    addExecutionLog({
      botType: BotType.MANUAL,
      tokenSymbol: "ALL",
      walletName: "ALL",
      stage: "Reset",
      status: "success",
      message: "Trading history, bot statistics, and purchase registry cleared successfully.",
    });

    console.log(`[Admin Audit] Trading history and purchase registry reset by user: ${user.username}`);
  }, [user, addExecutionLog]);

  const { signals } = useWebSocketSignals();
  const monitoringRef = useRef<Set<string>>(new Set());

  const activeWallet = useMemo(() => {
    return (
      user?.wallets?.find((w) => w.id === user.activeWalletId) ||
      user?.wallets?.[0] ||
      null
    );
  }, [user?.wallets, user?.activeWalletId]);

  // Firebase functions stubbed
  const createAuditLog = async (
    action: string,
    details: any,
    targetId?: string,
    targetName?: string,
    severity: "low" | "medium" | "high" | "critical" = "low",
  ) => {
    console.log("Audit log:", {
      action,
      details,
      targetId,
      targetName,
      severity,
    });
  };

  // Seed SUPER_ADMIN stubbed
  useEffect(() => {}, []);

  // Sync user profile stubbed
  useEffect(() => {}, []);

  // Live Portfolio & Analytics Aggregator
  useEffect(() => {
    // Analytics functionality disabled due to Firestore removal
  }, [trades, signals, user?.uid]); // Use uid to prevent loop if user object changes slightly

  const processedTokens = useRef<Set<string>>(new Set());

  const executeTrade = useCallback(
    async (
      token: AISignal,
      amount: number,
      type: "buy" | "sell",
      botType: BotType,
      walletId?: string,
      closeReason: ExitReason = ExitReason.MANUAL,
    ) => {
      try {
        console.log(`[1] Buy signal received for token ${token.tokenSymbol} (${token.tokenAddress})`);
        console.log(`[2] executeTrade() entered. Parameters: amount=${amount}, type=${type}, botType=${botType}, walletId=${walletId}`);
        
        if (!user) {
          console.warn("[Audit Early Exit] File: WalletContext.tsx, Function: executeTrade, Line: 360, Condition: !user, Reason: No active session user found.");
          return;
        }
        
        const targetWalletId = walletId || user.activeWalletId;
        const targetWallet = user.wallets.find((w) => w.id === targetWalletId);
        
        if (!targetWallet) {
          console.error(`[Audit Early Exit] File: WalletContext.tsx, Function: executeTrade, Line: 367, Condition: !targetWallet, Reason: Target wallet ID ${targetWalletId} not found in user wallets list.`);
          console.error(`Available wallet IDs:`, user.wallets.map(w => w.id));
          return;
        }
        console.log(`[3] Active wallet found: "${targetWallet.name}" (ID: ${targetWallet.id})`);

        const isSimulationBuy = walletMode === WalletMode.SIMULATION || ('mode' in targetWallet && targetWallet.mode === WalletMode.SIMULATION) || ('walletMode' in targetWallet && (targetWallet as any).walletMode === WalletMode.SIMULATION);
        console.log(`[4] Wallet type = ${isSimulationBuy ? "Simulation" : "Real"}`);

        if (!token.priceUsd || token.priceUsd <= 0) {
          console.error(`[Audit Early Exit] File: WalletContext.tsx, Function: executeTrade, Line: 372, Condition: !token.priceUsd || token.priceUsd <= 0, Reason: Invalid price value: ${token.priceUsd}`);
          const msg = "Live market data unavailable for token";
          addExecutionLog({
            botType,
            tokenSymbol: token.tokenSymbol,
            walletName: targetWallet.name,
            stage: "Validation",
            status: "error",
            message: msg,
          });
          throw new Error(msg);
        }
        console.log(`[5] Trade amount validated: ${amount}`);
        console.log(`[6] Live price fetched: ${token.priceUsd}`);

        if (type === "buy") {
          // --- PURCHASE REGISTRY DOUBLE CHECK ---
          if (PurchaseRegistry.hasPurchased(targetWalletId, token.tokenAddress)) {
            addExecutionLog({
              botType,
              tokenSymbol: token.tokenSymbol,
              walletName: targetWallet.name,
              stage: "Validation",
              status: "error",
              message: "Buy skipped: token has already been purchased by this wallet.",
            });
            console.log(`[Audit Early Exit] File: WalletContext.tsx, Function: executeTrade, Line: 388, Condition: PurchaseRegistry.hasPurchased, Reason: Duplicate purchase skipped for ${token.tokenSymbol} in wallet ${targetWallet.name}`);
            return;
          }

          addExecutionLog({
            botType,
            tokenSymbol: token.tokenSymbol,
            walletName: targetWallet.name,
            stage: "Bot Trigger",
            status: "info",
            message: "Initiating buy sequence",
          });

          const purchaseLockKey = `${targetWalletId}:${token.tokenAddress}`;
          if (executingPurchases.current.has(purchaseLockKey)) {
            console.error(`[Audit Early Exit] File: WalletContext.tsx, Function: executeTrade, Line: 411, Condition: executingPurchases.current.has, Reason: Lock active for purchase key ${purchaseLockKey}`);
            throw new Error("Purchase in progress. Please wait.");
          }
          
          executingPurchases.current.add(purchaseLockKey);
          
          try {
            if (!checkAndRegisterPurchase(targetWalletId, token.tokenAddress)) {
              addExecutionLog({
                botType,
                tokenSymbol: token.tokenSymbol,
                walletName: targetWallet.name,
                stage: "Validation",
                status: "error",
                message: "Buy skipped: token has already been purchased by this wallet.",
              });
              console.log(`[Audit Early Exit] File: WalletContext.tsx, Function: executeTrade, Line: 418, Condition: !checkAndRegisterPurchase, Reason: Already registered as purchased.`);
              return;
            }

            if (isSimulationBuy) {
              try {
                console.log(`[7] SimulationTradeEngine called for simulation execution`);
                const { trade: newTrade, cost } = SimulationTradeEngine.executeBuy(
                  token,
                  amount,
                  targetWallet,
                  botType,
                  addExecutionLog,
                );
                
                newTrade.userId = user.uid;
                console.log(`[8] Position object created: ID=${newTrade.id}`);
                
                // Logging for verification
                const balanceBefore = targetWallet.balance;
                const balanceAfter = balanceBefore - cost;
                console.log(`[9] Wallet debited: Balance Before=${balanceBefore}, Cost=${cost}, Balance After=${balanceAfter}`);
                console.log(`[Trade Open] ID: ${newTrade.id} (SIM), Wallet: ${targetWalletId}, Token: ${token.tokenSymbol}, Balance Before: ${balanceBefore}, Balance After: ${balanceAfter}, Cost: ${cost}`);
                
                console.log(`[10] Position stored: Saving trade to trades state array`);
                setTrades((prev) => [...prev, newTrade]);

                updateSimulationBalance(targetWalletId, balanceAfter, `Simulation Buy: ${token.tokenSymbol} - Cost: ${cost} SOL (Bot: ${botType})`);
                
                console.log(`[11] Live Trades updated: Trade stored in memory and synchronized with localStorage.`);
                console.log(`[12] Exit Engine registered: Real-time loop is actively scanning for exit/take profit triggers.`);
                return;
              } catch (err: any) {
                addExecutionLog({
                  botType,
                  tokenSymbol: token.tokenSymbol,
                  walletName: targetWallet.name,
                  stage: "Execution",
                  status: "error",
                  message: `Simulation trade aborted: ${err.message}`,
                });
                console.error(`[Simulation Trade Aborted] Stack:`, err.stack);
                throw err;
              }
            }
          } finally {
            executingPurchases.current.delete(purchaseLockKey);
          }

          // Real Buy Logic
          const currentBal = targetWallet.balance;
          const priorityFee = targetWallet.botSettings?.gasReserve || 0.0001;
          if (currentBal < amount + priorityFee) {
            addExecutionLog({
              botType,
              tokenSymbol: token.tokenSymbol,
              walletName: targetWallet.name,
              stage: "Balance Check",
              status: "error",
              message: `Insufficient SOL. Required: ${amount + priorityFee}, Available: ${currentBal}`,
            });
            throw new Error(`Insufficient balance in ${targetWallet.name}`);
          }

          let entryPrice = token.priceUsd;
          let fees = amount * 0.01;
          let quantity = (amount - fees) / entryPrice;
          let totalCost = amount + priorityFee;

          // Build transaction quote
          let quote = await SwapService.getQuote(
            "So11111111111111111111111111111111111111112",
            token.tokenAddress,
            amount * 1e9,
            100,
          );

          const txHash = `tx_${Date.now()}_${performance.now().toString().replace('.', '')}`;
          const tradeId = `trade_${Date.now()}_${performance.now().toString().replace('.', '')}`;
          
          let tp = targetWallet.botSettings?.takeProfitLevels?.[0]?.percentage || 50;
          let sl = targetWallet.botSettings?.stopLoss || 20;
          let ts = targetWallet.botSettings?.trailingStop || 0;
      
          if (botType === BotType.FRESH) {
            if (targetWallet.botSettings?.freshBot?.takeProfitLevels?.length > 0) tp = targetWallet.botSettings.freshBot.takeProfitLevels[0].percentage;
            if (targetWallet.botSettings?.freshBot?.stopLoss) sl = targetWallet.botSettings.freshBot.stopLoss;
            if (targetWallet.botSettings?.freshBot?.trailingStop) ts = targetWallet.botSettings.freshBot.trailingStop;
          } else if (botType === BotType.HYPE) {
            if (targetWallet.botSettings?.hypeBot?.takeProfitLevels?.length > 0) tp = targetWallet.botSettings.hypeBot.takeProfitLevels[0].percentage;
            if (targetWallet.botSettings?.hypeBot?.stopLoss) sl = targetWallet.botSettings.hypeBot.stopLoss;
            if (targetWallet.botSettings?.hypeBot?.trailingStop) ts = targetWallet.botSettings.hypeBot.trailingStop;
          } else if (botType === BotType.AI) {
            if (targetWallet.botSettings?.aiBot?.takeProfitLevels?.length > 0) tp = targetWallet.botSettings.aiBot.takeProfitLevels[0].percentage;
            if (targetWallet.botSettings?.aiBot?.stopLoss) sl = targetWallet.botSettings.aiBot.stopLoss;
            if (targetWallet.botSettings?.aiBot?.trailingStop) ts = targetWallet.botSettings.aiBot.trailingStop;
          }

          const newTrade: Trade = {
            id: tradeId,
            userId: user.uid,
            walletId: targetWalletId,
            walletAddress: targetWallet.address,
            walletMode,
            botType,
            tokenSymbol: token.tokenSymbol,
            tokenAddress: token.tokenAddress,
            tokenName: token.tokenName,
            tokenLogo: token.tokenLogo || "",
            type: "buy",
            amount: totalCost,
            quantity,
            price: entryPrice,
            entryPrice,
            status: TradeStatus.MONITORING,
            timestamp: new Date().toISOString(),
            boughtAt: new Date().toISOString(),
            lastActivityCheck: new Date().toISOString(),
            isPaper: false,
            fees,
            txHash,
            stopLossPrice: entryPrice * (1 - sl / 100),
            takeProfitLevels: [{ percentage: tp, sellAmount: 100, price: entryPrice * (1 + tp / 100) }],
            trailingStopActive: ts > 0,
            trailingStopDistance: ts,
            highestPriceObserved: entryPrice,
            logs: [
              {
                timestamp: new Date().toISOString(),
                event: `Position Opened: ${(botType || "manual").toUpperCase()} BOT`,
                price: entryPrice,
              },
            ],
            currentPrice: entryPrice,
            aiScore: token.score,
            rugRisk: "Safe",
            maxRetries: 3,
            retryCount: 0,
            initialVolume: token.volume5m || 0,
            initialBuys: token.txCount5m || 0,
            monitoringStartedAt: new Date().toISOString(),
          };

          const balanceBefore = targetWallet.balance;
          const balanceAfter = balanceBefore - totalCost;
          console.log(`[Trade Open] ID: ${tradeId} (REAL), Wallet: ${targetWalletId}, Token: ${token.tokenSymbol}, Balance Before: ${balanceBefore}, Balance After: ${balanceAfter}, Cost: ${totalCost}`);

          setTrades((prev) => [...prev, newTrade]);
          addExecutionLog({
            botType,
            tokenSymbol: token.tokenSymbol,
            walletName: targetWallet.name,
            stage: "Position",
            status: "success",
            message: "Open position created & Sell Engine registered",
          });

          setUser((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              wallets: prev.wallets.map((w) =>
                w.id === targetWalletId
                  ? { ...w, balance: balanceAfter }
                  : w,
              ),
            };
          });

        } else if (type === "sell") {
          addExecutionLog({
            botType,
            tokenSymbol: token.tokenSymbol,
            walletName: targetWallet.name,
            stage: "Bot Trigger",
            status: "info",
            message: "Initiating sell sequence",
          });

          const existingPositionIndex = trades.findIndex(
            (t) =>
              t.walletId === targetWalletId &&
              t.tokenAddress === token.tokenAddress &&
              t.status === TradeStatus.MONITORING,
          );

          if (existingPositionIndex === -1) {
            const msg = "No active position to sell";
            addExecutionLog({
              botType,
              tokenSymbol: token.tokenSymbol,
              walletName: targetWallet.name,
              stage: "Validation",
              status: "error",
              message: msg,
            });
            console.warn(`[Audit Early Exit] File: WalletContext.tsx, Function: executeTrade (sell), Line: 634, Condition: existingPositionIndex === -1, Reason: No active open trade found to close/sell for token ${token.tokenSymbol}`);
            return;
          }

          const position = trades[existingPositionIndex];

          // Optimistic state lock to prevent duplicate sells
          setTrades((prev) =>
            prev.map((t) =>
              t.id === position.id ? { ...t, status: TradeStatus.COMPLETED } : t
            )
          );

          const isSimulationSell = walletMode === WalletMode.SIMULATION || ('mode' in targetWallet && targetWallet.mode === WalletMode.SIMULATION) || ('walletMode' in targetWallet && (targetWallet as any).walletMode === WalletMode.SIMULATION);
          
          if (isSimulationSell) {
            const { updatedTrade, returnAmount } = SimulationTradeEngine.executeSell(
              position,
              token,
              targetWallet,
              botType,
              closeReason,
              addExecutionLog,
            );

            const balanceBefore = targetWallet.balance;
            const balanceAfter = balanceBefore + returnAmount;
            console.log(`[Trade Closed] ID: ${position.id} (SIM), Reason: ${closeReason}, Wallet ID: ${targetWalletId}, Balance Before: ${balanceBefore}, Balance After: ${balanceAfter}, Return Amount: ${returnAmount}`);

            setTrades((prev) =>
              prev.map((t) =>
                t.id === position.id ? updatedTrade : t,
              ),
            );

            updateSimulationBalance(targetWalletId, balanceAfter, `Simulation Sell: ${token.tokenSymbol} - Return: ${returnAmount} SOL, Reason: ${closeReason}`);

            addExecutionLog({
              botType,
              tokenSymbol: token.tokenSymbol,
              walletName: targetWallet.name,
              stage: "Position",
              status: "success",
              message: `Paper position closed. PnL: ${updatedTrade.pnlPercent?.toFixed(2)}%`,
            });
            return;
          }

          // Real Sell Logic
          const sellAmountTokens = position.quantity;
          const currentPrice = token.priceUsd;
          const grossExitValue = sellAmountTokens * currentPrice;
          const exitFees = grossExitValue * 0.01;
          const netResult = grossExitValue - exitFees;

          const pnl = netResult - position.amount;
          const pnlPercent = (pnl / position.amount) * 100;

          const balanceBefore = targetWallet.balance;
          const balanceAfter = balanceBefore + netResult;
          console.log(`[Trade Closed] ID: ${position.id} (REAL), Reason: ${closeReason}, Wallet ID: ${targetWalletId}, Balance Before: ${balanceBefore}, Balance After: ${balanceAfter}, Net Result: ${netResult}`);

          const updatedTrade: Trade = {
            ...position,
            status: TradeStatus.COMPLETED,
            exitedAt: new Date().toISOString(),
            exitPrice: currentPrice,
            pnl,
            pnlPercent,
            closeReason,
          };

          setTrades((prev) =>
            prev.map((t) =>
              t.id === position.id ? updatedTrade : t,
            ),
          );

          addExecutionLog({
            botType,
            tokenSymbol: token.tokenSymbol,
            walletName: targetWallet.name,
            stage: "Position",
            status: "success",
            message: `Position closed. PnL: ${pnlPercent.toFixed(2)}%`,
          });

          setUser((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              wallets: prev.wallets.map((w) =>
                w.id === targetWalletId
                  ? { ...w, balance: balanceAfter }
                  : w,
              ),
            };
          });
        }
      } catch (err: any) {
        console.error("[executeTrade] Uncaught error during trade execution:", err);
        addExecutionLog({
          botType,
          tokenSymbol: token.tokenSymbol,
          walletName: user?.wallets?.find(w => w.id === (walletId || user?.activeWalletId))?.name || "Unknown",
          stage: "Execution Error",
          status: "error",
          message: err.message || "Unknown error occurred",
        });
      }
    },
    [user, walletMode, trades, addExecutionLog, checkAndRegisterPurchase],
  );

  // Automation Engine
  useEffect(() => {
    if (!user || !signals.length) return;

    const runBot = async (
      botType: BotType,
      bot: IndividualBotSettings,
      wallet: Wallet,
    ) => {
      if (!bot || !bot.enabled || bot.status !== BotStatus.RUNNING) return;

      console.log(`[Sniper Engine] ${botType} Sniper active on wallet ${wallet.name}. Mode: ${walletMode}. Evaluating ${signals.length} signals...`);

      // Filter eligible tokens based on bot-specific criteria
      const eligibleSignals = signals.filter((s) => {
        if (
          processedTokens.current.has(
            `${wallet.id}_${botType}_${s.tokenAddress}`,
          )
        )
          return false;

        // Customizable minimum & maximum market cap checks for all tokens to be sniped (all bot types)
        if (s.marketCap !== undefined) {
          if (bot.minMarketCap !== undefined && s.marketCap < bot.minMarketCap) return false;
          if (bot.maxMarketCap !== undefined && s.marketCap > bot.maxMarketCap) return false;
        }

        // Fresh Sniper: Minimal checks for speed - Objective: enter newly launched tokens as quickly as possible
        if (botType === BotType.FRESH) {
          // Detect newly launched tokens from supported launchpad integrations
          const isNewLaunch = s.launchpad && (s.bondingCurveProgress || 0) < 10;
          if (!isNewLaunch) return false;

          // Minimum required safety checks
          // Honeypot detection (where technically supported) - rugRiskScore used as proxy
          if (s.rugRiskScore && s.rugRiskScore > bot.maxRugRisk) return false;
        } else {
          // Standard filters for non-fresh bots (AI, Hype)
          if (s.liquidity && s.liquidity < bot.minLiquidity) return false;
          if (s.holders && s.holders < bot.minHolders) return false;
          if (s.rugRiskScore && s.rugRiskScore > bot.maxRugRisk) return false;
        }

        // Type specific filters
        if (
          botType === BotType.HYPE &&
          (s.hypeScore || 0) < (bot.minHypeScore || 0)
        )
          return false;
        if (
          botType === BotType.AI &&
          (s.overallConfidenceScore || 0) < (bot.minAIConfidence || 0)
        )
          return false;

        return true;
      });

      if (eligibleSignals.length > 0) {
        console.log(`[Sniper Engine] ${botType} found ${eligibleSignals.length} eligible signals!`);
      }

      for (const token of eligibleSignals) {
        // Immediate buy attempt for eligible launches
        // Check capacity
        const activeBotTrades = trades.filter(
          (t) =>
            t.walletId === wallet.id &&
            t.botType === botType &&
            t.status === TradeStatus.MONITORING,
        );
        if (activeBotTrades.length >= bot.maxPositions) continue;

        // Check balance (Sufficient wallet balance)
        if (wallet.balance - bot.amountPerTrade < bot.gasReserve) continue;

        try {
          processedTokens.current.add(
            `${wallet.id}_${botType}_${token.tokenAddress}`,
          );
          await executeTrade(
            token,
            bot.amountPerTrade,
            "buy",
            botType,
            wallet.id,
          );
          console.log(
            `[${botType}] Successfully sniped ${token.tokenSymbol} on wallet ${wallet.name}`,
          );
        } catch (err) {
          console.error(
            `[${botType}] Snipe failed for ${token.tokenSymbol}:`,
            err,
          );
        }
      }
    };

    // Run bots for all wallets that have them enabled
    user?.wallets?.forEach((wallet) => {
      if (!wallet.botSettings) return;
      if (wallet.botSettings.freshBot)
        runBot(BotType.FRESH, wallet.botSettings.freshBot, wallet);
      if (wallet.botSettings.hypeBot)
        runBot(BotType.HYPE, wallet.botSettings.hypeBot, wallet);
      if (wallet.botSettings.aiBot)
        runBot(BotType.AI, wallet.botSettings.aiBot, wallet);
    });
  }, [signals, trades, user, walletMode, executeTrade]);

  // Real-time Monitoring Loop
  const executingSells = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user || trades.length === 0 || signals.length === 0) return;

    let needsTradeUpdate = false;
    let nextTrades = [...trades];

    for (let i = 0; i < nextTrades.length; i++) {
      const trade = nextTrades[i];
      if (trade.status !== TradeStatus.MONITORING) continue;

      const latestSignal = signals.find(
        (s) => s.tokenAddress === trade.tokenAddress,
      );
      if (!latestSignal) continue;

      const currentPrice = latestSignal.priceUsd;
      const currentVal = trade.quantity * currentPrice;
      const profitSOL = currentVal - trade.amount;
      const roiPercent = (profitSOL / trade.amount) * 100;

      let updatedTrade = { ...trade };
      let changed = false;

      if (
        currentPrice !== trade.currentPrice ||
        roiPercent !== trade.pnlPercent
      ) {
        if (currentPrice !== trade.currentPrice) {
          updatedTrade.lastActivityCheck = new Date().toISOString();
        }
        updatedTrade.currentPrice = currentPrice;
        updatedTrade.pnl = profitSOL;
        updatedTrade.pnlPercent = roiPercent;
        changed = true;
      }

      if (currentPrice > trade.highestPriceObserved) {
        updatedTrade.highestPriceObserved = currentPrice;
        changed = true;
      }

      if (changed) {
        nextTrades[i] = updatedTrade;
        needsTradeUpdate = true;
      }

      // Check Sell Conditions
      const targetWallet = user.wallets.find((w) => w.id === trade.walletId);
      if (!targetWallet) continue;

      if (!executingSells.current.has(trade.id)) {
        let trigger = false;
        let message = "";

        // Calculate Trailing Stop (highest price - ts percentage of highest price)
        if (trade.trailingStopDistance && trade.trailingStopDistance > 0 && trade.highestPriceObserved) {
          const trailingStopPrice = trade.highestPriceObserved * (1 - trade.trailingStopDistance / 100);
          if (currentPrice <= trailingStopPrice && currentPrice > 0) {
            trigger = true;
            message = `Trailing Stop triggered at ${roiPercent.toFixed(2)}% (Dropped ${trade.trailingStopDistance}% from highest observed)`;
          }
        }

        const tp = trade.takeProfitLevels?.[0]?.percentage || 50;
        const tpPrice = trade.entryPrice * (1 + tp / 100);

        if (!trigger && currentPrice >= tpPrice) {
          trigger = true;
          message = `Take Profit triggered at ${roiPercent.toFixed(2)}%`;
        } else if (!trigger && trade.stopLossPrice && currentPrice <= trade.stopLossPrice) {
          trigger = true;
          message = `Stop Loss triggered at ${roiPercent.toFixed(2)}%`;
        }

        // Check 25s Inactivity Auto-Sell condition (price has not changed / no activity)
        const lastActiveTime = updatedTrade.lastActivityCheck || updatedTrade.monitoringStartedAt || updatedTrade.timestamp;
        const inactiveMs = Date.now() - new Date(lastActiveTime).getTime();

        if (!trigger && inactiveMs >= 25000) {
          trigger = true;
          message = `Inactivity Auto-Sell triggered at ${roiPercent.toFixed(2)}% (25s of price/market inactivity)`;
        }

        if (trigger) {
          let reasonEnum = ExitReason.MANUAL;
          if (message.includes("Take Profit"))
            reasonEnum = ExitReason.TAKE_PROFIT;
          else if (message.includes("Stop Loss"))
            reasonEnum = ExitReason.STOP_LOSS;
          else if (message.includes("Trailing Stop"))
            reasonEnum = ExitReason.TRAILING_STOP;
          else if (message.includes("Inactivity"))
            reasonEnum = ExitReason.EARLY_EXIT;

          executingSells.current.add(trade.id);
          addExecutionLog({
            botType: trade.botType,
            tokenSymbol: trade.tokenSymbol,
            walletName: targetWallet.name,
            stage: "Sell Engine",
            status: "info",
            message,
          });
          executeTrade(
            latestSignal,
            0,
            "sell",
            trade.botType,
            trade.walletId,
            reasonEnum,
          ).catch((err) => {
            executingSells.current.delete(trade.id);
          });
        }
      }
    }

    if (needsTradeUpdate) {
      setTrades((prev) => {
        const updated = [...prev];
        for (let i = 0; i < updated.length; i++) {
          const nextTrade = nextTrades.find((t) => t.id === updated[i].id);
          // Only update if the trade is still MONITORING in the current state
          // This prevents overwriting trades that were just sold (COMPLETED)
          if (nextTrade && updated[i].status === TradeStatus.MONITORING) {
            updated[i] = nextTrade;
          }
        }
        return updated;
      });
    }
  }, [signals, trades, user, addExecutionLog, executeTrade]);

  // --- Trade Management Stubbed ---
  const closeTrade = async (tradeId: string) => {
    console.log("Close trade (stubbed):", tradeId);
  };

  const updateTradeTriggers = async (tradeId: string, triggers: any) => {
    console.log("Update trade triggers (stubbed):", tradeId, triggers);
  };

  const switchWallet = async (walletId: string) => {
    if (!user) return;
    setUser((prev) => {
      if (!prev) return prev;
      const wallet = prev.wallets.find((w) => w.id === walletId);
      const isSimulation = wallet?.mode === WalletMode.SIMULATION || walletId.startsWith('sim_') || prev.walletMode === WalletMode.SIMULATION;
      const nextSimulationBalance = isSimulation && wallet ? wallet.balance : prev.simulationBalance;
      
      console.log(`[Unified Balance Setter] Switched Active Wallet to: ${walletId} (${wallet?.name || 'Unknown'})`);
      console.log(`  - Is Simulation: ${isSimulation}`);
      console.log(`  - Target Wallet Balance: ${wallet ? wallet.balance : 0} SOL`);
      console.log(`  - Set user.simulationBalance to: ${nextSimulationBalance} SOL`);
      
      return { 
        ...prev, 
        activeWalletId: walletId,
        simulationBalance: nextSimulationBalance
      };
    });
  };

  const createWallet = async (name: string) => {
    if (!user) throw new Error("Not logged in");

    const newWallet = LiveWalletService.createWallet(name);
    newWallet.botSettings = JSON.parse(JSON.stringify(DEFAULT_BOT_SETTINGS));
    WalletRepository.addWallet(user.uid, newWallet);

    setUser((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        wallets: [...prev.wallets, newWallet],
        activeWalletId:
          prev.wallets.length === 0 ? newWallet.id : prev.activeWalletId,
      };
    });

    return { publicKey: newWallet.address, privateKey: "hidden" }; // Private key should not be returned like this in production
  };

  const createSimulationWallet = async (name: string, balance: number) => {
    if (!user) throw new Error("Not logged in");

    const newWallet = SimulationWalletService.createWallet(
      name,
      user.uid,
      balance,
    );
    newWallet.botSettings = JSON.parse(JSON.stringify(DEFAULT_BOT_SETTINGS));
    WalletRepository.addWallet(user.uid, newWallet);

    setUser((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        wallets: [...prev.wallets, newWallet],
        activeWalletId:
          prev.wallets.length === 0 ? newWallet.id : prev.activeWalletId,
      };
    });
  };

  const fundSimulationWallet = async (walletId: string, amount: number) => {
    if (!user) throw new Error("Not logged in");
    const isAdmin =
      user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;
    if (!isAdmin) throw new Error("Unauthorized");

    const targetWallet = user.wallets.find((w) => w.id === walletId);
    if (!targetWallet) throw new Error("Wallet not found");

    WalletRepository.fundSimulationWallet(
      user.uid,
      walletId,
      amount,
      user.username,
      "Manual adjustment",
    );

    const nextBalance = targetWallet.balance + amount;
    updateSimulationBalance(walletId, nextBalance, `Manual adjustment / funding - Amount added: ${amount} SOL`);
  };

  const importWallet = async (name: string, privateKey: string) => {
    if (!user) throw new Error("Not logged in");

    const newWallet = LiveWalletService.importWallet(name, privateKey);
    WalletRepository.addWallet(user.uid, newWallet);

    setUser((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        wallets: [...prev.wallets, newWallet],
        activeWalletId:
          prev.wallets.length === 0 ? newWallet.id : prev.activeWalletId,
      };
    });
  };

  const revealPrivateKey = async (
    walletId: string,
    password: string,
  ): Promise<string> => {
    if (!user) throw new Error("Not logged in");

    const passwordMatch = await bcrypt.compare(
      password,
      user.passwordHash || "",
    );
    if (!passwordMatch) throw new Error("Invalid password");

    const wallet = user.wallets.find((w) => w.id === walletId) as any;
    if (!wallet || wallet.mode !== WalletMode.REAL)
      throw new Error("Wallet not found or not a live wallet");

    // Decrypt
    return atob(wallet.encryptedPrivateKey);
  };

  const renameWallet = async (walletId: string, newName: string) => {
    if (!user) return;
    setUser((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        wallets: prev.wallets.map((w) =>
          w.id === walletId ? { ...w, name: newName } : w,
        ),
      };
    });
  };

  const setDefaultWallet = async (walletId: string) => {
    if (!user) return;
    setUser((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        wallets: prev.wallets.map((w) => ({
          ...w,
          isDefault: w.id === walletId,
        })),
      };
    });
  };

  const bulkAction = async (action: "close" | "cancel", tradeIds: string[]) => {
    console.log("Bulk action (stubbed):", action, tradeIds);
  };

  const resetSimulation = async () => {
    console.log("Reset simulation (stubbed)");
  };

  const updateSettings = async (settings: Partial<BotSettings>) => {
    console.log("Update settings (stubbed):", settings);
  };

  const updateBotSettings = async (
    botType: BotType,
    settings: Partial<IndividualBotSettings>,
    walletId?: string,
  ) => {
    if (!user) return;
    setUser((prev) => {
      if (!prev) return prev;
      const targetWalletId = walletId || prev.activeWalletId;
      return {
        ...prev,
        wallets: prev.wallets.map((w) => {
          if (w.id === targetWalletId) {
            const newBotSettings = { ...w.botSettings };
            if (botType === BotType.FRESH)
              newBotSettings.freshBot = {
                ...newBotSettings.freshBot,
                ...settings,
              };
            if (botType === BotType.HYPE)
              newBotSettings.hypeBot = { ...newBotSettings.hypeBot, ...settings };
            if (botType === BotType.AI)
              newBotSettings.aiBot = { ...newBotSettings.aiBot, ...settings };
            return { ...w, botSettings: newBotSettings };
          }
          return w;
        }),
      };
    });
  };

  const restoreBotSettings = async (botType: BotType, walletId?: string) => {
    if (!user) return;
    const targetWalletId = walletId || user.activeWalletId;
    const defaults = createDefaultIndividualBotSettings(botType);
    await updateBotSettings(botType, defaults, targetWalletId);
  };

  const toggleBot = async (
    botType: BotType,
    status: BotStatus,
    walletId?: string,
  ) => {
    const enabled = status !== BotStatus.STOPPED;
    await updateBotSettings(botType, { status, enabled }, walletId);
  };

  const emergencyStop = async (botType?: BotType, walletId?: string) => {
    console.log("Emergency stop (stubbed):", botType, walletId);
  };

  const setWalletModeAndPersist = async (mode: WalletMode) => {
    setWalletMode(mode);
    console.log("Set wallet mode (stubbed):", mode);
  };

  const register = async (username: string, password: string) => {
    await WalletRepository.registerUser(username, password);
  };

  const approveUser = async (username: string, accessKey: string) => {
    await WalletRepository.approveUser(username, accessKey);
  };

  const login = async (
    username: string,
    password: string,
    accessKey: string,
  ) => {
    const user = await WalletRepository.verifyLogin(
      username,
      password,
      accessKey,
    );
    if (!user)
      throw new Error("Invalid credentials or account pending approval");
    setUser(user);
    localStorage.setItem("terminal_user_uid", user.uid);
  };

  const logout = () => {
    localStorage.removeItem("terminal_user_uid");
    window.location.reload();
  };

  const adminGetAllUsers = async () => {
    return [];
  };

  const adminUpdateUser = async (uid: string, data: Partial<UserProfile>) => {
    console.log("Admin update user (stubbed):", uid, data);
  };

  const adminCreateUser = async (data: Partial<UserProfile>) => {
    console.log("Admin create user (stubbed):", data);
  };

  const adminIssueMockBalance = async (uid: string, amount: number) => {
    console.log("Admin issue mock balance (stubbed):", uid, amount);
  };

  const adminResetBalance = async (uid: string) => {
    console.log("Admin reset balance (stubbed):", uid);
  };

  const adminFundSimulationWallet = async (
    userId: string,
    walletId: string,
    amount: number,
    reason: string,
  ) => {
    if (!user || user.role === UserRole.USER) throw new Error("Unauthorized");
    WalletRepository.fundSimulationWallet(
      userId,
      walletId,
      amount,
      user.username,
      reason,
    );
  };

  const adminGetAuditLogs = async () => {
    return WalletRepository.getAuditLogs();
  };

  const updateGlobalSettings = async (settings: any) => {
    console.log("Update global settings (stubbed):", settings);
  };

  return (
    <WalletContext.Provider
      value={{
        walletMode,
        setWalletMode: setWalletModeAndPersist,
        user,
        trades,
        activeWallet,
        executionLogs,
        addExecutionLog,
        checkAndRegisterPurchase,
        resetPurchaseHistory,
        resetTradingHistory,
        executeTrade,
        resetSimulation,
        updateSettings,
        updateGlobalSettings,
        updateBotSettings,
        restoreBotSettings,
        switchWallet,
        createWallet,
        createSimulationWallet,
        fundSimulationWallet,
        importWallet,
        revealPrivateKey,
        renameWallet,
        setDefaultWallet,
        toggleBot,
        emergencyStop,
        adminGetAllUsers,
        adminUpdateUser,
        adminCreateUser,
        adminIssueMockBalance,
        adminResetBalance,
        adminFundSimulationWallet,
        adminGetAuditLogs,
        login,
        register,
        approveUser,
        logout,
        closeTrade,
        updateTradeTriggers,
        bulkAction,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};
