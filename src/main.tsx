import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { WebSocketProvider } from './lib/WebSocketContext.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <WebSocketProvider>
        <App />
      </WebSocketProvider>
    </ErrorBoundary>
  </StrictMode>,
);
