import { Keypair, Connection, clusterApiUrl, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import bs58 from 'bs58';

const connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');

/**
 * Generates a new Solana keypair locally.
 * @returns { address: string, privateKey: string }
 */
export const createWallet = (): { address: string, privateKey: string } => {
  const keypair = Keypair.generate();
  return {
    address: keypair.publicKey.toBase58(),
    privateKey: bs58.encode(keypair.secretKey),
  };
};

/**
 * Imports a Solana wallet from a Base58 private key string.
 * @param key Base58 encoded private key
 * @returns { address: string, privateKey: string }
 */
export const importWalletFromKey = (key: string): { address: string, privateKey: string } => {
  try {
    const secretKey = bs58.decode(key);
    if (secretKey.length !== 64) {
      throw new Error("Invalid private key length");
    }
    const keypair = Keypair.fromSecretKey(secretKey);
    return {
      address: keypair.publicKey.toBase58(),
      privateKey: key,
    };
  } catch (err) {
    throw new Error("Invalid private key format");
  }
};

export const getBalance = async (address: string): Promise<number> => {
  try {
    const pubkey = new PublicKey(address);
    const balance = await connection.getBalance(pubkey);
    return balance / LAMPORTS_PER_SOL;
  } catch (err) {
    return 0;
  }
};

export const collectFee = async (fromKey: string) => {
  console.log("Fee collected from", fromKey);
};
