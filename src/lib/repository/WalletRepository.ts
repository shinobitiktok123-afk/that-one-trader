import { UserProfile, Wallet, UserRole, UserStatus, WalletMode, AuditLog } from '../../types';
import { storage } from '../storage';
import bcrypt from 'bcryptjs';
import { DEFAULT_BOT_SETTINGS } from '../constants';

const USERS_STORAGE_KEY = 'app_users';
const AUDIT_LOGS_STORAGE_KEY = 'audit_logs';

export class WalletRepository {
  static getAllUsers(): Record<string, UserProfile> {
    return storage.loadData<Record<string, UserProfile>>(USERS_STORAGE_KEY) || {};
  }

  static saveUser(user: UserProfile): void {
    const users = this.getAllUsers();
    users[user.username] = user;
    storage.saveData(USERS_STORAGE_KEY, users);
  }

  static getAuditLogs(): AuditLog[] {
    return storage.loadData<AuditLog[]>(AUDIT_LOGS_STORAGE_KEY) || [];
  }

  static saveAuditLog(log: AuditLog): void {
    const logs = this.getAuditLogs();
    logs.push(log);
    storage.saveData(AUDIT_LOGS_STORAGE_KEY, logs);
  }

  static loadUserByUsername(username: string): UserProfile | null {
    const users = this.getAllUsers();
    return users[username] || null;
  }

  static loadUserByUid(uid: string): UserProfile | null {
    const users = this.getAllUsers();
    return Object.values(users).find(u => u.uid === uid) || null;
  }

  static addWallet(userId: string, wallet: Wallet): void {
    const user = this.loadUserByUid(userId);
    if (!user) throw new Error('User not found');
    user.wallets.push(wallet);
    this.saveUser(user);
  }

  static updateWallet(userId: string, wallet: Wallet): void {
    const user = this.loadUserByUid(userId);
    if (!user) throw new Error('User not found');
    user.wallets = user.wallets.map(w => w.id === wallet.id ? wallet : w);
    this.saveUser(user);
  }

  static removeWallet(userId: string, walletId: string): void {
    const user = this.loadUserByUid(userId);
    if (!user) throw new Error('User not found');
    user.wallets = user.wallets.filter(w => w.id !== walletId);
    if (user.activeWalletId === walletId) user.activeWalletId = user.wallets[0]?.id || '';
    this.saveUser(user);
  }

  static setDefaultWallet(userId: string, walletId: string): void {
    const user = this.loadUserByUid(userId);
    if (!user) throw new Error('User not found');
    user.wallets = user.wallets.map(w => ({ ...w, isDefault: w.id === walletId }));
    user.activeWalletId = walletId;
    this.saveUser(user);
  }

  static fundSimulationWallet(userId: string, walletId: string, amount: number, adminUsername: string, reason: string): void {
    const user = this.loadUserByUid(userId);
    if (!user) throw new Error('User not found');
    const wallet = user.wallets.find(w => w.id === walletId);
    if (!wallet || wallet.mode !== WalletMode.SIMULATION) throw new Error('Invalid wallet');
    
    // @ts-ignore
    wallet.balance += amount;
    this.updateWallet(userId, wallet);
    
    this.saveAuditLog({
        id: `log_${Date.now()}_${performance.now().toString().replace('.', '')}`,
        timestamp: new Date().toISOString(),
        action: 'fund_simulation_wallet',
        adminId: 'admin', // Should be proper ID
        adminUsername,
        targetId: userId,
        targetName: user.username,
        details: { walletId, amount, reason },
        severity: 'medium'
    });
  }

  static async registerUser(username: string, password: string): Promise<void> {
    const existing = this.loadUserByUsername(username);
    if (existing) throw new Error('Username already exists');
    
    const passwordHash = await bcrypt.hash(password, 10);
    const walletId = `sim_reg_${Date.now()}_${performance.now().toString().replace('.', '')}`;
    const newUser: UserProfile = {
        uid: `user_${Date.now()}_${performance.now().toString().replace('.', '')}`,
        username,
        role: UserRole.USER,
        status: UserStatus.PENDING,
        passwordHash,
        walletMode: WalletMode.SIMULATION,
        wallets: [
            {
                id: walletId,
                name: "Default Simulation",
                address: `SIM_${Date.now()}`,
                type: 'generated' as any,
                balance: 1000,
                portfolioValue: 1000,
                isDefault: true,
                mode: WalletMode.SIMULATION,
                createdAt: new Date().toISOString(),
                botSettings: {
                    freshBot: { ...DEFAULT_BOT_SETTINGS.freshBot },
                    hypeBot: { ...DEFAULT_BOT_SETTINGS.hypeBot },
                    aiBot: { ...DEFAULT_BOT_SETTINGS.aiBot }
                } as any
            }
        ],
        activeWalletId: walletId,
        simulationBalance: 0,
        botSettings: {} as any,
        analytics: {
            totalPnL: 0, realizedPnL: 0, unrealizedPnL: 0, winRate: 0, totalTrades: 0, successRate: 0, avgReturn: 0, maxDrawdown: 0, bestTrade: 0, worstTrade: 0
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    this.saveUser(newUser);
  }

  static async seedAdmin(): Promise<void> {
    const existing = this.loadUserByUsername('egoinweb3');
    if (existing) return;
    const passwordHash = await bcrypt.hash('darkman44DBOY!', 10);
    const accessKeyHash = await bcrypt.hash('2006', 10);
    const walletId = `sim_admin_${Date.now()}_${performance.now().toString().replace('.', '')}`;
    const adminUser: UserProfile = {
        uid: 'admin_uid',
        username: 'egoinweb3',
        role: UserRole.ADMIN,
        status: UserStatus.APPROVED,
        accessId: accessKeyHash,
        passwordHash,
        walletMode: WalletMode.SIMULATION,
        wallets: [
            {
                id: walletId,
                name: "Admin Simulation",
                address: `SIM_ADMIN_${Date.now()}`,
                type: 'generated' as any,
                balance: 1000,
                portfolioValue: 1000,
                isDefault: true,
                mode: WalletMode.SIMULATION,
                createdAt: new Date().toISOString(),
                botSettings: {
                    freshBot: { ...DEFAULT_BOT_SETTINGS.freshBot },
                    hypeBot: { ...DEFAULT_BOT_SETTINGS.hypeBot },
                    aiBot: { ...DEFAULT_BOT_SETTINGS.aiBot }
                } as any
            }
        ],
        activeWalletId: walletId,
        simulationBalance: 0,
        botSettings: {} as any, 
        analytics: {
            totalPnL: 0, realizedPnL: 0, unrealizedPnL: 0, winRate: 0, totalTrades: 0, successRate: 0, avgReturn: 0, maxDrawdown: 0, bestTrade: 0, worstTrade: 0
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    this.saveUser(adminUser);
  }

  static async approveUser(username: string, accessKey: string): Promise<void> {
    const user = this.loadUserByUsername(username);
    if (!user) throw new Error('User not found');
    
    const accessKeyHash = await bcrypt.hash(accessKey, 10);
    user.status = UserStatus.APPROVED;
    user.accessId = accessKeyHash;
    user.updatedAt = new Date().toISOString();
    this.saveUser(user);
  }

  static async verifyLogin(username: string, password: string, accessKey: string): Promise<UserProfile | null> {
      const user = this.loadUserByUsername(username);
      if (!user) return null;
      if (user.role !== UserRole.ADMIN && user.status !== UserStatus.APPROVED) throw new Error('Account pending approval');
      
      const passwordMatch = await bcrypt.compare(password, user.passwordHash || '');
      const accessKeyMatch = await bcrypt.compare(accessKey, user.accessId || '');
      
      if (passwordMatch && accessKeyMatch) return user;
      return null;
  }
}
