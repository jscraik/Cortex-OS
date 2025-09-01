/**
 * Environment utilities for runtime detection.
 * No side effects outside reading provided process/env objects.
 */
export function hasTty(proc = process) {
  return Boolean(proc.stdin && proc.stdout && proc.stdin.isTTY && proc.stdout.isTTY);
}
export function isCi(env = process.env) {
  return env.CI === 'true';
}
//# sourceMappingURL=env.js.map
