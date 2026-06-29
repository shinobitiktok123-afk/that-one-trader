import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { SolanaTokensService } from "./src/lib/solanaTokensService.js";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

const JWT_SECRET = process.env.JWT_SECRET || "sol-ai-secret-12345";
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const IV_LENGTH = 16;

// Encryption Helper
function encrypt(text: string) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return { iv: iv.toString('hex'), encryptedData: encrypted.toString('hex') };
}

function decrypt(text: string, iv: string) {
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), Buffer.from(iv, 'hex'));
  let decrypted = decipher.update(Buffer.from(text, 'hex'));
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

async function startServer() {
  const app = express();
  const PORT = 3000;
  const httpServer = createServer(app);

  app.use(express.json());

  // Initialize and start the live Solana tracking service
  const tokenService = SolanaTokensService.getInstance();
  tokenService.start();

  // Create WebSocket Server
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", (request, socket, head) => {
    const url = request.url || "";
    const pathname = url.split("?")[0];
    console.log(`[Server] Upgrade request for path: ${pathname}`);
    
    if (pathname.startsWith("/api/stream") || pathname.startsWith("/ws-api")) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    } else {
      // Let Vite or other handlers take it if not our path
      console.log(`[Server] Path ${pathname} not handled by our WS server`);
    }
  });

  wss.on("connection", (ws: WebSocket) => {
    console.log("[WS Server] Client connected to live token stream");

    // Send initial list of tokens on connect
    const initialTokens = tokenService.getTokens();
    ws.send(JSON.stringify({ type: "init", tokens: initialTokens }));

    // Subscribe to updates
    const unsubscribe = tokenService.subscribe((updatedTokens) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({ type: "update", tokens: updatedTokens }));
      }
    });

    ws.on("message", (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
        }
      } catch (e) {
        console.error('Error parsing message', e);
      }
    });

    ws.on("close", () => {
      console.log("[WS Server] Client disconnected");
      unsubscribe();
    });

    ws.on("error", (err) => {
      console.error("[WS Server] Client socket error:", err);
      unsubscribe();
    });
  });

  // --- API Routes ---

  app.get(["/tokens", "/api/tokens"], (req, res) => {
    try {
      const {
        search,
        sortBy,
        minMcap,
        maxMcap,
        minLiquidity,
        minAiScore,
        maxRugRisk,
        launchpad
      } = req.query;

      const list = tokenService.getTokens({
        search: search ? String(search) : undefined,
        sortBy: sortBy ? String(sortBy) : undefined,
        minMcap: minMcap ? parseFloat(String(minMcap)) : undefined,
        maxMcap: maxMcap ? parseFloat(String(maxMcap)) : undefined,
        minLiquidity: minLiquidity ? parseFloat(String(minLiquidity)) : undefined,
        minAiScore: minAiScore ? parseFloat(String(minAiScore)) : undefined,
        maxRugRisk: maxRugRisk ? parseFloat(String(maxRugRisk)) : undefined,
        launchpad: launchpad ? String(launchpad) : undefined,
      });

      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to retrieve live tokens", details: err.message });
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // AI Token Analyzer
  app.post("/api/ai/analyze", async (req, res) => {
    const { tokenData } = req.body;
    try {
      const prompt = `Analyze this Solana memecoin for 2x to 20x potential. 
      Data: ${JSON.stringify(tokenData)}
      Return a JSON object with: 
      {
        "score": number (0-100),
        "potential": "2x-5x" | "5x-10x" | "10x-20x" | "high_risk",
        "recommendation": "strong_buy" | "buy" | "neutral" | "sell" | "avoid",
        "reasons": string[]
      }`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      const cleanJson = text.replace(/```json|```/g, "").trim();
      res.json(JSON.parse(cleanJson));
    } catch (err) {
      res.status(500).json({ error: "AI Analysis failed" });
    }
  });

  // DexScreener Proxy for Real-time Prices
  app.get("/api/prices/:address", async (req, res) => {
    try {
      const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${req.params.address}`);
      const data = await response.json();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch price" });
    }
  });

  // Admin Mock Funding
  app.post("/api/admin/fund-mock", async (req, res) => {
    const { userId, amount, adminToken } = req.body;
    // Verify adminToken logic here
    res.json({ success: true, newBalance: amount });
  });

  // Wallet Generation Proxy (Encrypted)
  app.post("/api/wallet/encrypt", (req, res) => {
    const { privateKey } = req.body;
    const encrypted = encrypt(privateKey);
    res.json(encrypted);
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
