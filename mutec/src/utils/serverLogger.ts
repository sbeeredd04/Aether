// @/utils/serverLogger.ts
import { config } from '@/config';
import chalk from 'chalk';
import boxen from 'boxen';

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

const serverLog = (level: LogLevel, color: chalk.Chalk, message: string, context?: object) => {
  if (logLevels[level] < currentLogLevel) return;

  const formattedMessage = formatMessage(level, message);
  console.log(color(formattedMessage));

  if (context) {
    const contextStr = JSON.stringify(context, null, 2);
    if (level === 'error' && config.isDev) {
        const boxenOptions: boxen.Options = {
            padding: 1,
            margin: 1,
            borderStyle: 'double',
            borderColor: 'red',
            title: 'Error Context',
            titleAlignment: 'center',
        };
      console.log(boxen(contextStr, boxenOptions));
    } else {
      console.log(chalk.gray(contextStr));
    }
  }
};

const serverLogger = {
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
    serverLog('error', chalk.red.bold, message, context);
  },
};

export default serverLogger; 