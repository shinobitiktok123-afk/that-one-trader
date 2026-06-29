import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, Shield, Settings, FileText, 
  BarChart, Activity, Lock, Database, 
  Plus, Search, Edit2, Trash2, 
  CheckCircle, XCircle, AlertTriangle,
  Wallet, RefreshCw, Key, Server,
  Globe, Terminal, Cpu, HardDrive,
  LayoutDashboard, Zap, DollarSign
} from 'lucide-react';
import { useWallet } from '../lib/WalletContext';
import { UserRole, UserProfile, WalletMode } from '../types';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

import { ErrorBoundary } from './common/ErrorBoundary';

const AdminCard = ({ children, title, subtitle, icon: Icon, className }: any) => (
  <div className={cn("bg-bg-card border border-border-main rounded-2xl overflow-hidden", className)}>
    <div className="px-6 py-4 border-b border-border-main flex items-center justify-between">
      <div className="flex items-center gap-3">
        {Icon && <Icon className="w-4 h-4 text-brand-primary" />}
        <div>
          <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">{title}</h3>
          {subtitle && <p className="text-[8px] text-text-muted uppercase tracking-widest mt-0.5">{subtitle}</p>}
        </div>
      </div>
    </div>
    <div className="p-6">
      {children}
    </div>
  </div>
);

export const AdminDashboardContent = () => {
  const { 
    user, 
    adminGetAllUsers, 
    adminUpdateUser, 
    adminCreateUser, 
    adminIssueMockBalance, 
    adminResetBalance, 
    adminFundSimulationWallet,
    adminGetAuditLogs,
    resetPurchaseHistory 
  } = useWallet();
  
  const [activeTab, setActiveTab] = useState<'users' | 'settings' | 'logs' | 'trading' | 'system' | 'funding'>('users');
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'ALL'>('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  // Funding state
  const [fundingUserUid, setFundingUserUid] = useState('');
  const [fundingWalletId, setFundingWalletId] = useState('');
  const [fundingAmount, setFundingAmount] = useState(0);
  const [fundingReason, setFundingReason] = useState('');
  
  // Selected user & wallet for purchase registry reset
  const [selectedUserUid, setSelectedUserUid] = useState('');
  const [selectedWalletId, setSelectedWalletId] = useState('');

  const selectedUserWallets = useMemo(() => {
    const found = usersList.find(u => u.uid === selectedUserUid);
    return found?.wallets || [];
  }, [selectedUserUid, usersList]);

  const handleResetPurchaseHistory = () => {
    if (!selectedWalletId) {
      alert("Please select a wallet first.");
      return;
    }
    const targetUser = usersList.find(u => u.uid === selectedUserUid);
    const targetWallet = targetUser?.wallets?.find(w => w.id === selectedWalletId);
    if (!targetUser || !targetWallet) {
      alert("Selected wallet or user not found.");
      return;
    }

    if (confirm(`CRITICAL: Are you sure you want to reset the purchase registry for wallet "${targetWallet.name}" (${targetWallet.address.slice(0, 6)}...) of user "${targetUser.username}"?`)) {
      resetPurchaseHistory(selectedWalletId);
      alert(`Purchase registry for wallet "${targetWallet.name}" has been reset successfully.`);
      setSelectedWalletId('');
    }
  };

  const [globalConfigs, setGlobalConfigs] = useState({
     defaultBuyAmount: 0.1,
     defaultStopLoss: 15,
     allowLiveTrading: true,
     enforceMaxLeverage: false
  });

  const saveGlobalConfigs = () => {
    console.log("Saving global configs:", globalConfigs);
    alert("Global configs saved!");
  };

  const isAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN;

  useEffect(() => {
    if (!isAdmin) return;
    loadData();
  }, [isAdmin, activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'users') {
        const data = await adminGetAllUsers();
        setUsersList(data);
      } else if (activeTab === 'logs') {
        const data = await adminGetAuditLogs();
        setAuditLogs(data);
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    return usersList.filter(u => {
      const matchesSearch = 
        u.username.toLowerCase().includes(searchQuery.toLowerCase()) || 
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.uid.includes(searchQuery) ||
        u.wallets?.some(w => w.address.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
      
      return matchesSearch && matchesRole;
    });
  }, [usersList, searchQuery, roleFilter]);

  if (!isAdmin) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-4">
        <Lock className="w-16 h-16 text-brand-danger" />
        <h2 className="text-xl font-black text-white uppercase tracking-widest">Access Denied</h2>
        <p className="text-text-muted text-xs uppercase font-bold">Only authorized administrators can access this terminal</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Admin Nav */}
      <div className="flex flex-wrap gap-4 bg-bg-card border border-border-main p-2 rounded-2xl">
        {(['system', 'users', 'funding', 'trading', 'settings', 'logs'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex items-center gap-3 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all",
              activeTab === tab 
                ? "bg-brand-primary text-black" 
                : "text-text-muted hover:bg-white/[0.05] hover:text-white"
            )}
          >
            {tab === 'system' && <LayoutDashboard className="w-4 h-4" />}
            {tab === 'users' && <Users className="w-4 h-4" />}
            {tab === 'funding' && <DollarSign className="w-4 h-4" />}
            {tab === 'trading' && <Activity className="w-4 h-4" />}
            {tab === 'settings' && <Settings className="w-4 h-4" />}
            {tab === 'logs' && <FileText className="w-4 h-4" />}
            {tab === 'system' ? 'System Health' : tab === 'logs' ? 'Platform Logs' : tab}
          </button>
        ))}
        
        <div className="ml-auto flex items-center gap-4 px-4">
           <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-brand-primary animate-pulse"></div>
              <span className="text-[8px] font-black text-white uppercase tracking-widest">System Live</span>
           </div>
           <div className="h-4 w-px bg-border-main"></div>
           <span className="text-[8px] font-black text-brand-primary uppercase tracking-widest">
             {user?.role === UserRole.SUPER_ADMIN ? 'Super Admin' : 'Admin'} Mode
           </span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'system' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
               <AdminCard title="Engine Latency" subtitle="Real-time execution speed" icon={Zap}>
                  <div className="flex items-end gap-2 mt-4">
                     <span className="text-3xl font-black text-brand-primary">42ms</span>
                     <span className="text-[8px] text-text-muted uppercase font-bold mb-1">Optimal</span>
                  </div>
                  <div className="mt-6 flex gap-1 h-8 items-end">
                     {[30, 45, 35, 50, 42, 38, 45, 42].map((h, i) => (
                        <div key={i} className="flex-1 bg-brand-primary/20 rounded-t-sm" style={{ height: `${h}%` }}></div>
                     ))}
                  </div>
               </AdminCard>
               <AdminCard title="RPC Status" subtitle="Neural gateway connectivity" icon={Activity}>
                  <div className="flex items-center gap-3 mt-4">
                     <div className="w-2 h-2 rounded-full bg-brand-primary animate-pulse"></div>
                     <span className="text-sm font-bold text-white">Mainnet-Beta</span>
                  </div>
                  <div className="mt-2 text-[8px] text-text-muted uppercase font-bold tracking-widest">Load: 12.4% • Uplink: Stable</div>
                  <div className="mt-4 w-full bg-bg-tertiary h-1 rounded-full overflow-hidden">
                     <div className="bg-brand-primary h-full w-[12%]"></div>
                  </div>
               </AdminCard>
               <AdminCard title="Platform Load" subtitle="Global compute resources" icon={LayoutDashboard}>
                  <div className="text-3xl font-black text-white mt-4">18.5%</div>
                  <div className="text-[8px] text-text-muted uppercase font-bold tracking-widest mt-1">Memory: 4.2GB / 32GB</div>
                  <div className="mt-4 flex justify-between text-[8px] font-black uppercase text-brand-primary">
                     <span>CPU</span>
                     <span>8%</span>
                  </div>
               </AdminCard>
               <AdminCard title="Active Streams" subtitle="Live data synchronization" icon={FileText}>
                  <div className="text-3xl font-black text-white mt-4">1,242</div>
                  <div className="text-[8px] text-text-muted uppercase font-bold tracking-widest mt-1">Signals/sec: 45</div>
                  <div className="mt-4 flex gap-1">
                     {[1,2,3,4,5].map(i => <div key={i} className="w-1 h-1 rounded-full bg-brand-primary animate-ping" style={{ animationDelay: `${i*200}ms` }}></div>)}
                  </div>
               </AdminCard>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <AdminCard title="Account Overview" subtitle="Platform population stats" icon={Users} className="h-full">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-bg-main border border-border-main rounded-xl">
                      <div className="text-[8px] font-black text-text-muted uppercase tracking-widest mb-1">Total Users</div>
                      <div className="text-xl font-black text-white">{usersList.length}</div>
                    </div>
                    <div className="p-4 bg-bg-main border border-border-main rounded-xl">
                      <div className="text-[8px] font-black text-text-muted uppercase tracking-widest mb-1">Admins</div>
                      <div className="text-xl font-black text-brand-primary">{usersList.filter(u => u.role !== UserRole.USER).length}</div>
                    </div>
                  </div>
                </AdminCard>
                <div className="md:col-span-2">
                  <div className="flex flex-col md:flex-row justify-between items-center gap-6 h-full">
                    <div className="relative flex-1 w-full">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                      <input 
                        type="text" 
                        placeholder="Search users by name, email, role or wallet..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full h-full bg-bg-card border border-border-main rounded-xl pl-12 pr-6 py-4 text-xs font-bold text-white outline-none focus:border-brand-primary transition-all"
                      />
                    </div>
                    <div className="flex bg-bg-card border border-border-main p-1 rounded-xl">
                       {(['ALL', UserRole.USER, UserRole.ADMIN, UserRole.SUPER_ADMIN] as const).map(role => (
                         <button
                           key={role}
                           onClick={() => setRoleFilter(role)}
                           className={cn(
                             "px-3 py-1.5 text-[8px] font-black uppercase tracking-widest rounded transition-all",
                             roleFilter === role ? "bg-brand-primary text-black" : "text-text-muted hover:text-white"
                           )}
                         >
                           {role}
                         </button>
                       ))}
                    </div>
                    <button 
                      onClick={() => setIsCreateModalOpen(true)}
                      className="w-full md:w-auto h-full flex items-center justify-center gap-2 px-8 py-4 bg-brand-primary text-black rounded-xl font-black text-[10px] uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      Create New User
                    </button>
                  </div>
                </div>
              </div>

              <AdminCard title="User Management Terminal" subtitle="Comprehensive user directory and controls" icon={Users}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[10px]">
                    <thead>
                      <tr className="text-text-muted uppercase tracking-[0.2em] font-black border-b border-border-main">
                        <th className="px-6 py-4">User Identity</th>
                        <th className="px-6 py-4">Role / Access</th>
                        <th className="px-6 py-4">Active Bots</th>
                        <th className="px-6 py-4">Primary Wallet</th>
                        <th className="px-6 py-4">Balances (SOL)</th>
                        <th className="px-6 py-4 text-right">Operations</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-main/50 font-mono">
                      {filteredUsers.map(u => {
                        const activeBots = u.wallets?.reduce((acc, w) => {
                          let count = 0;
                          if (w.botSettings?.freshBot?.enabled) count++;
                          if (w.botSettings?.hypeBot?.enabled) count++;
                          if (w.botSettings?.aiBot?.enabled) count++;
                          return acc + count;
                        }, 0) || 0;
                        
                        return (
                          <tr key={u.uid} className="hover:bg-white/[0.02] transition-colors group">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded bg-bg-tertiary flex items-center justify-center font-black text-brand-primary border border-border-main">
                                  {u.username.charAt(0)}
                                </div>
                                <div>
                                  <div className="font-black text-white font-sans">{u.username}</div>
                                  <div className="text-[8px] text-text-muted uppercase tracking-widest font-bold">{u.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-1">
                                <span className={cn("px-2 py-0.5 rounded text-[7px] font-black uppercase w-fit", 
                                  u.role === UserRole.SUPER_ADMIN ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" :
                                  u.role === UserRole.ADMIN ? "bg-brand-primary/10 text-brand-primary border border-brand-primary/20" : "bg-bg-tertiary text-text-muted border border-border-main"
                                )}>
                                  {u.role}
                                </span>
                                {u.accessId && <span className="text-[7px] text-text-muted opacity-50">ID: {u.accessId}</span>}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className={cn("w-2 h-2 rounded-full", activeBots > 0 ? "bg-brand-primary animate-pulse" : "bg-text-muted")}></div>
                                <span className="text-white font-black">{activeBots} Active</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-text-muted truncate max-w-[120px] hover:text-white transition-colors cursor-help" title={u.wallets?.[0]?.address}>
                                {u.wallets?.[0]?.address ? `${u.wallets[0].address.slice(0, 6)}...${u.wallets[0].address.slice(-4)}` : 'N/A'}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="space-y-1">
                                <div className="flex items-center justify-between gap-4">
                                  <span className="text-[8px] text-text-muted uppercase">Sim</span>
                                  <span className="text-white">{(u.wallets.find(w => w.mode === 'simulation')?.balance || 0).toFixed(2)}</span>
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                  <span className="text-[8px] text-text-muted uppercase">Real</span>
                                  <span className="text-brand-primary">{u.realBalance?.toFixed(2) || '0.00'}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => adminIssueMockBalance(u.uid, 1.0)}
                                  className="p-1.5 bg-bg-tertiary border border-border-main rounded text-brand-primary hover:bg-brand-primary hover:text-black transition-all"
                                  title="Issue +1.0 SOL"
                                >
                                  <Wallet className="w-3 h-3" />
                                </button>
                                {user?.role === UserRole.SUPER_ADMIN && (
                                  <button 
                                    onClick={() => {
                                      if(confirm(`Reset purchase history for all wallets of user ${u.username}?`)) {
                                          u.wallets.forEach(w => resetPurchaseHistory(w.id));
                                          alert("History reset.");
                                      }
                                    }}
                                    className="p-1.5 bg-bg-tertiary border border-border-main rounded text-brand-primary hover:bg-brand-primary hover:text-black transition-all"
                                    title="Reset Purchase History"
                                  >
                                    <RefreshCw className="w-3 h-3" />
                                  </button>
                                )}
                                {user?.role === UserRole.SUPER_ADMIN && (
                                  <button 
                                    onClick={() => {
                                      const newRole = u.role === UserRole.ADMIN ? UserRole.USER : UserRole.ADMIN;
                                      adminUpdateUser(u.uid, { role: newRole });
                                    }}
                                    className="p-1.5 bg-bg-tertiary border border-border-main rounded text-purple-400 hover:bg-purple-400 hover:text-white transition-all"
                                    title={u.role === UserRole.ADMIN ? "Demote to User" : "Promote to Admin"}
                                  >
                                    <Shield className="w-3 h-3" />
                                  </button>
                                )}
                                <button 
                                  onClick={() => adminUpdateUser(u.uid, { disabled: !u.disabled })}
                                  className={cn("p-1.5 border border-border-main rounded transition-all", u.disabled ? "text-brand-primary hover:bg-brand-primary hover:text-black" : "text-brand-danger hover:bg-brand-danger hover:text-white")}
                                >
                                  {u.disabled ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </AdminCard>
            </div>
          )}
          {activeTab === 'funding' && (
            <AdminCard title="Simulation Funding" subtitle="Credit/Debit simulation balances" icon={DollarSign}>
              <div className="space-y-4">
                 <select 
                    value={fundingUserUid}
                    onChange={(e) => {
                        setFundingUserUid(e.target.value);
                        setFundingWalletId(''); // Reset wallet
                    }}
                    className="w-full bg-bg-main border border-border-main rounded-lg p-3 text-sm text-white"
                 >
                    <option value="">Select User</option>
                    {usersList.map(u => <option key={u.uid} value={u.uid}>{u.username}</option>)}
                 </select>
                 
                 {fundingUserUid && (
                    <select
                        value={fundingWalletId}
                        onChange={(e) => setFundingWalletId(e.target.value)}
                        className="w-full bg-bg-main border border-border-main rounded-lg p-3 text-sm text-white"
                    >
                        <option value="">Select Wallet</option>
                        {usersList.find(u => u.uid === fundingUserUid)?.wallets
                            .filter(w => w.mode === WalletMode.SIMULATION)
                            .map(w => <option key={w.id} value={w.id}>{w.name} ({w.balance.toFixed(2)} SOL)</option>)}
                    </select>
                 )}
                 
                 <input type="number" placeholder="Amount (SOL)" value={fundingAmount} onChange={e => setFundingAmount(parseFloat(e.target.value) || 0)} className="w-full bg-bg-main border border-border-main rounded-lg p-3 text-sm text-white" />
                 <input type="text" placeholder="Reason" value={fundingReason} onChange={e => setFundingReason(e.target.value)} className="w-full bg-bg-main border border-border-main rounded-lg p-3 text-sm text-white" />
                 
                 <div className="flex gap-4">
                    <button onClick={async () => { await adminFundSimulationWallet(fundingUserUid, fundingWalletId, fundingAmount, fundingReason); loadData(); }} className="flex-1 py-3 bg-brand-primary text-black font-black text-[10px] uppercase rounded-xl">Credit</button>
                    <button onClick={async () => { await adminFundSimulationWallet(fundingUserUid, fundingWalletId, -fundingAmount, fundingReason); loadData(); }} className="flex-1 py-3 bg-brand-danger text-black font-black text-[10px] uppercase rounded-xl">Debit</button>
                 </div>
              </div>
            </AdminCard>
          )}

          {activeTab === 'trading' && (
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AdminCard title="Global Trading Defaults" subtitle="Initial settings for new user accounts" icon={Activity}>
                   <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="space-y-2">
                            <label className="text-[9px] font-black text-text-muted uppercase">Default Buy Amount</label>
                            <input type="number" defaultValue={0.1} className="w-full bg-bg-main border border-border-main rounded-lg p-3 text-sm text-white font-black" />
                         </div>
                         <div className="space-y-2">
                            <label className="text-[9px] font-black text-text-muted uppercase">Default Stop Loss %</label>
                            <input type="number" defaultValue={15} className="w-full bg-bg-main border border-border-main rounded-lg p-3 text-sm text-white font-black" />
                         </div>
                      </div>
                      <div className="p-4 bg-bg-main border border-border-main rounded-xl">
                         <h4 className="text-[10px] font-black text-white uppercase tracking-widest mb-4">Market Execution</h4>
                         <div className="space-y-4">
                            <div className="flex items-center justify-between">
                               <span className="text-[10px] font-bold text-text-muted uppercase">Allow Live Trading</span>
                               <button className="w-8 h-4 rounded-full bg-brand-primary relative"><div className="w-2 h-2 bg-white rounded-full absolute right-1 top-1"></div></button>
                            </div>
                            <div className="flex items-center justify-between">
                               <span className="text-[10px] font-bold text-text-muted uppercase">Enforce Max Leverage</span>
                               <button className="w-8 h-4 rounded-full bg-bg-tertiary relative"><div className="w-2 h-2 bg-white rounded-full absolute left-1 top-1"></div></button>
                            </div>
                         </div>
                      </div>
                      <button className="w-full py-4 bg-brand-primary text-black font-black text-[10px] uppercase tracking-widest rounded-xl">Save Global Config</button>
                   </div>
                </AdminCard>

                <AdminCard title="RPC & API Management" subtitle="Platform infrastructure controls" icon={Server}>
                   <div className="space-y-6">
                      <div className="space-y-4">
                         <div className="p-4 bg-bg-main border border-border-main rounded-xl space-y-2">
                            <div className="flex justify-between items-center">
                               <span className="text-[9px] font-black text-white uppercase">Solana RPC Mainnet</span>
                               <span className="text-[8px] font-black text-brand-primary uppercase">Active</span>
                            </div>
                            <input type="password" value="********************************" readOnly className="w-full bg-bg-tertiary border-none text-xs text-text-muted font-mono" />
                         </div>
                         <div className="p-4 bg-bg-main border border-border-main rounded-xl space-y-2">
                            <div className="flex justify-between items-center">
                               <span className="text-[9px] font-black text-white uppercase">Helius API Key</span>
                               <span className="text-[8px] font-black text-brand-primary uppercase">Active</span>
                            </div>
                            <input type="password" value="********************************" readOnly className="w-full bg-bg-tertiary border-none text-xs text-text-muted font-mono" />
                         </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                         <button className="flex items-center justify-center gap-2 p-4 bg-bg-tertiary border border-border-main rounded-xl text-white font-black text-[9px] uppercase tracking-widest"><RefreshCw className="w-3 h-3" /> Rotate Keys</button>
                         <button className="flex items-center justify-center gap-2 p-4 bg-bg-tertiary border border-border-main rounded-xl text-white font-black text-[9px] uppercase tracking-widest"><Server className="w-3 h-3" /> Test Nodes</button>
                      </div>
                   </div>
                </AdminCard>
             </div>
          )}

          {activeTab === 'settings' && (
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                   <AdminCard title="System Settings" subtitle="Platform wide behavior and visibility" icon={Globe}>
                      <div className="space-y-8">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                               <h4 className="text-[10px] font-black text-white uppercase tracking-widest border-b border-border-main pb-2">Visibility</h4>
                               <div className="space-y-4">
                                  <div className="flex items-center justify-between">
                                     <span className="text-[10px] font-bold text-text-muted uppercase">Public Signups</span>
                                     <button className="w-8 h-4 rounded-full bg-brand-primary relative"><div className="w-2 h-2 bg-white rounded-full absolute right-1 top-1"></div></button>
                                  </div>
                                  <div className="flex items-center justify-between">
                                     <span className="text-[10px] font-bold text-text-muted uppercase">Leaderboard Active</span>
                                     <button className="w-8 h-4 rounded-full bg-brand-primary relative"><div className="w-2 h-2 bg-white rounded-full absolute right-1 top-1"></div></button>
                                  </div>
                                  <div className="flex items-center justify-between">
                                     <span className="text-[10px] font-bold text-text-muted uppercase">Maintenance Mode</span>
                                     <button className="w-8 h-4 rounded-full bg-bg-tertiary relative"><div className="w-2 h-2 bg-white rounded-full absolute left-1 top-1"></div></button>
                                  </div>
                               </div>
                            </div>
                            <div className="space-y-4">
                               <h4 className="text-[10px] font-black text-white uppercase tracking-widest border-b border-border-main pb-2">Limits</h4>
                               <div className="space-y-4">
                                  <div className="space-y-1">
                                     <label className="text-[8px] font-black text-text-muted uppercase">Max Daily Investment per User</label>
                                     <input type="number" defaultValue={50} className="w-full bg-bg-main border border-border-main rounded p-2 text-xs text-white" />
                                  </div>
                                  <div className="space-y-1">
                                     <label className="text-[8px] font-black text-text-muted uppercase">Platform Fee (%)</label>
                                     <input type="number" defaultValue={1} className="w-full bg-bg-main border border-border-main rounded p-2 text-xs text-white" />
                                  </div>
                               </div>
                            </div>
                         </div>
                         <div className="pt-6 border-t border-border-main">
                            <button className="px-8 py-3 bg-brand-primary text-black font-black text-[10px] uppercase tracking-widest rounded-xl">Apply System Changes</button>
                         </div>
                      </div>
                   </AdminCard>
                </div>
                
                <div className="space-y-6">
                   <AdminCard title="Platform Health" subtitle="Real-time monitoring" icon={Activity}>
                      <div className="space-y-6">
                         <div className="flex justify-between items-center p-4 bg-bg-main border border-border-main rounded-xl">
                            <div className="flex items-center gap-3">
                               <div className="p-2 bg-brand-primary/10 rounded-lg"><Cpu className="w-4 h-4 text-brand-primary" /></div>
                               <span className="text-[9px] font-black text-white uppercase">Engine Load</span>
                            </div>
                            <span className="text-xs font-black text-white">14%</span>
                         </div>
                         <div className="flex justify-between items-center p-4 bg-bg-main border border-border-main rounded-xl">
                            <div className="flex items-center gap-3">
                               <div className="p-2 bg-blue-500/10 rounded-lg"><Database className="w-4 h-4 text-blue-400" /></div>
                               <span className="text-[9px] font-black text-white uppercase">Storage Sync</span>
                            </div>
                            <span className="text-xs font-black text-white">HEALTHY</span>
                         </div>
                         <div className="flex justify-between items-center p-4 bg-bg-main border border-border-main rounded-xl">
                            <div className="flex items-center gap-3">
                               <div className="p-2 bg-purple-500/10 rounded-lg"><HardDrive className="w-4 h-4 text-purple-400" /></div>
                               <span className="text-[9px] font-black text-white uppercase">Memory Utilization</span>
                            </div>
                            <span className="text-xs font-black text-white">2.4GB</span>
                         </div>
                      </div>
                   </AdminCard>
                </div>
             </div>
          )}

          {activeTab === 'trading' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AdminCard title="Global Trading Defaults" subtitle="Base parameters for all active bots" icon={Activity}>
                <div className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-text-muted uppercase">Default Stop Loss (%)</label>
                      <input 
                        type="number" 
                        value={globalConfigs.defaultStopLoss}
                        onChange={(e) => setGlobalConfigs({...globalConfigs, defaultStopLoss: parseFloat(e.target.value) || 0})}
                        className="w-full bg-bg-main border border-border-main rounded p-3 text-[10px] text-white" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-text-muted uppercase">Default Buy Amount (SOL)</label>
                      <input 
                        type="number" 
                        value={globalConfigs.defaultBuyAmount}
                        onChange={(e) => setGlobalConfigs({...globalConfigs, defaultBuyAmount: parseFloat(e.target.value) || 0})}
                        className="w-full bg-bg-main border border-border-main rounded p-3 text-[10px] text-white" 
                      />
                    </div>
                  </div>
                  <button 
                    onClick={saveGlobalConfigs}
                    className="w-full py-3 bg-brand-primary text-black font-black text-[10px] uppercase tracking-widest rounded-xl hover:brightness-110 transition-all"
                  >
                    Save Global Configs
                  </button>
                </div>
              </AdminCard>
              <AdminCard title="Anti-Rug Protocols" subtitle="Security threshold configurations" icon={Shield}>
                <div className="space-y-4 mt-4">
                   <div className="flex items-center justify-between p-3 bg-bg-main border border-border-main rounded">
                      <span className="text-[10px] font-bold text-white uppercase">Automated LP Analysis</span>
                      <div className="w-8 h-4 bg-brand-primary rounded-full relative p-1 cursor-pointer">
                         <div className="w-2 h-2 bg-black rounded-full translate-x-4 transition-all"></div>
                      </div>
                   </div>
                   <div className="flex items-center justify-between p-3 bg-bg-main border border-border-main rounded opacity-50">
                      <span className="text-[10px] font-bold text-white uppercase">Flash-Loan Protection</span>
                      <div className="w-8 h-4 bg-bg-tertiary rounded-full relative p-1 cursor-not-allowed">
                         <div className="w-2 h-2 bg-text-muted rounded-full transition-all"></div>
                      </div>
                   </div>
                </div>
              </AdminCard>

              <AdminCard title="Purchase Registry Reset" subtitle="Reset one-buy status for specific wallets" icon={RefreshCw}>
                <div className="space-y-4 mt-4">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-text-muted uppercase">Select User</label>
                    <select
                      value={selectedUserUid}
                      onChange={(e) => {
                        setSelectedUserUid(e.target.value);
                        setSelectedWalletId('');
                      }}
                      className="w-full bg-bg-main border border-border-main rounded p-3 text-[10px] text-white outline-none focus:border-brand-primary"
                    >
                      <option value="">-- Select User --</option>
                      {usersList.map(u => (
                        <option key={u.uid} value={u.uid}>
                          {u.username} ({u.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-text-muted uppercase">Select Wallet</label>
                    <select
                      value={selectedWalletId}
                      disabled={!selectedUserUid}
                      onChange={(e) => setSelectedWalletId(e.target.value)}
                      className="w-full bg-bg-main border border-border-main rounded p-3 text-[10px] text-white outline-none focus:border-brand-primary disabled:opacity-50"
                    >
                      <option value="">-- Select Wallet --</option>
                      {selectedUserWallets.map(w => (
                        <option key={w.id} value={w.id}>
                          {w.name} ({w.mode.toUpperCase()}) - {w.address.slice(0, 6)}...{w.address.slice(-4)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={handleResetPurchaseHistory}
                    disabled={!selectedWalletId}
                    className="w-full py-3 bg-brand-primary text-black font-black text-[10px] uppercase tracking-widest rounded-xl hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Reset Wallet Registry
                  </button>
                </div>
              </AdminCard>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <AdminCard title="AI Intelligence" subtitle="Model & weighting config" icon={Zap} className="md:col-span-2">
                  <div className="space-y-4 mt-4 font-mono text-[10px]">
                     <div className="p-4 bg-bg-main border border-border-main rounded-xl">
                        <div className="flex justify-between items-center mb-2">
                           <span className="text-white font-black uppercase">Model: Gemini 1.5 Pro</span>
                           <span className="text-brand-primary">ACTIVE</span>
                        </div>
                        <p className="text-text-muted text-[8px] leading-relaxed uppercase tracking-tighter">Current processing node handling all conviction scoring and sentiment analysis across 4,200 active memecoin streams.</p>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-bg-main border border-border-main rounded-xl flex flex-col gap-2">
                           <span className="text-text-muted text-[8px] font-black uppercase">Sentiment Weight</span>
                           <span className="text-white text-lg">75%</span>
                        </div>
                        <div className="p-4 bg-bg-main border border-border-main rounded-xl flex flex-col gap-2">
                           <span className="text-text-muted text-[8px] font-black uppercase">Volume Bias</span>
                           <span className="text-white text-lg">25%</span>
                        </div>
                     </div>
                  </div>
               </AdminCard>
               <AdminCard title="Maintenance" icon={Settings}>
                  <div className="space-y-4 mt-4">
                     <button className="w-full py-4 bg-brand-danger/10 border border-brand-danger/20 text-brand-danger font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-brand-danger/20 transition-all">
                        Enable Maintenance Mode
                     </button>
                     <p className="text-[8px] text-text-muted text-center uppercase tracking-widest leading-relaxed">Warning: This will suspend all bot execution globally across all user accounts.</p>
                  </div>
               </AdminCard>
            </div>
          )}

          {activeTab === 'logs' && (
             <div className="bg-bg-card border border-border-main rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-border-main flex justify-between items-center bg-bg-tertiary/30">
                   <div>
                      <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Audit Terminal</h3>
                      <p className="text-[8px] text-text-muted uppercase tracking-widest mt-0.5">Tracking sensitive system events and administrative actions</p>
                   </div>
                   <button 
                     onClick={loadData} 
                     className="flex items-center gap-2 px-4 py-2 bg-bg-tertiary border border-border-main rounded-lg text-[9px] font-black text-white uppercase tracking-widest hover:bg-white/5 transition-all"
                   >
                     <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
                     Refresh Buffer
                   </button>
                </div>
                <div className="overflow-x-auto">
                   <table className="w-full text-left text-[10px]">
                      <thead>
                         <tr className="bg-bg-tertiary text-text-muted uppercase tracking-[0.2em] font-black border-b border-border-main">
                            <th className="px-6 py-4">Timestamp / Admin</th>
                            <th className="px-6 py-4">Event Context</th>
                            <th className="px-6 py-4">Severity</th>
                            <th className="px-6 py-4">Target Identity</th>
                            <th className="px-6 py-4 text-right">Raw Details</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-border-main/50 font-mono">
                         {auditLogs.map(log => (
                            <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                               <td className="px-6 py-4">
                                  <div className="text-white font-black">{log.timestamp ? format(log.timestamp.toDate(), 'HH:mm:ss') : 'LIVE'}</div>
                                  <div className="text-[8px] text-text-muted uppercase tracking-widest">{log.adminUsername || 'System'}</div>
                               </td>
                               <td className="px-6 py-4">
                                  <span className="text-brand-primary font-black uppercase tracking-widest">[{log.action}]</span>
                               </td>
                               <td className="px-6 py-4">
                                  <span className={cn("px-2 py-0.5 rounded text-[7px] font-black uppercase border", 
                                    log.severity === 'critical' ? "bg-brand-danger/10 text-brand-danger border-brand-danger/20" :
                                    log.severity === 'high' ? "bg-orange-500/10 text-orange-400 border-orange-500/20" :
                                    log.severity === 'medium' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-bg-tertiary text-text-muted border-border-main"
                                  )}>
                                    {log.severity || 'low'}
                                  </span>
                               </td>
                               <td className="px-6 py-4">
                                  <div className="text-white">{log.targetName || 'Global'}</div>
                                  <div className="text-[7px] text-text-muted opacity-50">{log.targetId ? `UID: ${log.targetId.slice(0, 8)}...` : 'N/A'}</div>
                               </td>
                               <td className="px-6 py-4 text-right">
                                  <button 
                                    onClick={() => console.log('Log details:', log.details)}
                                    className="px-2 py-1 bg-bg-tertiary border border-border-main rounded text-[8px] text-text-muted hover:text-white uppercase font-black"
                                  >
                                    View Payload
                                  </button>
                               </td>
                            </tr>
                         ))}
                         {auditLogs.length === 0 && !loading && (
                            <tr>
                               <td colSpan={5} className="py-24 text-center text-text-muted uppercase font-black tracking-[0.3em] opacity-30">
                                  Empty Audit Buffer
                               </td>
                            </tr>
                         )}
                      </tbody>
                   </table>
                </div>
             </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Create User Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
           <motion.div 
             initial={{ opacity: 0, scale: 0.95 }}
             animate={{ opacity: 1, scale: 1 }}
             className="bg-bg-card border border-border-main w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
           >
              <div className="px-6 py-4 border-b border-border-main flex justify-between items-center">
                 <h3 className="text-[10px] font-black text-white uppercase tracking-widest">Create New Account</h3>
                 <button onClick={() => setIsCreateModalOpen(false)} className="text-text-muted hover:text-white"><XCircle className="w-5 h-5" /></button>
              </div>
              <form className="p-6 space-y-4" onSubmit={(e) => { e.preventDefault(); setIsCreateModalOpen(false); }}>
                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-text-muted uppercase">Username</label>
                    <input type="text" required className="w-full bg-bg-main border border-border-main rounded-lg p-3 text-sm text-white font-black" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-text-muted uppercase">Email Address</label>
                    <input type="email" required className="w-full bg-bg-main border border-border-main rounded-lg p-3 text-sm text-white font-black" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-text-muted uppercase">Temporary Password</label>
                    <input type="text" value="AlphaTrader2026!" readOnly className="w-full bg-bg-tertiary border border-border-main rounded-lg p-3 text-sm text-text-muted font-mono" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-text-muted uppercase">Account Access ID</label>
                    <input type="text" value={`AID-B7F9D2E1`} readOnly className="w-full bg-bg-tertiary border border-border-main rounded-lg p-3 text-sm text-text-muted font-mono" />
                 </div>
                 <button type="submit" className="w-full py-4 bg-brand-primary text-black font-black text-[10px] uppercase tracking-widest rounded-xl mt-4">Generate Account</button>
              </form>
           </motion.div>
        </div>
      )}
    </div>
  );
};

export const AdminDashboard = () => (
  <ErrorBoundary componentName="AdminDashboard">
    <AdminDashboardContent />
  </ErrorBoundary>
);
