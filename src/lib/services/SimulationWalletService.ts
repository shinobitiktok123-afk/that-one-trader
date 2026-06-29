import { SimulationWallet, WalletMode, WalletType } from '../../types';

export class SimulationWalletService {
  static createWallet(name: string, userId: string, balance: number = 1000): SimulationWallet {
    return {
      id: `sim_${Date.now()}_${performance.now().toString().replace('.', '')}`,
      mode: WalletMode.SIMULATION,
      name,
      address: `sim_address_${Date.now()}`,
      type: WalletType.GENERATED,
      balance,
      portfolioValue: balance,
      isDefault: false,
      botSettings: {} as any, // Initialize with defaults
      createdAt: new Date().toISOString(),
    };
  }

  static fundWallet(wallet: SimulationWallet, amount: number): SimulationWallet {
    return { ...wallet, balance: wallet.balance + amount };
  }
}
