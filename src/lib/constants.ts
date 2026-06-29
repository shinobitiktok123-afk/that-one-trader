import { BotSettings, BotType, BotStatus, IndividualBotSettings, TakeProfitLevel } from '../types';

export const createDefaultIndividualBotSettings = (type: BotType): IndividualBotSettings => ({
  enabled: false,
  status: BotStatus.STOPPED,
  amountPerTrade: 0.1,
  usePercentage: false,
  percentPerTrade: 1,
  maxPositions: 5,
  maxDailyInvestment: 1.0,
  gasReserve: 0.05,
  stopLoss: 15,
  takeProfitLevels: [{ percentage: 20, sellAmount: 100 }],
  trailingStop: 0,
  minLiquidity: 1000,
  maxLiquidity: 100000,
  minMarketCap: 1000,
  maxMarketCap: 50000,
  minHolders: 10,
  maxRugRisk: 50,
  queueEnabled: true,
  queueSize: 10,
  autoResume: true,
  retryFailed: true,
  retryAttempts: 3,
  stopThreshold: 0.01,
  maxSlippage: 15,
  priorityFee: 0.001,
  ...(type === BotType.FRESH ? { 
    earlyExitTimeout: 25, 
    minVolumeThreshold: 10, 
    minBuysThreshold: 5 
  } : {}),
  ...(type === BotType.HYPE ? { minHypeScore: 70 } : {}),
  ...(type === BotType.AI ? { minAIConfidence: 80 } : {}),
});

export const DEFAULT_BOT_SETTINGS: BotSettings = {
  autoBuy: false,
  isHunting: false,
  amountPerTrade: 0.1,
  stopLoss: 15,
  trailingStop: 0,
  takeProfitLevels: [{ percentage: 20, sellAmount: 100 }],
  trailingTakeProfit: false,
  minMarketCap: 3500,
  gasReserve: 0.05,
  freshBot: createDefaultIndividualBotSettings(BotType.FRESH),
  hypeBot: createDefaultIndividualBotSettings(BotType.HYPE),
  aiBot: createDefaultIndividualBotSettings(BotType.AI)
};
