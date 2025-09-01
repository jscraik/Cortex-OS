import winston from 'winston';
import type { LoggingConfig } from '../config/schema.js';

// Log levels
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Structured log entry
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  service: string;
  component?: string;
  correlationId?: string;
  userId?: string;
  metadata?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

// Logger interface
export interface ILogger {
  debug(message: string, metadata?: Record<string, any>): void;
  info(message: string, metadata?: Record<string, any>): void;
  warn(message: string, metadata?: Record<string, any>): void;
  error(message: string, error?: Error | Record<string, any>): void;
  child(component: string): ILogger;
}

// Winston-based logger implementation
class WinstonLogger implements ILogger {
  private logger: winston.Logger;
  private serviceName: string;
  private component?: string;

  constructor(config: LoggingConfig, serviceName: string, component?: string) {
    this.serviceName = serviceName;
    this.component = component;

    // Create winston logger
    this.logger = winston.createLogger({
      level: config.level,
      format: this.createFormat(config.format),
      transports: this.createTransports(config),
      defaultMeta: {
        service: serviceName,
        component,
      },
    });
  }

  private createFormat(format: 'json' | 'text'): winston.Logform.Format {
    const baseFormat = winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
    );

    if (format === 'json') {
      return winston.format.combine(baseFormat, winston.format.json());
    }

    // Text format
    return winston.format.combine(
      baseFormat,
      winston.format.colorize(),
      winston.format.printf(({ timestamp, level, message, service, component, ...meta }) => {
        const componentStr = component ? `[${component}] ` : '';
        const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
        return `${timestamp} ${level}: ${componentStr}${message}${metaStr}`;
      }),
    );
  }

  private createTransports(config: LoggingConfig): winston.transport[] {
    const transports: winston.transport[] = [];

    // Console transport
    if (config.destination === 'stdout' || config.destination === 'both') {
      transports.push(
        new winston.transports.Console({
          handleExceptions: true,
          handleRejections: true,
        }),
      );
    }

    // File transport
    if ((config.destination === 'file' || config.destination === 'both') && config.filePath) {
      transports.push(
        new winston.transports.File({
          filename: config.filePath,
          maxsize: this.parseFileSize(config.maxFileSize),
          maxFiles: config.maxFiles,
          handleExceptions: true,
          handleRejections: true,
        }),
      );
    }

    return transports;
  }

  private parseFileSize(sizeStr: string): number {
    const units: Record<string, number> = {
      b: 1,
      kb: 1024,
      mb: 1024 * 1024,
      gb: 1024 * 1024 * 1024,
    };

    const match = sizeStr.toLowerCase().match(/^(\d+)(\w*)$/);
    if (!match) {
      return 10 * 1024 * 1024; // Default 10MB
    }

    const [, size, unit] = match;
    return parseInt(size, 10) * (units[unit] || 1);
  }

  debug(message: string, metadata?: Record<string, any>): void {
    this.logger.debug(message, metadata);
  }

  info(message: string, metadata?: Record<string, any>): void {
    this.logger.info(message, metadata);
  }

  warn(message: string, metadata?: Record<string, any>): void {
    this.logger.warn(message, metadata);
  }

  error(message: string, error?: Error | Record<string, any>): void {
    if (error instanceof Error) {
      this.logger.error(message, {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      });
    } else {
      this.logger.error(message, error);
    }
  }

  child(component: string): ILogger {
    return new WinstonLogger(
      {
        level: this.logger.level as LogLevel,
        format: 'json', // Default to JSON for child loggers
        destination: 'stdout',
        maxFileSize: '10mb',
        maxFiles: 5,
      },
      this.serviceName,
      component,
    );
  }
}

// Simple console logger for fallback
class ConsoleLogger implements ILogger {
  private serviceName: string;
  private component?: string;

  constructor(serviceName: string, component?: string) {
    this.serviceName = serviceName;
    this.component = component;
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    const componentStr = this.component ? `[${this.component}] ` : '';
    return `${timestamp} [${level.toUpperCase()}] ${componentStr}${message}`;
  }

  debug(message: string, metadata?: Record<string, any>): void {
    console.debug(this.formatMessage('debug', message), metadata || '');
  }

  info(message: string, metadata?: Record<string, any>): void {
    console.info(this.formatMessage('info', message), metadata || '');
  }

  warn(message: string, metadata?: Record<string, any>): void {
    console.warn(this.formatMessage('warn', message), metadata || '');
  }

  error(message: string, error?: Error | Record<string, any>): void {
    if (error instanceof Error) {
      console.error(this.formatMessage('error', message), error);
    } else {
      console.error(this.formatMessage('error', message), error || '');
    }
  }

  child(component: string): ILogger {
    return new ConsoleLogger(this.serviceName, component);
  }
}

// Logger factory
let globalConfig: LoggingConfig = {
  level: 'info',
  format: 'json',
  destination: 'stdout',
  maxFileSize: '10mb',
  maxFiles: 5,
};

let globalServiceName = 'github-mcp-server';

// Configure global logger settings
export function configureLogging(config: LoggingConfig, serviceName?: string): void {
  globalConfig = { ...config };
  if (serviceName) {
    globalServiceName = serviceName;
  }
}

// Create a logger instance
export function createLogger(component?: string): ILogger {
  try {
    return new WinstonLogger(globalConfig, globalServiceName, component);
  } catch (error) {
    // Fallback to console logger if Winston fails
    console.warn('Failed to create Winston logger, falling back to console logger:', error);
    return new ConsoleLogger(globalServiceName, component);
  }
}

// Global logger instance
export const Logger = createLogger();

// Correlation ID management
class CorrelationManager {
  private static correlationKey = Symbol.for('github-mcp-correlation-id');

  static setCorrelationId(id: string): void {
    (globalThis as any)[CorrelationManager.correlationKey] = id;
  }

  static getCorrelationId(): string | undefined {
    return (globalThis as any)[CorrelationManager.correlationKey];
  }

  static generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  static withCorrelationId<T>(id: string, fn: () => T): T {
    const previousId = CorrelationManager.getCorrelationId();
    CorrelationManager.setCorrelationId(id);

    try {
      return fn();
    } finally {
      if (previousId) {
        CorrelationManager.setCorrelationId(previousId);
      } else {
        delete (globalThis as any)[CorrelationManager.correlationKey];
      }
    }
  }
}

export { CorrelationManager };

// Structured logging helpers
export interface StructuredLogData {
  operation?: string;
  repository?: string;
  pullRequest?: number;
  issue?: number;
  workflow?: string;
  duration?: number;
  statusCode?: number;
  userId?: string;
  userAgent?: string;
  clientIp?: string;
  requestId?: string;
  apiEndpoint?: string;
  rateLimitRemaining?: number;
  [key: string]: any;
}

// Enhanced logger with structured data support
export class StructuredLogger {
  private baseLogger: ILogger;
  private defaultData: StructuredLogData;

  constructor(baseLogger: ILogger, defaultData: StructuredLogData = {}) {
    this.baseLogger = baseLogger;
    this.defaultData = defaultData;
  }

  private mergeData(data?: StructuredLogData): Record<string, any> {
    const correlationId = CorrelationManager.getCorrelationId();
    return {
      ...this.defaultData,
      ...data,
      ...(correlationId && { correlationId }),
    };
  }

  debug(message: string, data?: StructuredLogData): void {
    this.baseLogger.debug(message, this.mergeData(data));
  }

  info(message: string, data?: StructuredLogData): void {
    this.baseLogger.info(message, this.mergeData(data));
  }

  warn(message: string, data?: StructuredLogData): void {
    this.baseLogger.warn(message, this.mergeData(data));
  }

  error(message: string, error?: Error, data?: StructuredLogData): void {
    this.baseLogger.error(
      message,
      error ? { ...this.mergeData(data), error } : this.mergeData(data),
    );
  }

  child(component: string, additionalData?: StructuredLogData): StructuredLogger {
    return new StructuredLogger(this.baseLogger.child(component), {
      ...this.defaultData,
      ...additionalData,
    });
  }

  // Operation timing
  time(operation: string): () => void {
    const startTime = Date.now();
    return () => {
      const duration = Date.now() - startTime;
      this.info(`Operation completed: ${operation}`, { operation, duration });
    };
  }

  // API request logging
  logRequest(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    data?: StructuredLogData,
  ): void {
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    const message = `${method} ${url} ${statusCode} ${duration}ms`;

    this[level](message, {
      ...data,
      method,
      url,
      statusCode,
      duration,
      apiEndpoint: url,
    });
  }

  // GitHub-specific logging
  logGitHubOperation(
    operation: string,
    repository: string,
    result: 'success' | 'failure',
    data?: StructuredLogData,
  ): void {
    const message = `GitHub ${operation} ${result} for ${repository}`;

    if (result === 'success') {
      this.info(message, { ...data, operation, repository, result });
    } else {
      this.error(message, undefined, { ...data, operation, repository, result });
    }
  }

  // Rate limit logging
  logRateLimit(remaining: number, limit: number, resetTime: Date, data?: StructuredLogData): void {
    const percentage = (remaining / limit) * 100;
    const message = `GitHub rate limit: ${remaining}/${limit} (${percentage.toFixed(1)}%)`;

    const level = percentage < 10 ? 'warn' : 'debug';
    this[level](message, {
      ...data,
      rateLimitRemaining: remaining,
      rateLimitLimit: limit,
      rateLimitReset: resetTime.toISOString(),
      rateLimitPercentage: percentage,
    });
  }
}

// Create structured logger
export function createStructuredLogger(
  component?: string,
  defaultData?: StructuredLogData,
): StructuredLogger {
  const baseLogger = createLogger(component);
  return new StructuredLogger(baseLogger, defaultData);
}

// Performance monitoring
export class PerformanceLogger {
  private logger: StructuredLogger;
  private metrics: Map<string, { count: number; totalTime: number; avgTime: number }> = new Map();

  constructor(logger: StructuredLogger) {
    this.logger = logger;
  }

  measureAsync<T>(
    operation: string,
    fn: () => Promise<T>,
    context?: StructuredLogData,
  ): Promise<T> {
    const startTime = Date.now();

    return fn()
      .then((result) => {
        this.recordMetric(operation, Date.now() - startTime, 'success', context);
        return result;
      })
      .catch((error) => {
        this.recordMetric(operation, Date.now() - startTime, 'error', { ...context, error });
        throw error;
      });
  }

  measure<T>(operation: string, fn: () => T, context?: StructuredLogData): T {
    const startTime = Date.now();

    try {
      const result = fn();
      this.recordMetric(operation, Date.now() - startTime, 'success', context);
      return result;
    } catch (error) {
      this.recordMetric(operation, Date.now() - startTime, 'error', { ...context, error });
      throw error;
    }
  }

  private recordMetric(
    operation: string,
    duration: number,
    result: 'success' | 'error',
    context?: StructuredLogData,
  ): void {
    // Update rolling metrics
    const metric = this.metrics.get(operation) || { count: 0, totalTime: 0, avgTime: 0 };
    metric.count++;
    metric.totalTime += duration;
    metric.avgTime = metric.totalTime / metric.count;
    this.metrics.set(operation, metric);

    // Log the operation
    this.logger.info(`Operation ${result}: ${operation}`, {
      ...context,
      operation,
      duration,
      result,
      avgDuration: metric.avgTime,
      operationCount: metric.count,
    });
  }

  getMetrics(): Record<string, { count: number; totalTime: number; avgTime: number }> {
    return Object.fromEntries(this.metrics);
  }

  resetMetrics(): void {
    this.metrics.clear();
  }
}

// Health check logging
export function logHealthCheck(
  component: string,
  status: 'healthy' | 'unhealthy',
  details: Record<string, any>,
  logger?: ILogger,
): void {
  const log = logger || Logger;
  const message = `Health check ${status}: ${component}`;

  if (status === 'healthy') {
    log.info(message, { component, status, ...details });
  } else {
    log.error(message, { component, status, ...details });
  }
}
