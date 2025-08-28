/**
 * Environment utilities for runtime detection.
 * No side effects outside reading provided process/env objects.
 */
export function hasTty(proc: Pick<NodeJS.Process, 'stdin' | 'stdout'> = process): boolean {
  return Boolean(proc.stdin && proc.stdout && proc.stdin.isTTY && proc.stdout.isTTY);
}

export function isCi(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.CI === 'true';
}
