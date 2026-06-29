import {
  AISignal,
  BotType,
  Trade,
  TradeStatus,
  UserProfile,
  Wallet,
  ExecutionLog,
  WalletMode,
  ExitReason,
} from "../../types";

export class SimulationTradeEngine {
  static executeBuy(
    token: AISignal,
    amount: number,
    targetWallet: Wallet,
    botType: BotType,
    addExecutionLog: (log: Omit<ExecutionLog, "id" | "timestamp">) => void,
  ): { trade: Trade; cost: number } {
    if (!token.priceUsd || token.priceUsd <= 0) {
      throw new Error("Trade rejected: live market price unavailable.");
    }

    const priorityFee = targetWallet.botSettings?.gasReserve || 0.0001;
    const totalCost = amount + priorityFee;

    if (targetWallet.balance < totalCost) {
      const msg = `Insufficient SOL. Required: ${totalCost}, Available: ${targetWallet.balance}`;
      throw new Error(msg);
    }

    const entryPrice = token.priceUsd;
    const fees = amount * 0.01;
    const quantity = (amount - fees) / entryPrice; // deduct fees from investment

    addExecutionLog({
      botType,
      tokenSymbol: token.tokenSymbol,
      walletName: targetWallet.name,
      stage: "Simulation",
      status: "success",
      message:
        "Simulated paper trade executed successfully using live market price",
    });
    
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

    const tradeId = `sim_trade_${Date.now()}_${performance.now().toString().replace('.', '')}`;
    const newTrade: Trade = {
      id: tradeId,
      userId: "", // Will be filled by caller
      walletId: targetWallet.id,
      walletAddress: targetWallet.address,
      walletMode: WalletMode.SIMULATION,
      botType,
      tokenSymbol: token.tokenSymbol,
      tokenAddress: token.tokenAddress,
      tokenName: token.tokenName,
      tokenLogo: token.tokenLogo || "",
      type: "buy",
      amount: totalCost, // store total deducted
      quantity,
      price: entryPrice,
      entryPrice,
      status: TradeStatus.MONITORING,
      timestamp: new Date().toISOString(),
      boughtAt: new Date().toISOString(),
      lastActivityCheck: new Date().toISOString(),
      isPaper: true,
      fees,
      txHash: "sim_tx_" + Date.now(),
      stopLossPrice: entryPrice * (1 - sl / 100),
      takeProfitLevels: [{ percentage: tp, sellAmount: 100, price: entryPrice * (1 + tp / 100) }],
      trailingStopActive: ts > 0,
      trailingStopDistance: ts,
      highestPriceObserved: entryPrice,
      logs: [
        {
          timestamp: new Date().toISOString(),
          event: `Position Opened (Paper): ${(botType || "manual").toUpperCase()} BOT`,
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

    return { trade: newTrade, cost: totalCost };
  }

  static executeSell(
    trade: Trade,
    token: AISignal,
    targetWallet: Wallet,
    botType: BotType,
    closeReason: ExitReason,
    addExecutionLog: (log: Omit<ExecutionLog, "id" | "timestamp">) => void,
  ): { updatedTrade: Trade; returnAmount: number } {
    if (!token.priceUsd || token.priceUsd <= 0) {
      throw new Error("Trade rejected: live market price unavailable.");
    }

    const currentPrice = token.priceUsd;
    const returnAmountTokens = trade.quantity;
    const grossExitValue = returnAmountTokens * currentPrice;
    const exitFees = grossExitValue * 0.01;
    const netResult = grossExitValue - exitFees;

    addExecutionLog({
      botType,
      tokenSymbol: token.tokenSymbol,
      walletName: targetWallet.name,
      stage: "Simulation",
      status: "success",
      message: `Simulated paper sell executed successfully at ${currentPrice}`,
    });

    const pnl = netResult - trade.amount;
    const pnlPercent = (pnl / trade.amount) * 100;

    const updatedTrade = {
      ...trade,
      status: TradeStatus.COMPLETED,
      exitedAt: new Date().toISOString(),
      exitPrice: currentPrice,
      pnl,
      pnlPercent,
      closeReason,
    };

    return { updatedTrade, returnAmount: netResult };
  }
}
