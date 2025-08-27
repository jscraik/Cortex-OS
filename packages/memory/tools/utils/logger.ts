/**
 * @file_path apps/cortex-os/packages/memory/tools/utils/logger.ts
 * @description Simple logger utility for memory tools
 * @maintainer @jamiescottcraik
 * @last_updated 2025-08-16
 * @version 1.0.0
 * @status active
 */

// Simple lightweight logger with support for different levels
class MemoryLogger {
  private silent: boolean = false;

  constructor(options: { silent?: boolean } = {}) {
    this.silent = options.silent || false;
  }

  /**
   * Log an informational message
   */
  info(message: string): void {
    if (this.silent) return;
    // Use timestamp for logs
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0]; // HH:MM:SS
    console.log(`${timestamp} [INFO]: ${message}`);
  }

  /**
   * Log a warning message
   */
  warn(message: string): void {
    if (this.silent) return;
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    console.log(`${timestamp} [WARN]: ${message}`);
  }

  /**
   * Log an error message
   */
  error(message: string): void {
    if (this.silent) return;
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    console.error(`${timestamp} [ERROR]: ${message}`);
  }

  /**
   * Log a debug message
   */
  debug(message: string): void {
    if (this.silent) return;
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    console.log(`${timestamp} [DEBUG]: ${message}`);
  }

  /**
   * Set the logger to silent mode
   */
  setSilent(silent: boolean): void {
    this.silent = silent;
  }

  /**
   * Get the current silent mode status
   */
  isSilent(): boolean {
    return this.silent;
  }
}

// Create a default logger instance
const logger = new MemoryLogger();

// Export both the class and default instance
export { logger as default, MemoryLogger };
