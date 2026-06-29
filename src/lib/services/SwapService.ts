import { Connection, Keypair, VersionedTransaction } from '@solana/web3.js';
import bs58 from 'bs58';

const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');

export interface QuoteResponse {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  platformFee: any;
  priceImpactPct: string;
  routePlan: any[];
  contextSlot: number;
  timeTaken: number;
}

export class SwapService {
  static async getQuote(inputMint: string, outputMint: string, amountLamports: number, slippageBps: number): Promise<QuoteResponse> {
    const url = `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amountLamports}&slippageBps=${slippageBps}`;
    const response = await fetch(url);
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Failed to get quote: ${errorBody}`);
    }
    const data = await response.json();
    if (data.error) {
       throw new Error(`Quote error: ${data.error}`);
    }
    return data as QuoteResponse;
  }

  static async getSwapTransaction(quoteResponse: QuoteResponse, userPublicKey: string): Promise<string> {
    const url = `https://quote-api.jup.ag/v6/swap`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        quoteResponse,
        userPublicKey,
        wrapAndUnwrapSol: true,
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Failed to get swap transaction: ${errorBody}`);
    }
    const data = await response.json();
    if (data.error) {
       throw new Error(`Swap transaction error: ${data.error}`);
    }
    return data.swapTransaction;
  }

  static async signAndSendTransaction(swapTransaction: string, privateKeyBase58: string): Promise<string> {
    const secretKey = bs58.decode(privateKeyBase58);
    const keypair = Keypair.fromSecretKey(secretKey);

    const swapTransactionBuf = Buffer.from(swapTransaction, 'base64');
    const transaction = VersionedTransaction.deserialize(swapTransactionBuf);
    
    transaction.sign([keypair]);

    const rawTransaction = transaction.serialize();
    const txid = await connection.sendRawTransaction(rawTransaction, {
      skipPreflight: true,
      maxRetries: 2
    });

    return txid;
  }

  static async confirmTransaction(txid: string): Promise<boolean> {
    const latestBlockHash = await connection.getLatestBlockhash();
    const confirmation = await connection.confirmTransaction({
      blockhash: latestBlockHash.blockhash,
      lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
      signature: txid
    });
    
    if (confirmation.value.err) {
      throw new Error(`Transaction failed: ${confirmation.value.err.toString()}`);
    }
    
    return true;
  }
}
