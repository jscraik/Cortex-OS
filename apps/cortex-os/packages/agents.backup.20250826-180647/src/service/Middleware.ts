import type { Task, Result } from "../domain/types.js";
import { withTimeout as sharedWithTimeout } from "@cortex-os/utils";

export type Middleware = (
  next: (t: Task) => Promise<Result>
) => (t: Task) => Promise<Result>;

export const withTimeout = (): Middleware => (next) => async (t) => {
  const started = Date.now();
  const p = next(t);
  const timeout = t.budget.wallClockMs;
  const timeoutError = new Error("wallClockMs exceeded");
  return sharedWithTimeout(p, timeout, timeoutError).catch(() => ({
    taskId: (t as any).id,
    ok: false,
    error: { code: "TIMEOUT", message: "wallClockMs exceeded" },
    usage: { steps: 0, durationMs: Date.now() - started },
  }));
};

