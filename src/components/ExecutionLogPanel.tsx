import React from "react";
import { ExecutionLog } from "../types";
import { Terminal, CheckCircle, AlertTriangle, Info } from "lucide-react";

export const ExecutionLogPanel = ({ logs = [] }: { logs?: ExecutionLog[] }) => {
  return (
    <div className="bg-bg-card border border-border-main rounded-xl flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-border-main flex items-center gap-2 bg-bg-secondary">
        <Terminal className="w-4 h-4 text-brand-primary" />
        <h3 className="text-xs font-black text-white uppercase tracking-widest">
          Execution Logs
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
        {logs.length === 0 ? (
          <div className="text-center text-text-muted text-xs uppercase font-bold py-8">
            Waiting for execution events...
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className={`p-3 rounded-lg border text-xs ${
                log.status === "error"
                  ? "bg-red-500/10 border-red-500/20 text-red-400"
                  : log.status === "success"
                    ? "bg-green-500/10 border-green-500/20 text-green-400"
                    : "bg-blue-500/10 border-blue-500/20 text-blue-400"
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider">
                  {log.status === "error" && (
                    <AlertTriangle className="w-3 h-3" />
                  )}
                  {log.status === "success" && (
                    <CheckCircle className="w-3 h-3" />
                  )}
                  {log.status === "info" && <Info className="w-3 h-3" />}
                  <span>{log.stage}</span>
                </div>
                <span className="text-[9px] opacity-70">
                  {new Date(log.timestamp).toLocaleTimeString([], {
                    hour12: false,
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    fractionalSecondDigits: 3,
                  })}
                </span>
              </div>
              <div className="mb-2 text-white font-medium">{log.message}</div>
              <div className="flex gap-3 text-[10px] uppercase font-bold opacity-70">
                <span>BOT: {log.botType}</span>
                <span>TOKEN: {log.tokenSymbol}</span>
                <span>WALLET: {log.walletName}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
