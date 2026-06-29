import * as React from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import { logToBackend, LogSeverity } from '../../lib/logger';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    logToBackend(
      error.message, 
      LogSeverity.ERROR, 
      this.props.componentName || 'UnknownComponent', 
      { errorInfo }, 
      error
    );
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6 bg-bg-main">
          <div className="max-w-md w-full bg-bg-secondary border border-red-500/20 rounded-2xl p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white uppercase tracking-wider">Component Error</h2>
              <p className="text-sm text-text-muted">
                Something went wrong while rendering this section. We've logged the issue.
              </p>
              {this.state.error && (
                <div className="mt-4 p-3 bg-bg-tertiary rounded-lg text-left overflow-hidden">
                  <p className="text-[10px] font-mono text-red-400 break-all leading-relaxed">
                    {this.state.error.message}
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={this.handleRetry}
                className="flex items-center justify-center gap-2 w-full py-3 bg-brand-primary text-black font-black uppercase text-xs rounded-xl hover:opacity-90 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                Retry Connection
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex items-center justify-center gap-2 w-full py-3 bg-bg-tertiary text-white font-black uppercase text-xs rounded-xl border border-border-main hover:bg-bg-main transition-all"
              >
                <Home className="w-4 h-4" />
                Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
