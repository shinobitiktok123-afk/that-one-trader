import React from 'react';

export const RightSidebar = () => {
  return (
    <aside className="w-80 border-l border-gray-800 bg-[#0a0a0a] p-6">
        <h2 className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-6">Active Wallet</h2>
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
            <p className="text-sm font-medium text-gray-400">Main Wallet</p>
            <p className="text-3xl font-bold text-white mt-1">4.20 <span className="text-sm font-normal text-gray-500">SOL</span></p>
        </div>
        <div className="mt-8">
            <h3 className="text-sm font-bold text-white mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
                <button className="bg-brand-primary text-black font-bold py-2 rounded-lg">Buy</button>
                <button className="bg-gray-800 text-white font-bold py-2 rounded-lg">Sell</button>
            </div>
        </div>
    </aside>
  );
};
