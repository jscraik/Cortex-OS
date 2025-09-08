// Minimal interface to make test compile (but fail)
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

export interface LoggerConfig {
  level?: LogLevel;
}

export function createLogger(moduleName: string, config?: LoggerConfig): Logger {
  const defaultLevel = process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG;
  const level = config?.level ?? defaultLevel;

  const formatTimestamp = (): string => {
    return new Date().toISOString();
  };

  const shouldLog = (messageLevel: LogLevel): boolean => {
    return messageLevel >= level;
  };

  return {
    debug: (message: string, ...args: unknown[]): void => {
      if (shouldLog(LogLevel.DEBUG)) {
        const timestamp = formatTimestamp();
        console.warn(timestamp, '[DEBUG]', moduleName, message, ...args);
      }
    },
    info: (message: string, ...args: unknown[]): void => {
      if (shouldLog(LogLevel.INFO)) {
        const timestamp = formatTimestamp();
        console.warn(timestamp, '[INFO]', moduleName, message, ...args);
      }
    },
    warn: (message: string, ...args: unknown[]): void => {
      if (shouldLog(LogLevel.WARN)) {
        const timestamp = formatTimestamp();
        console.warn(timestamp, '[WARN]', moduleName, message, ...args);
      }
    },
    error: (message: string, ...args: unknown[]): void => {
      if (shouldLog(LogLevel.ERROR)) {
        const timestamp = formatTimestamp();
        console.error(timestamp, '[ERROR]', moduleName, message, ...args);
      }
    },
  };
}
