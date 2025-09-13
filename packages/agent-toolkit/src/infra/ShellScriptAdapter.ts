import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';

const execFileAsync = promisify(execFile);

/**
 * Base class for shell script adapters
 */
export abstract class ShellScriptAdapter {
  protected readonly scriptPath: string;
  protected readonly timeout: number;

  constructor(scriptName: string, timeout = 30000) {
    this.scriptPath = join(__dirname, '../../tools', scriptName);
    this.timeout = timeout;
  }

  /**
   * Execute shell script with arguments and return parsed JSON result
   */
  protected async executeScript(args: string[]): Promise<unknown> {
    try {
      const { stdout, stderr } = await execFileAsync(this.scriptPath, args, {
        timeout: this.timeout,
        encoding: 'utf8',
      });

      if (stderr) {
        console.warn(`Script ${this.scriptPath} stderr:`, stderr);
      }

      return JSON.parse(stdout);
    } catch (error) {
      if (error instanceof Error) {
        // Handle timeout
        if (error.message.includes('timeout')) {
          throw new Error(`Script execution timed out after ${this.timeout}ms`);
        }

        // Handle JSON parse errors
        if (error.message.includes('JSON')) {
          throw new Error(`Invalid JSON output from script: ${error.message}`);
        }

        // Handle execution errors
        throw new Error(`Script execution failed: ${error.message}`);
      }

      throw error;
    }
  }

  /**
   * Check if script file exists and is executable
   */
  protected async validateScript(): Promise<void> {
    try {
      const fs = await import('node:fs/promises');
      await fs.access(this.scriptPath, fs.constants.F_OK | fs.constants.X_OK);
    } catch {
      throw new Error(`Script not found or not executable: ${this.scriptPath}`);
    }
  }
}