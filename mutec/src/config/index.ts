const isDev = process.env.NODE_ENV === 'development';

interface AppConfig {
  isDev: boolean;
  debug: boolean;
  logging: 'debug' | 'info' | 'warn' | 'error' | 'silent';
}

export const config: AppConfig = {
  isDev,
  // Set debug to true in development for more verbose logging
  debug: isDev,
  // 'debug' in dev, 'warn' in prod
  logging: isDev ? 'debug' : 'warn',
}; 