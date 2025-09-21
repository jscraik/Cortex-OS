import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Logger } from '../../src/logging/logger';
import { createRotatingFileStream } from '../../src/logging/rotation';
import type { RotationConfig } from '../../src/logging/types';
import * as fs from 'fs';
import { join } from 'path';

describe('Log Rotation', () => {
  let testDir: string;
  let logFilePath: string;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create test directory
    testDir = join(process.cwd(), 'test-logs-' + Date.now());
    fs.mkdirSync(testDir, { recursive: true });
    logFilePath = join(testDir, 'app.log');
  });

  afterEach(() => {
    // Clean up test directory
    try {
      const files = fs.readdirSync(testDir);
      files.forEach(file => {
        fs.unlinkSync(join(testDir, file));
      });
      fs.unlinkSync(testDir);
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  describe('Size-based rotation', () => {
    it('should rotate log file when it exceeds size limit', async () => {
      // RED: Test fails because implementation doesn't exist
      const config: RotationConfig = {
        type: 'size',
        size: '1KB',
        maxFiles: 3,
        compress: false,
      };

      const stream = createRotatingFileStream(logFilePath, config);
      const logger = new Logger({
        level: 'info',
        format: 'json',
        streams: [
          {
            stream,
            level: 'trace',
          },
        ],
      });

      // Log enough data to trigger rotation (write 2KB)
      const largeMessage = 'x'.repeat(500); // 500 bytes per message
      for (let i = 0; i < 5; i++) {
        logger.info(`Message ${i}`, { data: largeMessage });
      }

      await logger.flush();
      await stream.close?.();

      // Check that files were created
      const files = fs.readdirSync(testDir).sort();
      expect(files.length).toBeGreaterThan(1);
      expect(files[0]).toBe('app.log');
      expect(files[1]).toMatch(/app\.log\.\d+/);

      // Check that the current file is smaller than the limit
      const currentFileStat = fs.statSync(join(testDir, 'app.log'));
      expect(currentFileStat.size).toBeLessThan(1024);
    });

    it('should limit number of rotated files', async () => {
      // RED: Test fails because implementation doesn't exist
      const config: RotationConfig = {
        type: 'size',
        size: '100B', // Very small for testing
        maxFiles: 3,
        compress: false,
      };

      const stream = createRotatingFileStream(logFilePath, config);
      const logger = new Logger({
        level: 'info',
        format: 'json',
        streams: [
          {
            stream,
            level: 'trace',
          },
        ],
      });

      // Log enough to create more than maxFiles
      for (let i = 0; i < 10; i++) {
        logger.info(`Message ${i}`.repeat(10)); // Make messages large
      }

      await logger.flush();
      await stream.close?.();

      const files = fs.readdirSync(testDir).sort();
      expect(files.length).toBe(3); // Should not exceed maxFiles
    });
  });

  describe('Time-based rotation', () => {
    it('should rotate log file based on time interval', async () => {
      // RED: Test fails because implementation doesn't exist
      vi.useFakeTimers();

      const config: RotationConfig = {
        type: 'time',
        interval: '1h',
        maxFiles: 5,
        compress: false,
      };

      const stream = createRotatingFileStream(logFilePath, config);
      const logger = new Logger({
        level: 'info',
        format: 'json',
        streams: [
          {
            stream,
            level: 'trace',
          },
        ],
      });

      // Log initial messages
      logger.info('Initial message');
      await logger.flush();

      // Advance time past rotation interval
      vi.advanceTimersByTime(61 * 60 * 1000); // 61 minutes

      // Log more messages
      logger.info('Message after rotation');
      await logger.flush();

      await stream.close?.();
      vi.useRealTimers();

      const files = fs.readdirSync(testDir).sort();
      expect(files.length).toBeGreaterThan(1);
    });

    it('should rotate at specific time of day', async () => {
      // RED: Test fails because implementation doesn't exist
      vi.setSystemTime(new Date('2024-01-01T23:30:00.000Z'));

      const config: RotationConfig = {
        type: 'time',
        interval: 'daily',
        time: '00:00', // Rotate at midnight
        maxFiles: 7,
        compress: false,
      };

      const stream = createRotatingFileStream(logFilePath, config);
      const logger = new Logger({
        level: 'info',
        format: 'json',
        streams: [
          {
            stream,
            level: 'trace',
          },
        ],
      });

      logger.info('Before midnight');
      await logger.flush();

      // Advance to just after midnight
      vi.setSystemTime(new Date('2024-01-02T00:01:00.000Z'));

      logger.info('After midnight');
      await logger.flush();

      await stream.close?.();
      vi.useRealTimers();

      const files = fs.readdirSync(testDir);
      expect(files.length).toBeGreaterThan(1);
    });
  });

  describe('File compression', () => {
    it('should compress rotated files when enabled', async () => {
      // RED: Test fails because implementation doesn't exist
      const config: RotationConfig = {
        type: 'size',
        size: '100B',
        maxFiles: 3,
        compress: true,
      };

      const stream = createRotatingFileStream(logFilePath, config);
      const logger = new Logger({
        level: 'info',
        format: 'json',
        streams: [
          {
            stream,
            level: 'trace',
          },
        ],
      });

      // Log enough to trigger rotation
      for (let i = 0; i < 5; i++) {
        logger.info('Message '.repeat(30)); // Large messages
      }

      await logger.flush();
      await stream.close?.();

      const files = fs.readdirSync(testDir);
      const compressedFiles = files.filter(f => f.endsWith('.gz'));
      expect(compressedFiles.length).toBeGreaterThan(0);
    });
  });

  describe('File naming patterns', () => {
    it('should use custom naming pattern', async () => {
      // RED: Test fails because implementation doesn't exist
      const config: RotationConfig = {
        type: 'size',
        size: '100B',
        maxFiles: 3,
        compress: false,
        filenamePattern: 'app-%Y-%m-%d-%H%M%S.log',
      };

      const stream = createRotatingFileStream(logFilePath, config);
      const logger = new Logger({
        level: 'info',
        format: 'json',
        streams: [
          {
            stream,
            level: 'trace',
          },
        ],
      });

      // Log to trigger rotation
      for (let i = 0; i < 5; i++) {
        logger.info('Message '.repeat(30));
      }

      await logger.flush();
      await stream.close?.();

      const files = fs.readdirSync(testDir);
      expect(files.some(f => f.startsWith('app-') && f.endsWith('.log'))).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should handle permission errors gracefully', async () => {
      // RED: Test fails because implementation doesn't exist
      const readonlyDir = join(testDir, 'readonly');
      mkdirSync(readonlyDir, { recursive: true });
      const readonlyLogPath = join(readonlyDir, 'app.log');

      // Make directory read-only (simulate permission error)
      vi.spyOn(fs, 'writeFile').mockImplementationOnce((path, data, cb) => {
        const error = new Error('Permission denied');
        (error as any).code = 'EACCES';
        if (cb) cb(error);
        return Promise.reject(error);
      });

      const config: RotationConfig = {
        type: 'size',
        size: '100B',
        maxFiles: 3,
        compress: false,
      };

      const stream = createRotatingFileStream(readonlyLogPath, config);
      const logger = new Logger({
        level: 'info',
        format: 'json',
        streams: [
          {
            stream,
            level: 'trace',
          },
        ],
      });

      // Should not throw, but should handle error
      expect(() => {
        logger.info('Test message');
      }).not.toThrow();

      await logger.flush();
      await stream.close?.();
    });

    it('should handle disk space errors', async () => {
      // RED: Test fails because implementation doesn't exist
      vi.spyOn(fs, 'stat').mockImplementationOnce((path, cb) => {
        const error = new Error('No space left on device');
        (error as any).code = 'ENOSPC';
        if (cb) cb(error);
        return Promise.reject(error);
      });

      const config: RotationConfig = {
        type: 'size',
        size: '100B',
        maxFiles: 3,
        compress: false,
      };

      const stream = createRotatingFileStream(logFilePath, config);
      const logger = new Logger({
        level: 'info',
        format: 'json',
        streams: [
          {
            stream,
            level: 'trace',
          },
        ],
      });

      // Should continue logging despite disk space error
      logger.info('Test message');
      await logger.flush();
      await stream.close?.();
    });
  });

  describe('Cleanup and maintenance', () => {
    it('should clean up old log files', async () => {
      // RED: Test fails because implementation doesn't exist
      const config: RotationConfig = {
        type: 'size',
        size: '100B',
        maxFiles: 2,
        compress: false,
      };

      const stream = createRotatingFileStream(logFilePath, config);
      const logger = new Logger({
        level: 'info',
        format: 'json',
        streams: [
          {
            stream,
            level: 'trace',
          },
        ],
      });

      // Create some old files manually
      fs.writeFileSync(join(testDir, 'app.log.1'), 'old log 1');
      fs.writeFileSync(join(testDir, 'app.log.2'), 'old log 2');
      fs.writeFileSync(join(testDir, 'app.log.3'), 'old log 3');

      // Log to trigger rotation and cleanup
      for (let i = 0; i < 5; i++) {
        logger.info('Message '.repeat(30));
      }

      await logger.flush();
      await stream.close?.();

      const files = fs.readdirSync(testDir).sort();
      expect(files.length).toBeLessThanOrEqual(3); // maxFiles + current
    });

    it('should not delete current log file during cleanup', async () => {
      // RED: Test fails because implementation doesn't exist
      const config: RotationConfig = {
        type: 'size',
        size: '100B',
        maxFiles: 1,
        compress: false,
      };

      const stream = createRotatingFileStream(logFilePath, config);
      const logger = new Logger({
        level: 'info',
        format: 'json',
        streams: [
          {
            stream,
            level: 'trace',
          },
        ],
      });

      logger.info('Important message');
      await logger.flush();

      await stream.close?.();

      // Current log file should still exist
      expect(fs.existsSync(logFilePath)).toBe(true);
    });
  });
});