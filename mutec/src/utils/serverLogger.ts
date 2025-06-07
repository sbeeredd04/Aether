// @/utils/serverLogger.ts
import { config } from '@/config';

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

const logLevels: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

const currentLogLevel = logLevels[config.logging];

const formatMessage = (level: string, message: string) => {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
};

const serverLog = (level: LogLevel, message: string, context?: object) => {
  if (logLevels[level] < currentLogLevel) return;

  const formattedMessage = formatMessage(level, message);
  
  // Simple colored console output without chalk
  const colors: Record<LogLevel, string> & { reset: string } = {
    debug: '\x1b[34m',    // blue
    info: '\x1b[32m',     // green
    warn: '\x1b[33m',     // yellow
    error: '\x1b[31m\x1b[1m', // red bold
    silent: '\x1b[0m',    // no color for silent
    reset: '\x1b[0m'      // reset
  };
  
  if (level !== 'silent') {
    console.log(`${colors[level]}${formattedMessage}${colors.reset}`);
  }

  if (context) {
    const contextStr = JSON.stringify(context, null, 2);
    if (level === 'error' && config.isDev) {
      console.log(`${colors.error}ERROR CONTEXT:${colors.reset}`);
      console.log(contextStr);
    } else {
      console.log(`\x1b[90m${contextStr}\x1b[0m`); // gray
    }
  }
};

const serverLogger = {
  debug: (message: string, context?: object) => {
    serverLog('debug', message, context);
  },
  info: (message: string, context?: object) => {
    serverLog('info', message, context);
  },
  warn: (message: string, context?: object) => {
    serverLog('warn', message, context);
  },
  error: (message: string, context?: object) => {
    serverLog('error', message, context);
  },
};

export default serverLogger; 