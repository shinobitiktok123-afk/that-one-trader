import { Keypair } from '@solana/web3.js';
import { LiveWallet, WalletMode, WalletType } from '../../types';
import bs58 from 'bs58';

export class LiveWalletService {
  static createWallet(name: string): LiveWallet {
    const keypair = Keypair.generate();
    
    // In a real app, use AES-GCM encryption with user password derived key
    // For now, simple base64-like encoding as placeholder for demonstration
    const encryptedPrivateKey = btoa(Buffer.from(keypair.secretKey).toString('binary'));
    
    return {
      id: `live_${Date.now()}_${performance.now().toString().replace('.', '')}`,
      mode: WalletMode.REAL,
      name,
      address: keypair.publicKey.toBase58(),
      type: WalletType.GENERATED,
      encryptedPrivateKey,
      iv: 'iv_stub', 
      balance: 0,
      portfolioValue: 0,
      isDefault: false,
      botSettings: {} as any, // Initialize with defaults
      createdAt: new Date().toISOString(),
    };
  }

  static importWallet(name: string, privateKey: string): LiveWallet {
    let keypair: Keypair;
    try {
        const secretKey = bs58.decode(privateKey);
        keypair = Keypair.fromSecretKey(secretKey);
    } catch (e) {
        throw new Error('Invalid private key');
    }
    
    const encryptedPrivateKey = btoa(Buffer.from(keypair.secretKey).toString('binary'));

    return {
      id: `live_${Date.now()}_${performance.now().toString().replace('.', '')}`,
      mode: WalletMode.REAL,
      name,
      address: keypair.publicKey.toBase58(),
      type: WalletType.IMPORTED,
      encryptedPrivateKey,
      iv: 'iv_stub', 
      balance: 0,
      portfolioValue: 0,
      isDefault: false,
      botSettings: {} as any,
      createdAt: new Date().toISOString(),
    };
  }
}
