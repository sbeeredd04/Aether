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
const isServer = typeof window === 'undefined';

const formatMessage = (level: string, message: string, context?: object) => {
  const timestamp = new Date().toISOString();
  let formattedMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  if (context) {
    formattedMessage += `\\n${JSON.stringify(context, null, 2)}`;
  }
  return formattedMessage;
};

let logger: {
    debug: (message: string, context?: object) => void;
    info: (message: string, context?: object) => void;
    warn: (message: string, context?: object) => void;
    error: (message: string, context?: object) => void;
};

if (isServer) {
  // These are required dynamically only on the server to prevent
  // webpack from bundling them on the client.
  const chalk = require('chalk');
  const boxen = require('boxen');

  const serverLog = (level: LogLevel, color: any, message: string, context?: object) => {
    if (logLevels[level] < currentLogLevel) return;

    let formattedMessage = formatMessage(level, message);
    if (context) {
      formattedMessage += `\\n${JSON.stringify(context, null, 2)}`;
    }
    
    console.log(color(formattedMessage));

    if (level === 'error' && config.isDev) {
      console.log(boxen(chalk.red.bold('Error Context'), { padding: 1, margin: 1, borderStyle: 'double' }));
      console.log(context);
    }
  };
  
  logger = {
    debug: (message: string, context?: object) => {
      serverLog('debug', chalk.blue, message, context);
    },
    info: (message: string, context?: object) => {
      serverLog('info', chalk.green, message, context);
    },
    warn: (message: string, context?: object) => {
      serverLog('warn', chalk.yellow, message, context);
    },
    error: (message: string, context?: object) => {
      serverLog('error', chalk.red, message, context);
    },
  };

} else {
    
  const clientLog = (level: LogLevel, color: string, message: string, context?: object) => {
    if (logLevels[level] < currentLogLevel) return;

    const formattedMessage = formatMessage(level, message, context);
    
    switch (level) {
      case 'debug':
        console.debug(`%c${formattedMessage}`, `color: ${color}`);
        break;
      case 'info':
        console.info(`%c${formattedMessage}`, `color: ${color}`);
        break;
      case 'warn':
        console.warn(`%c${formattedMessage}`, `color: ${color}`);
        break;
      case 'error':
        console.error(`%c${formattedMessage}`, `color: ${color}`);
        break;
    }
  };

  logger = {
    debug: (message: string, context?: object) => {
      clientLog('debug', 'blue', message, context);
    },
    info: (message: string, context?: object) => {
      clientLog('info', 'green', message, context);
    },
    warn: (message: string, context?: object) => {
      clientLog('warn', 'orange', message, context);
    },
    error: (message: string, context?: object) => {
      clientLog('error', 'red', message, context);
    },
  };
}

export default logger; 