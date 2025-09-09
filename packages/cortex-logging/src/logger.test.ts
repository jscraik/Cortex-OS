// Test-first implementation: Define the logging interface we want
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLogger, Logger, LogLevel } from './logger';

describe('Logger', () => {
  let mockConsole: {
    log: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    debug: ReturnType<typeof vi.fn>;
    info: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockConsole = {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      info: vi.fn(),
    };

    // Mock global console
    vi.stubGlobal('console', mockConsole);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createLogger', () => {
    it('should create a logger with default configuration', () => {
      const logger = createLogger('test');

      expect(logger).toBeDefined();
      expect(logger.info).toBeDefined();
      expect(logger.warn).toBeDefined();
      expect(logger.error).toBeDefined();
      expect(logger.debug).toBeDefined();
    });

    it('should create a logger with custom log level', () => {
      const logger = createLogger('test', { level: LogLevel.ERROR });

      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      // Only error should be logged
      expect(mockConsole.debug).not.toHaveBeenCalled();
      expect(mockConsole.info).not.toHaveBeenCalled();
      expect(mockConsole.warn).not.toHaveBeenCalled();
      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringMatching(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/),
        expect.stringContaining('[ERROR]'),
        expect.stringContaining('test'),
        'error message',
      );
    });

    it('should include module name in log output', () => {
      const logger = createLogger('cortex-core');

      logger.info('test message');

      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.stringMatching(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/),
        expect.stringContaining('[INFO]'),
        expect.stringContaining('cortex-core'),
        'test message',
      );
    });

    it('should format timestamps correctly', () => {
      const logger = createLogger('test');

      logger.info('test message');

      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.stringMatching(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/),
        expect.stringContaining('[INFO]'),
        expect.stringContaining('test'),
        'test message',
      );
    });

    it('should support structured logging with context', () => {
      const logger = createLogger('test');

      logger.info('user action', { userId: 123, action: 'login' });

      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.stringMatching(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/),
        expect.stringContaining('[INFO]'),
        expect.stringContaining('test'),
        'user action',
        { userId: 123, action: 'login' },
      );
    });

    it('should respect log level hierarchy', () => {
      const logger = createLogger('test', { level: LogLevel.WARN });

      logger.debug('debug');
      logger.info('info');
      logger.warn('warn');
      logger.error('error');

      expect(mockConsole.debug).not.toHaveBeenCalled();
      expect(mockConsole.info).not.toHaveBeenCalled();
      expect(mockConsole.warn).toHaveBeenCalled();
      expect(mockConsole.error).toHaveBeenCalled();
    });
  });

  describe('Logger methods', () => {
    let logger: Logger;

    beforeEach(() => {
      logger = createLogger('test');
    });

    it('should log debug messages', () => {
      logger.debug('debug message');

      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.stringMatching(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/),
        expect.stringContaining('[DEBUG]'),
        expect.stringContaining('test'),
        'debug message',
      );
    });

    it('should log info messages', () => {
      logger.info('info message');

      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.stringMatching(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/),
        expect.stringContaining('[INFO]'),
        expect.stringContaining('test'),
        'info message',
      );
    });

    it('should log warn messages', () => {
      logger.warn('warn message');

      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.stringMatching(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/),
        expect.stringContaining('[WARN]'),
        expect.stringContaining('test'),
        'warn message',
      );
    });

    it('should log error messages', () => {
      logger.error('error message');

      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringMatching(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/),
        expect.stringContaining('[ERROR]'),
        expect.stringContaining('test'),
        'error message',
      );
    });

    it('should handle error objects', () => {
      const error = new Error('test error');
      logger.error('operation failed', error);

      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringMatching(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/),
        expect.stringContaining('[ERROR]'),
        expect.stringContaining('test'),
        'operation failed',
        error,
      );
    });
  });

  describe('Environment-based configuration', () => {
    it('should use INFO level in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const logger = createLogger('test');

      logger.debug('debug message');
      logger.info('info message');

      expect(mockConsole.debug).not.toHaveBeenCalled();
      expect(mockConsole.warn).toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });

    it('should use DEBUG level in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const logger = createLogger('test');

      logger.debug('debug message');

      expect(mockConsole.warn).toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });
  });
});
