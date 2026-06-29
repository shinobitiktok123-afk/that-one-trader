import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Wallet as WalletIcon, Plus, Copy, Check, Trash2, Edit2, ShieldCheck, Download, Eye, X } from 'lucide-react';
import { useWallet } from '../lib/WalletContext';
import { cn } from '../lib/utils';
import { WalletMode, WalletType, UserRole } from '../types';

export const WalletManager = () => {
  const { user, createWallet, createSimulationWallet, fundSimulationWallet, importWallet, renameWallet, setDefaultWallet, revealPrivateKey, walletMode } = useWallet();
  const [importName, setImportName] = useState('');
  const [importKey, setImportKey] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [simName, setSimName] = useState('');
  const [simBalance, setSimBalance] = useState(1000);
  const [showCreateSim, setShowCreateSim] = useState(false);
  const [showFundModal, setShowFundModal] = useState(false);
  const [fundAmount, setFundAmount] = useState<number | ''>('');
  const [fundWalletId, setFundWalletId] = useState<string | null>(null);
  const [revealingWalletId, setRevealingWalletId] = useState<string | null>(null);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [revealPassword, setRevealPassword] = useState('');
  const [fundError, setFundError] = useState('');
  const [fundSuccess, setFundSuccess] = useState('');

  if (!user) return null;

  const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;
  const activeFundWallet = user.wallets.find(w => w.id === fundWalletId);

  const handleFundSubmit = (action: 'credit' | 'debit' | 'reset') => {
      setFundError('');
      setFundSuccess('');
      if (!fundWalletId) return;

      if (action === 'reset') {
          // Find the current balance and set it to 0
          if (activeFundWallet) {
              const amountToReset = -activeFundWallet.balance;
              fundSimulationWallet(fundWalletId, amountToReset);
              setFundSuccess('Balance reset successfully');
          }
          return;
      }

      if (typeof fundAmount !== 'number' || fundAmount <= 0) {
          setFundError('Amount must be greater than 0');
          return;
      }

      // Check max 9 decimals
      const amountStr = fundAmount.toString();
      if (amountStr.includes('.') && amountStr.split('.')[1].length > 9) {
          setFundError('Amount cannot exceed 9 decimal places');
          return;
      }

      if (action === 'debit') {
          fundSimulationWallet(fundWalletId, -fundAmount);
          setFundSuccess('Wallet debited successfully');
      } else {
          fundSimulationWallet(fundWalletId, fundAmount);
          setFundSuccess('Wallet credited successfully');
      }
      setFundAmount('');
  };

  const handleRevealKey = async (walletId: string) => {
      try {
          const key = await revealPrivateKey(walletId, revealPassword);
          setRevealedKey(key);
      } catch (e: any) {
          alert(e.message);
      }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-black text-white uppercase tracking-widest w-full md:w-auto text-center md:text-left">My Wallets</h2>
        <div className="flex gap-4">
            {walletMode === WalletMode.SIMULATION ? (
                <button onClick={() => setShowCreateSim(true)} className="px-6 py-3 bg-brand-primary text-black rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                    <Plus className="w-3 h-3" /> Create Sim Wallet
                </button>
            ) : (
                <>
                    <button onClick={() => setShowImport(true)} className="px-6 py-3 bg-bg-tertiary text-white rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                        <Download className="w-3 h-3" /> Import Wallet
                    </button>
                    <button 
                        onClick={async () => { 
                            const name = prompt("Enter wallet name:"); 
                            if(name) {
                                await createWallet(name);
                            }
                        }}
                        className="px-6 py-3 bg-brand-primary text-black rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                    >
                        <Plus className="w-3 h-3" /> Create Wallet
                    </button>
                </>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {user.wallets
        .filter(w => w.mode === walletMode)
        .map(wallet => (
          <div key={wallet.id} className={cn("p-6 rounded-2xl border bg-bg-card space-y-4", wallet.isDefault ? "border-brand-primary" : "border-border-main")}>
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                    <WalletIcon className="w-5 h-5 text-brand-primary" />
                    <div>
                        <div className="font-bold text-white">{wallet.name}</div>
                        <div className="text-[10px] text-text-muted font-mono">{wallet.address.slice(0, 8)}...{wallet.address.slice(-4)}</div>
                    </div>
                </div>
            </div>
            
            <div className="text-xl font-black text-white">{wallet.balance?.toFixed(4) || 0} SOL</div>
            
            <div className="flex gap-2">
                <button onClick={() => setDefaultWallet(wallet.id)} className="flex-1 p-2 bg-bg-tertiary rounded text-[10px] font-bold uppercase">Default</button>
                {(wallet.mode === WalletMode.REAL || isAdmin) && (
                    <button onClick={() => { setFundWalletId(wallet.id); setShowFundModal(true); setFundError(''); setFundSuccess(''); setFundAmount(''); }} className="p-2 bg-bg-tertiary rounded text-brand-primary hover:text-white"><Plus className="w-4 h-4"/></button>
                )}
                <button onClick={() => setRevealingWalletId(wallet.id)} className="p-2 bg-bg-tertiary rounded text-text-muted hover:text-white"><Eye className="w-4 h-4"/></button>
                <button onClick={() => { const newName = prompt("Rename:", wallet.name); if(newName) renameWallet(wallet.id, newName); }} className="p-2 bg-bg-tertiary rounded text-text-muted hover:text-white"><Edit2 className="w-4 h-4"/></button>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {showCreateSim && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                <div className="bg-bg-card p-6 rounded-xl border border-border-main w-full max-w-md space-y-4">
                    <h3 className="font-black text-white uppercase">Create Simulation Wallet</h3>
                    <input value={simName} onChange={e => setSimName(e.target.value)} placeholder="Wallet Name" className="w-full bg-bg-tertiary border border-border-main rounded p-3 text-xs" />
                    <input type="number" value={simBalance} onChange={e => setSimBalance(parseFloat(e.target.value) || 0)} placeholder="Starting Balance" className="w-full bg-bg-tertiary border border-border-main rounded p-3 text-xs" />
                    <div className="flex gap-2">
                        <button onClick={() => setShowCreateSim(false)} className="flex-1 p-3 bg-bg-tertiary rounded text-[10px] font-bold uppercase">Cancel</button>
                        <button onClick={() => { createSimulationWallet(simName, simBalance); setShowCreateSim(false); }} className="flex-1 p-3 bg-brand-primary text-black rounded text-[10px] font-bold uppercase">Create</button>
                    </div>
                </div>
            </div>
        )}
        {showFundModal && activeFundWallet && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                <div className="bg-bg-card p-6 rounded-xl border border-border-main w-full max-w-md space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="font-black text-white uppercase flex items-center gap-2">
                            <WalletIcon className="w-5 h-5 text-brand-primary" />
                            Fund {activeFundWallet.mode === WalletMode.REAL ? 'Live' : 'Simulation'} Wallet
                        </h3>
                        <span className={cn("px-2 py-1 rounded text-[10px] font-bold uppercase", activeFundWallet.mode === WalletMode.REAL ? "bg-green-500/20 text-green-400" : "bg-purple-500/20 text-purple-400")}>
                            {activeFundWallet.mode === WalletMode.REAL ? 'Live' : 'Simulation'}
                        </span>
                    </div>

                    <div className="text-center p-4 bg-bg-tertiary rounded-lg border border-white/5">
                        <div className="text-sm text-text-muted font-bold uppercase tracking-wider mb-1">Current Balance</div>
                        <div className="text-2xl font-black text-white">{activeFundWallet.balance.toFixed(4)} SOL</div>
                    </div>

                    {fundError && <div className="p-3 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold">{fundError}</div>}
                    {fundSuccess && <div className="p-3 rounded bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-bold">{fundSuccess}</div>}

                    {activeFundWallet.mode === WalletMode.REAL ? (
                        <div className="space-y-4">
                            <div className="text-xs text-text-muted">
                                To fund this live wallet, send SOL on the <span className="font-bold text-white">Solana network</span> to the address below.
                                <br/><br/>
                                <span className="text-brand-primary font-bold">Important:</span> The balance will update automatically when the deposit is detected on-chain.
                            </div>
                            <div className="bg-black p-4 rounded-lg flex items-center justify-between border border-border-main">
                                <div className="font-mono text-xs text-brand-primary break-all max-w-[200px]">{activeFundWallet.address}</div>
                                <button onClick={() => { navigator.clipboard.writeText(activeFundWallet.address); setFundSuccess('Address copied to clipboard!'); setTimeout(() => setFundSuccess(''), 3000); }} className="p-2 bg-bg-tertiary rounded text-white hover:text-brand-primary">
                                    <Copy className="w-4 h-4" />
                                </button>
                            </div>
                            <button onClick={() => setShowFundModal(false)} className="w-full p-3 bg-bg-tertiary rounded text-[10px] font-bold uppercase hover:bg-white/10">Close</button>
                        </div>
                    ) : (
                        <>
                            {isAdmin ? (
                                <div className="space-y-4">
                                    <div className="relative">
                                        <input 
                                            type="number" 
                                            value={fundAmount} 
                                            onChange={e => {
                                                const val = parseFloat(e.target.value);
                                                setFundAmount(isNaN(val) ? '' : val);
                                            }} 
                                            placeholder="Amount (SOL)" 
                                            className="w-full bg-bg-tertiary border border-border-main rounded p-3 pr-16 text-xs text-white" 
                                        />
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                            <button onClick={() => setFundAmount(1000)} className="text-[10px] font-bold text-brand-primary uppercase">Max</button>
                                            <span className="text-xs text-text-muted font-bold">SOL</span>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-2">
                                        <button onClick={() => handleFundSubmit('credit')} className="p-3 bg-green-500/20 text-green-400 border border-green-500/30 rounded text-[10px] font-bold uppercase hover:bg-green-500/30">Credit</button>
                                        <button onClick={() => handleFundSubmit('debit')} className="p-3 bg-red-500/20 text-red-400 border border-red-500/30 rounded text-[10px] font-bold uppercase hover:bg-red-500/30">Debit</button>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleFundSubmit('reset')} className="flex-1 p-3 bg-bg-tertiary rounded text-[10px] font-bold uppercase text-white hover:bg-white/10 border border-border-main">Reset Balance</button>
                                        <button onClick={() => setShowFundModal(false)} className="flex-1 p-3 bg-bg-tertiary rounded text-[10px] font-bold uppercase hover:bg-white/10 border border-border-main">Close</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center p-4">
                                    <ShieldCheck className="w-8 h-8 text-text-muted mx-auto mb-2" />
                                    <div className="text-sm font-bold text-white mb-1">Administrator Access Required</div>
                                    <div className="text-xs text-text-muted mb-4">Only administrators can modify simulation balances manually.</div>
                                    <button onClick={() => setShowFundModal(false)} className="w-full p-3 bg-bg-tertiary rounded text-[10px] font-bold uppercase hover:bg-white/10 border border-border-main">Close</button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        )}
        {showImport && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                <div className="bg-bg-card p-6 rounded-xl border border-border-main w-full max-w-md space-y-4">
                    <h3 className="font-black text-white uppercase">Import Wallet</h3>
                    <input value={importName} onChange={e => setImportName(e.target.value)} placeholder="Wallet Name" className="w-full bg-bg-tertiary border border-border-main rounded p-3 text-xs" />
                    <input value={importKey} onChange={e => setImportKey(e.target.value)} placeholder="Private Key (Base58)" className="w-full bg-bg-tertiary border border-border-main rounded p-3 text-xs" />
                    <div className="flex gap-2">
                        <button onClick={() => setShowImport(false)} className="flex-1 p-3 bg-bg-tertiary rounded text-[10px] font-bold uppercase">Cancel</button>
                        <button onClick={() => { importWallet(importName, importKey); setShowImport(false); }} className="flex-1 p-3 bg-brand-primary text-black rounded text-[10px] font-bold uppercase">Import</button>
                    </div>
                </div>
            </div>
        )}
        {revealingWalletId && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                <div className="bg-bg-card p-6 rounded-xl border border-border-main w-full max-w-md space-y-4">
                    <h3 className="font-black text-white uppercase">Reveal Private Key</h3>
                    {!revealedKey ? (
                        <>
                            <input type="password" value={revealPassword} onChange={e => setRevealPassword(e.target.value)} placeholder="Enter Account Password" className="w-full bg-bg-tertiary border border-border-main rounded p-3 text-xs" />
                            <div className="flex gap-2">
                                <button onClick={() => {setRevealingWalletId(null); setRevealPassword('')}} className="flex-1 p-3 bg-bg-tertiary rounded text-[10px] font-bold uppercase">Cancel</button>
                                <button onClick={() => handleRevealKey(revealingWalletId)} className="flex-1 p-3 bg-brand-primary text-black rounded text-[10px] font-bold uppercase">Verify & Reveal</button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="bg-black p-4 rounded font-mono text-xs text-brand-primary break-all">{revealedKey}</div>
                            <button onClick={() => {setRevealingWalletId(null); setRevealedKey(null); setRevealPassword('')}} className="w-full p-3 bg-bg-tertiary rounded text-[10px] font-bold uppercase">Close</button>
                        </>
                    )}
                </div>
            </div>
        )}
      </AnimatePresence>
    </div>
  );
};
