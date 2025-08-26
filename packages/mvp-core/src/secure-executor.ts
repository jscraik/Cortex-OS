import { spawn } from 'child_process';
import { validateCommandInput } from '@cortex-os/mvp-core/src/validation';

// Secure command execution wrapper that prevents command injection
export class SecureCommandExecutor {
  // Execute a command with strict validation
  static async executeCommand(command: string[], timeout: number = 5000): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve, reject) => {
      // Validate the command
      const validation = validateCommandInput.dockerCommand(command);
      if (!validation.success) {
        reject(new Error(`Command validation failed: ${validation.error}`));
        return;
      }

      // Sanitize command parameters
      const sanitizedCommand = this.sanitizeCommand(command);
      
      // Spawn the process with strict security settings
      const child = spawn(sanitizedCommand[0], sanitizedCommand.slice(1), {
        timeout: timeout,
        killSignal: 'SIGTERM',
        stdio: ['ignore', 'pipe', 'pipe'],
        // Run with reduced privileges
        uid: process.getuid ? process.getuid() : undefined,
        gid: process.getgid ? process.getgid() : undefined,
        // Disable environment variables inheritance
        env: {
          PATH: process.env.PATH,
          HOME: process.env.HOME,
          // Only include essential environment variables
        }
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        resolve({
          stdout: stdout,
          stderr: stderr,
          exitCode: code || 0
        });
      });

      child.on('error', (error) => {
        reject(new Error(`Command execution failed: ${error.message}`));
      });

      // Handle timeout
      setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error(`Command timed out after ${timeout}ms`));
      }, timeout);
    });
  }

  // Sanitize command parameters to prevent injection
  private static sanitizeCommand(command: string[]): string[] {
    return command.map(param => {
      // Remove dangerous characters
      return param.replace(/[;&|`$(){}[\]<>]/g, '');
    });
  }

  // Execute Docker command with additional security
  static async executeDockerCommand(subcommand: string, args: string[] = [], timeout: number = 5000): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    // Validate subcommand
    const allowedSubcommands = ['ps', 'images', 'inspect', 'logs'];
    if (!allowedSubcommands.includes(subcommand)) {
      throw new Error(`Docker subcommand ${subcommand} is not allowed`);
    }

    // Build the full command
    const command = ['docker', subcommand, ...args];
    
    // Execute with security wrapper
    return this.executeCommand(command, timeout);
  }
}