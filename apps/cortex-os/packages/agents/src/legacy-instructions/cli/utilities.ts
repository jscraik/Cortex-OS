/**
 * @file CLI Utilities
 * @description Shared utility functions for the CLI system
 * @split_from simple-cli.ts
 */

import type { CLIFlags, ParsedFlags } from './types/index.js';

export class CLIUtilities {
  /**
   * Parse command line flags and arguments
   */
  static parseFlags(args: string[]): ParsedFlags {
    const flags: CLIFlags = {};
    const parsedArgs: string[] = [];
    
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      if (arg.startsWith('--')) {
        const [key, value] = arg.slice(2).split('=');
        if (value) {
          flags[key] = value;
        } else if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
          flags[key] = args[++i];
        } else {
          flags[key] = true;
        }
      } else if (arg.startsWith('-') && arg.length > 1) {
        const key = arg.slice(1);
        if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
          flags[key] = args[++i];
        } else {
          flags[key] = true;
        }
      } else {
        parsedArgs.push(arg);
      }
    }
    
    return { flags, args: parsedArgs };
  }

  /**
   * Print error message with consistent formatting
   */
  static printError(message: string): void {
    console.error(`❌ Error: ${message}`);
  }

  /**
   * Print success message with consistent formatting
   */
  static printSuccess(message: string): void {
    console.log(`✅ ${message}`);
  }

  /**
   * Print warning message with consistent formatting
   */
  static printWarning(message: string): void {
    console.warn(`⚠️  Warning: ${message}`);
  }

  /**
   * Print info message with consistent formatting
   */
  static printInfo(message: string): void {
    console.log(`ℹ️  ${message}`);
  }

  /**
   * Generate timestamp for logging
   */
  static getTimestamp(): string {
    return new Date().toISOString();
  }

  /**
   * Format time duration in human readable format
   */
  static formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
    return `${(ms / 3600000).toFixed(1)}h`;
  }

  /**
   * Format bytes in human readable format
   */
  static formatBytes(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
  }

  /**
   * Validate command arguments count
   */
  static validateArgCount(args: string[], min: number, max?: number): boolean {
    if (args.length < min) {
      this.printError(`Expected at least ${min} arguments, got ${args.length}`);
      return false;
    }
    if (max !== undefined && args.length > max) {
      this.printError(`Expected at most ${max} arguments, got ${args.length}`);
      return false;
    }
    return true;
  }

  /**
   * Check if running in verbose mode
   */
  static isVerbose(flags: CLIFlags): boolean {
    return !!(flags.verbose || flags.v);
  }

  /**
   * Get current working directory safely
   */
  static getCurrentWorkingDirectory(): string {
    try {
      return process.cwd();
    } catch {
      return '/';
    }
  }
}