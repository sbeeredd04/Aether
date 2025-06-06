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

const formatMessage = (level: string, message: string, context?: object) => {
  const timestamp = new Date().toISOString();
  let formattedMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  if (context) {
    // Basic context formatting for both client and server
    formattedMessage += ` | context: ${JSON.stringify(context)}`;
  }
  return formattedMessage;
};

const log = (level: LogLevel, color: string, message: string, context?: object) => {
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

const logger = {
  debug: (message: string, context?: object) => log('debug', 'blue', message, context),
  info: (message: string, context?: object) => log('info', 'green', message, context),
  warn: (message: string, context?: object) => log('warn', 'orange', message, context),
  error: (message: string, context?: object) => log('error', 'red', message, context),
};

export default logger; 