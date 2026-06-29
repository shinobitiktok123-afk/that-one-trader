export enum LogSeverity {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  CRITICAL = 'critical',
}

interface LogEntry {
  message: string;
  severity: LogSeverity;
  component?: string;
  userId?: string | null;
  stack?: string;
  context?: any;
  timestamp: any;
}

export const logToBackend = async (
  message: string, 
  severity: LogSeverity = LogSeverity.INFO, 
  component?: string, 
  context?: any,
  error?: Error
) => {
  // Firebase logging removed
  console.log(`[Log - ${severity.toUpperCase()}] ${message}`, { message, severity, component, context, stack: error?.stack });
};
