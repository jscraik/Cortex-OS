import { spawn } from 'child_process';

export interface RunCommandOptions {
  timeoutMs?: number;
}

export async function runCommand(
  command: string,
  args: string[] = [],
  { timeoutMs = 30_000 }: RunCommandOptions = {},
): Promise<{ stdout: string; stderr: string; code: number }> {
  const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });

  const execPromise = new Promise<{ stdout: string; stderr: string; code: number }>((resolve, reject) => {
    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (d) => {
      stdout += d.toString();
    });
    child.stderr?.on('data', (d) => {
      stderr += d.toString();
    });

    child.on('error', (err) => {
      reject(err);
    });

    child.on('close', (code) => {
      resolve({ stdout, stderr, code: code ?? 0 });
    });
  });

  const timeoutPromise = new Promise<never>((_, reject) => {
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`Process timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    execPromise.finally(() => clearTimeout(timer));
  });

  return Promise.race([execPromise, timeoutPromise]);
}
