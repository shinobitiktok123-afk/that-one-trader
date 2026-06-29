import React, { useState } from 'react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { RightSidebar } from './RightSidebar';

export const Layout = ({ children, isNeuralStreamOpen, setIsNeuralStreamOpen }: { children: React.ReactNode, isNeuralStreamOpen: boolean, setIsNeuralStreamOpen: (o: boolean) => void }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-200 flex flex-col font-sans">
      <Navbar isNeuralStreamOpen={isNeuralStreamOpen} setIsNeuralStreamOpen={setIsNeuralStreamOpen} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
        <main className="flex-1 overflow-auto p-6 bg-[#0c0c0c]">
          {children}
        </main>
        <RightSidebar />
      </div>
    </div>
  );
};
