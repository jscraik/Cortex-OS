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

  const execPromise = new Promise<{ stdout: string; stderr: string; code: number }>(
    (resolve, reject) => {
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
    },
  );

  const timeoutPromise = new Promise<never>((_, reject) => {
    const timer = setTimeout(() => {
      // Wait for a grace period before sending SIGKILL
      const GRACE_PERIOD_MS = 5000;
      const graceTimer = setTimeout(() => {
        // If the process is still running, send SIGKILL
        if (!child.killed) {
          child.kill('SIGKILL');
        }
        reject(
          new Error(
            `Process timed out after ${timeoutMs}ms (SIGTERM), and was forcefully killed after ${GRACE_PERIOD_MS}ms`,
          ),
        );
      }, GRACE_PERIOD_MS);
      // If the process exits during the grace period, clear the grace timer
      child.once('exit', () => clearTimeout(graceTimer));
    }, timeoutMs);
    execPromise.finally(() => clearTimeout(timer));
  });

  return Promise.race([execPromise, timeoutPromise]);
}
