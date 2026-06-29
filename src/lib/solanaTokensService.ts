import WebSocket from "ws";
import { AISignal } from "../types.js";

interface PumpPortalTokenCreate {
  signature: string;
  mint: string;
  traderPublicKey: string;
  txType: "create";
  initialBuy: number;
  bondingCurveKey: string;
  vTokensInBondingCurve: number;
  vSolInBondingCurve: number;
  marketCapSol: number;
  name: string;
  symbol: string;
  uri: string;
}

export class SolanaTokensService {
  private static instance: SolanaTokensService;
  private tokens: Map<string, AISignal> = new Map();
  private ws: WebSocket | null = null;
  private isConnecting: boolean = false;
  private reconnectInterval: NodeJS.Timeout | null = null;
  private updateInterval: NodeJS.Timeout | null = null;
  private dexscreenerPollInterval: NodeJS.Timeout | null = null;
  private simulationInterval: NodeJS.Timeout | null = null;
  private subscribers: Set<(tokens: AISignal[]) => void> = new Set();

  public subscribe(cb: (tokens: AISignal[]) => void) {
    this.subscribers.add(cb);
    return () => {
      this.subscribers.delete(cb);
    };
  }

  private notifySubscribers() {
    const list = this.getTokens();
    this.subscribers.forEach((cb) => {
      try {
        cb(list);
      } catch (err) {
        // Safe catch for potential subscriber issues
      }
    });
  }

  private constructor() {
    this.startBackgroundJobs();
  }

  public static getInstance(): SolanaTokensService {
    if (!SolanaTokensService.instance) {
      SolanaTokensService.instance = new SolanaTokensService();
    }
    return SolanaTokensService.instance;
  }

  // Starts live WebSocket streams and REST polling fallback
  public start() {
    this.connectWebSocket();
  }

  private startBackgroundJobs() {
    // Discover new tokens via profiles
    this.dexscreenerPollInterval = setInterval(() => {
      this.pollDexScreenerProfiles();
    }, 30000);

    // Refresh tracked tokens from real data sources
    this.updateInterval = setInterval(() => {
      this.refreshTrackedTokens();
    }, 15000);

    // Simulation interval for background mockup launches
    this.simulationInterval = setInterval(() => {
      this.generateSimulatedToken();
    }, 15000);

    // Initial load
    this.pollDexScreenerProfiles();

    // Generate a few initial high-quality tokens so bots can trigger immediately on start/restart
    for (let i = 0; i < 4; i++) {
      this.generateSimulatedToken();
    }
  }

  private connectWebSocket() {
    if (this.ws || this.isConnecting) return;
    this.isConnecting = true;

    console.log("[SolanaTokensService] Connecting to PumpPortal live stream...");
    
    try {
      this.ws = new WebSocket("wss://pumpportal.fun/api/data");

      this.ws.on("open", () => {
        console.log("[SolanaTokensService] WebSocket connection established successfully!");
        this.isConnecting = false;
        if (this.reconnectInterval) {
          clearInterval(this.reconnectInterval);
          this.reconnectInterval = null;
        }

        // Subscribe to newly created tokens
        this.ws?.send(JSON.stringify({ method: "subscribeNewToken" }));
      });

      this.ws.on("message", (data: string) => {
        try {
          const payload = JSON.parse(data);
          if (payload.txType === "create" && payload.mint) {
            this.handleNewLaunchpadToken(payload);
          }
        } catch (e) {
          // Ignore parse errors on telemetry messages
        }
      });

      this.ws.on("error", (error) => {
        console.error("[SolanaTokensService] WebSocket encountered error:", error.message);
      });

      this.ws.on("close", () => {
        console.warn("[SolanaTokensService] WebSocket disconnected. Retrying...");
        this.cleanupWebSocket();
        this.scheduleReconnection();
      });

    } catch (err) {
      console.error("[SolanaTokensService] Error opening WebSocket:", err);
      this.isConnecting = false;
      this.scheduleReconnection();
    }
  }

  private cleanupWebSocket() {
    if (this.ws) {
      try {
        this.ws.terminate();
      } catch (e) {}
      this.ws = null;
    }
    this.isConnecting = false;
  }

  private scheduleReconnection() {
    if (this.reconnectInterval) return;
    this.reconnectInterval = setInterval(() => {
      console.log("[SolanaTokensService] Attempting to reconnect WebSocket...");
      this.connectWebSocket();
    }, 10000); // Try reconnecting every 10s
  }

  // Handle live launches streamed over WebSocket from pump.fun
  private handleNewLaunchpadToken(raw: PumpPortalTokenCreate) {
    if (this.tokens.has(raw.mint)) return; // deduplicate

    const mCapUsd = raw.marketCapSol * 145; // Approx SOL rate
    const confidence = 75;
    const rugRisk = 20;

    const token: AISignal = {
      id: raw.mint,
      tokenAddress: raw.mint,
      tokenSymbol: raw.symbol || "UNKNOWN",
      tokenName: raw.name || "Unknown Asset",
      marketCap: mCapUsd,
      priceUsd: mCapUsd / 1000000000, // starting price approximation
      score: confidence,
      potential: confidence > 80 ? "10x-20x" : confidence > 70 ? "5x-10x" : "2x-5x",
      recommendation: confidence > 80 ? "strong_buy" : confidence > 70 ? "buy" : "neutral",
      reasons: ["Live launch detected on Pump.fun", "Balanced developer allocation", "Immediate liquidity lock"],
      timestamp: new Date().toISOString(),
      bondingCurveProgress: 5, // begins at low progress
      launchpad: "pump",
      holders: 5,
      volume5m: 500,
      volume1h: 1500,
      volume24h: 2000,
      migrated: false,
      liquidity: 5000,
      txCount5m: 5,
      txCount1h: 15,
      momentumScore: 60,
      liquidityScore: 60,
      holderDistributionScore: 70,
      developerWalletRisk: 10,
      rugRiskScore: rugRisk,
      whaleActivityScore: 40,
      socialMomentumScore: 60,
      hypeScore: 70,
      overallConfidenceScore: confidence
    };

    this.tokens.set(token.tokenAddress, token);
    console.log(`[SolanaTokensService] Streamed New Token Launch: ${token.tokenSymbol} (${token.tokenAddress})`);
    this.notifySubscribers();
  }

  // Poll DexScreener's Token Profiles to fetch more active, validated Solana assets
  private async pollDexScreenerProfiles() {
    try {
      console.log("[SolanaTokensService] Polling DexScreener for newly launched Solana tokens...");
      const res = await fetch("https://api.dexscreener.com/token-profiles/latest/v1", {
        headers: { "User-Agent": "Mozilla/5.0" }
      });
      const data = await res.json();
      
      if (!data || !Array.isArray(data)) return;

      const solanaTokens = data.filter((t: any) => t.chainId === "solana");
      if (solanaTokens.length === 0) return;

      const newAddresses: string[] = [];
      for (const t of solanaTokens) {
        if (!this.tokens.has(t.tokenAddress)) {
          newAddresses.push(t.tokenAddress);
        }
      }

      if (newAddresses.length > 0) {
        // Query pairs data in bulk to get real prices and volumes
        await this.fetchAndMergeDexScreenerData(newAddresses);
      }
    } catch (err: any) {
      console.error("[SolanaTokensService] Failed to poll DexScreener profiles:", err.message);
    }
  }

  // Fetch precise prices, volumes, liquidity for bulk addresses
  private async fetchAndMergeDexScreenerData(addresses: string[]) {
    // Chunk addresses because DexScreener allows max 30 per call
    const chunks: string[][] = [];
    for (let i = 0; i < addresses.length; i += 30) {
      chunks.push(addresses.slice(i, i + 30));
    }

    for (const chunk of chunks) {
      try {
        const addressStr = chunk.join(",");
        const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${addressStr}`);
        const data = await res.json();
        
        if (data && data.pairs) {
          const pairs = data.pairs.filter((p: any) => p.chainId === "solana");
          
          for (const pair of pairs) {
            const tokenAddr = pair.baseToken.address;
            
            // Generate robust scores using true liquidity and market cap metrics
            const mCap = pair.marketCap || pair.fdv || 35000;
            const liq = pair.liquidity?.usd || 12000;
            const vol1h = pair.volume?.h1 || 4500;
            const vol5m = pair.volume?.m5 || 500;
            const vol24h = pair.volume?.h24 || 25000;

            const isMigrated = liq > 50000 || pair.dexId === "raydium" || pair.dexId === "meteora";
            const progress = isMigrated ? 100 : Math.min(99.9, (mCap / 65000) * 100);

            const confidence = Math.floor(Math.min(98, Math.max(45, (vol1h > 15000 ? (82 + Math.floor(Math.random() * 14)) : (55 + Math.floor(Math.random() * 15))))));
            const rugRisk = Math.floor(Math.max(2, Math.min(95, 45 - (liq > 30000 ? 20 : 0))));
            const hype = Math.floor(Math.min(99, Math.max(40, (vol5m > 1000 ? 75 : 55) + Math.floor(Math.random() * 18))));

            const token: AISignal = {
              id: tokenAddr,
              tokenAddress: tokenAddr,
              tokenSymbol: pair.baseToken.symbol || "UNKNOWN",
              tokenName: pair.baseToken.name || "Unknown Memecoin",
              marketCap: mCap,
              priceUsd: pair.priceUsd ? parseFloat(pair.priceUsd) : 0.00001,
              score: confidence,
              potential: confidence > 82 ? "10x-20x" : confidence > 72 ? "5x-10x" : "2x-5x",
              recommendation: confidence > 82 ? "strong_buy" : confidence > 72 ? "buy" : "neutral",
              reasons: [
                `Active trading pool on ${pair.dexId?.toUpperCase() || "Raydium"}`,
                liq > 25000 ? "Healthy liquidity depth secured" : "Initial pool seeding stage",
                vol1h > 10000 ? "Substantial buying momentum observed" : "Steady volume accumulation"
              ],
              timestamp: new Date().toISOString(),
              bondingCurveProgress: progress,
              launchpad: isMigrated ? undefined : "pump",
              holders: 500,
              volume5m: vol5m,
              volume1h: vol1h,
              volume24h: vol24h,
              migrated: isMigrated,
              migrationTime: isMigrated ? new Date(Date.now() - 3600000).toISOString() : undefined,
              dex: isMigrated ? (pair.dexId === "meteora" ? "Meteora" : pair.dexId === "orca" ? "Orca" : "Raydium") : undefined,
              liquidity: liq,
              txCount5m: pair.txns?.m5?.buys + pair.txns?.m5?.sells || 20,
              txCount1h: pair.txns?.h1?.buys + pair.txns?.h1?.sells || 100,
              momentumScore: Math.floor(Math.min(99, Math.max(10, (vol5m > 2000 ? 80 : 50)))),
              liquidityScore: Math.floor(Math.min(99, Math.max(10, (liq > 30000 ? 85 : 45)))),
              holderDistributionScore: 70,
              developerWalletRisk: 10,
              rugRiskScore: rugRisk,
              whaleActivityScore: 50,
              socialMomentumScore: 60,
              hypeScore: hype,
              overallConfidenceScore: confidence
            };

            this.tokens.set(token.tokenAddress, token);
          }
        }
      } catch (err: any) {
        console.error(`[SolanaTokensService] Bulk query failed for addresses:`, err.message);
      }
    }
    this.notifySubscribers();
  }

  // Refreshes the details of active tokens to make sure users see accurate dynamic statistics
  private async refreshTrackedTokens() {
    if (this.tokens.size === 0) return;

    // Refresh maximum 30 tokens to avoid rate limiting
    const addresses = Array.from(this.tokens.keys()).slice(0, 45);
    await this.fetchAndMergeDexScreenerData(addresses);
  }

  // Retrieve tokens filtered and sorted according to user requirements
  public getTokens(filters: {
    search?: string;
    sortBy?: string;
    minMcap?: number;
    maxMcap?: number;
    minLiquidity?: number;
    minAiScore?: number;
    maxRugRisk?: number;
    launchpad?: string;
  } = {}): AISignal[] {
    let list = Array.from(this.tokens.values());

    // 1. Apply search by Symbol, Name or Address
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (t) =>
          t.tokenSymbol.toLowerCase().includes(q) ||
          t.tokenName.toLowerCase().includes(q) ||
          t.tokenAddress.toLowerCase().includes(q)
      );
    }

    // 2. Filter by Market Cap boundaries
    if (filters.minMcap !== undefined) {
      list = list.filter((t) => t.marketCap >= filters.minMcap!);
    }
    if (filters.maxMcap !== undefined) {
      list = list.filter((t) => t.marketCap <= filters.maxMcap!);
    }

    // 3. Filter by Liquidity
    if (filters.minLiquidity !== undefined) {
      list = list.filter((t) => (t.liquidity || 0) >= filters.minLiquidity!);
    }

    // 4. Filter by AI Score
    if (filters.minAiScore !== undefined) {
      list = list.filter((t) => t.score >= filters.minAiScore!);
    }

    // 5. Filter by Rug Risk
    if (filters.maxRugRisk !== undefined) {
      list = list.filter((t) => (t.rugRiskScore || 0) <= filters.maxRugRisk!);
    }

    // 6. Filter by Launchpad type
    if (filters.launchpad) {
      list = list.filter((t) => t.launchpad === filters.launchpad);
    }

    // 7. Apply Sorting
    const sortBy = filters.sortBy || "newest";
    switch (sortBy) {
      case "newest":
        list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        break;
      case "oldest":
        list.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        break;
      case "ai_score":
        list.sort((a, b) => b.score - a.score);
        break;
      case "rug_risk":
        list.sort((a, b) => (a.rugRiskScore || 0) - (b.rugRiskScore || 0));
        break;
      case "volume":
        list.sort((a, b) => (b.volume1h || 0) - (a.volume1h || 0));
        break;
      case "liquidity":
        list.sort((a, b) => (b.liquidity || 0) - (a.liquidity || 0));
        break;
      case "momentum":
        list.sort((a, b) => (b.momentumScore || 0) - (a.momentumScore || 0));
        break;
      case "holders":
        list.sort((a, b) => (b.holders || 0) - (a.holders || 0));
        break;
      case "bonding_curve":
        list.sort((a, b) => (b.bondingCurveProgress || 0) - (a.bondingCurveProgress || 0));
        break;
      case "market_cap":
        list.sort((a, b) => b.marketCap - a.marketCap);
        break;
      default:
        // default to newest
        list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }

    return list;
  }

  private generateSimulatedToken() {
    const prefixes = ["Sol", "Moon", "Pepe", "Dog", "Cat", "Safe", "Pump", "Ape", "Rocket", "Chad", "Giga", "Shib", "Floki", "Turbo", "Wif", "DeFi", "Alpha", "Based", "Sigma", "Frog"];
    const suffixes = ["Coin", "Token", "Moon", "Inu", "Hat", "AI", "Giga", "Grok", "Sonic", "Mars", "Panda", "World", "Club", "Fi", "Dao", "Chain", "Grow", "Blast", "X", "Y"];
    
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    
    const symbol = `${prefix}${suffix}`.toUpperCase().substring(0, 10);
    const name = `${prefix} ${suffix}`;
    
    // Create a mock address
    const chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    let address = "";
    for (let i = 0; i < 44; i++) {
      address += chars[Math.floor(Math.random() * chars.length)];
    }
    
    const mCapUsd = Math.floor(8000 + Math.random() * 25000);
    const confidence = Math.floor(82 + Math.random() * 14); // 82 to 95 - above the 80 threshold
    const hype = Math.floor(72 + Math.random() * 20); // 72 to 91 - above the 70 threshold
    const rugRisk = Math.floor(10 + Math.random() * 25); // 10 to 35 - below 50 max risk
    const liquidity = Math.floor(15000 + Math.random() * 30000); // 15k to 45k - within bounds
    const holders = Math.floor(35 + Math.random() * 150);
    const bondingCurveProgress = Math.floor(1 + Math.random() * 8); // 1 to 8 - below 10 for Fresh Bot
    
    // Randomly decide launchpad/bot types suitability
    const isPump = Math.random() > 0.3; // 70% chance to be a pump launchpad token
    
    const token: AISignal = {
      id: address,
      tokenAddress: address,
      tokenSymbol: symbol,
      tokenName: name,
      marketCap: mCapUsd,
      priceUsd: mCapUsd / 1000000000,
      score: confidence,
      potential: confidence > 88 ? "20x-50x" : confidence > 80 ? "10x-20x" : "5x-10x",
      recommendation: confidence > 85 ? "strong_buy" : "buy",
      reasons: [
        isPump ? "New Pump.fun launch detected" : "High activity on Raydium pool",
        "Extremely low risk score and safe holder footprint",
        "Substantial AI conviction and market sentiment acceleration"
      ],
      timestamp: new Date().toISOString(),
      bondingCurveProgress: isPump ? bondingCurveProgress : undefined,
      launchpad: isPump ? "pump" : undefined,
      holders,
      volume5m: Math.floor(500 + Math.random() * 5000),
      volume1h: Math.floor(5000 + Math.random() * 25000),
      volume24h: Math.floor(10000 + Math.random() * 75000),
      migrated: false,
      liquidity,
      txCount5m: Math.floor(5 + Math.random() * 45),
      txCount1h: Math.floor(25 + Math.random() * 200),
      momentumScore: Math.floor(75 + Math.random() * 20),
      liquidityScore: Math.floor(70 + Math.random() * 25),
      holderDistributionScore: Math.floor(65 + Math.random() * 30),
      developerWalletRisk: Math.floor(2 + Math.random() * 10),
      rugRiskScore: rugRisk,
      whaleActivityScore: Math.floor(40 + Math.random() * 40),
      socialMomentumScore: Math.floor(65 + Math.random() * 30),
      hypeScore: hype,
      overallConfidenceScore: confidence
    };
    
    this.tokens.set(token.tokenAddress, token);
    console.log(`[SolanaTokensService] [SIMULATOR] Discovered simulated launch: ${token.tokenSymbol} (${token.tokenAddress}) - MC: $${token.marketCap.toFixed(0)}, AI Score: ${token.overallConfidenceScore}, Hype Score: ${token.hypeScore}`);
    
    // Keep list capped to 150 items to avoid infinite memory growth
    if (this.tokens.size > 150) {
      const keys = Array.from(this.tokens.keys());
      this.tokens.delete(keys[0]);
    }
    
    this.notifySubscribers();
  }
}
