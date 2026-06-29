import React, { createContext, useContext, useEffect, useState } from 'react';
import { AISignal } from '../types';

interface WebSocketContextType {
  signals: AISignal[];
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'offline';
  lastUpdated: string;
  selectedToken: AISignal | null;
  setSelectedToken: (token: AISignal | null) => void;
  isNeuralStreamEnabled: boolean;
  enableNeuralStream: () => void;
  disableNeuralStream: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const useWebSocketSignals = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketSignals must be used within a WebSocketProvider');
  }
  return context;
};

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [signals, setSignals] = useState<AISignal[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'offline'>('connecting');
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [selectedToken, setSelectedToken] = useState<AISignal | null>(null);
  
  const [isNeuralStreamEnabled, setIsNeuralStreamEnabled] = useState<boolean>(() => {
      const stored = localStorage.getItem('neural_stream_enabled');
      return stored !== 'false'; // Defaults to true
  });

  const enableNeuralStream = () => {
      setIsNeuralStreamEnabled(true);
      localStorage.setItem('neural_stream_enabled', 'true');
  };

  const disableNeuralStream = () => {
      setIsNeuralStreamEnabled(false);
      localStorage.setItem('neural_stream_enabled', 'false');
      setSignals([]); // Clear UI cards
      setConnectionStatus('disconnected');
      setIsConnected(false);
  };

  useEffect(() => {
    if (!isNeuralStreamEnabled) return;

    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let heartbeatInterval: NodeJS.Timeout | null = null;
    let isActive = true;
    let reconnectAttempts = 0;
    const maxReconnectDelay = 30000;

    const getReconnectDelay = (attempts: number) => {
      const delay = Math.min(Math.pow(2, attempts) * 1000, maxReconnectDelay);
      return delay + 500; // jitter
    };

    const startHeartbeat = () => {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      heartbeatInterval = setInterval(() => {
        if (ws?.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 20000);
    };

    const connect = () => {
      if (!isActive) return;

      if (!navigator.onLine) {
        setConnectionStatus('offline');
        setIsConnected(false);
        reconnectTimeout = setTimeout(connect, 5000);
        return;
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/api/stream`;

      console.log(`[WS Client] Attempting connection to ${wsUrl} (Attempt ${reconnectAttempts + 1})`);
      setConnectionStatus(reconnectAttempts > 0 ? 'reconnecting' : 'connecting');
      
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('[WS Client] Connection opened successfully');
        reconnectAttempts = 0;
        if (isActive) {
          setIsConnected(true);
          setConnectionStatus('connected');
          startHeartbeat();
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (!isActive) return;

          if (data.type === 'init' || data.type === 'update') {
            setSignals(data.tokens || []);
            setLastUpdated(new Date().toISOString());
          } else if (data.type === 'pong') {
            // Heartbeat response received
          }
        } catch (err) {
          console.error('[WS Client] Message parse error:', err);
        }
      };

      ws.onclose = (event) => {
        console.warn(`[WS Client] Connection closed (Code: ${event.code}, Reason: ${event.reason || 'None'})`);
        if (isActive) {
          setIsConnected(false);
          setConnectionStatus('disconnected');
          if (heartbeatInterval) clearInterval(heartbeatInterval);
          
          const delay = getReconnectDelay(reconnectAttempts);
          reconnectAttempts++;
          console.log(`[WS Client] Reconnecting in ${Math.round(delay/1000)}s...`);
          reconnectTimeout = setTimeout(connect, delay);
        }
      };

      ws.onerror = (err: any) => {
        console.error('[WS Client] WebSocket Error:', err);
      };
    };

    const handleOnline = () => {
      console.log('[WS Client] Network online, attempting reconnection...');
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      reconnectAttempts = 0;
      connect();
    };

    const handleOffline = () => {
      console.log('[WS Client] Network offline');
      setConnectionStatus('offline');
      setIsConnected(false);
      if (ws) ws.close();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    connect();

    return () => {
      isActive = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (ws) ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (heartbeatInterval) clearInterval(heartbeatInterval);
    };
  }, [isNeuralStreamEnabled]);

  return (
    <WebSocketContext.Provider value={{ signals, isConnected, connectionStatus, lastUpdated, selectedToken, setSelectedToken, isNeuralStreamEnabled, enableNeuralStream, disableNeuralStream }}>
      {children}
    </WebSocketContext.Provider>
  );
};
