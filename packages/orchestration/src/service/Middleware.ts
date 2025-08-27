import type { RunState, Step } from "../domain/types.js";

export type Middleware = (
  next: (rs: RunState, step: Step) => Promise<RunState>
) => (rs: RunState, step: Step) => Promise<RunState>;

// Maximum backoff time to prevent infinite delays (30 seconds)
const MAX_BACKOFF_MS = 30000;

export const withRetry = (): Middleware => (next) => async (rs, step) => {
  const rp = step.retry ?? { maxRetries: 0, backoffMs: 0, jitter: true };
  let attempt = 0;
  
  // eslint-disable-next-line no-constant-condition
  for (;;) {
    try {
      return await next(rs, step);
    } catch (e) {
      if (attempt++ >= rp.maxRetries) throw e;
      
      // Calculate backoff with jitter and cap
      const jitter = rp.jitter ? Math.floor(Math.random() * rp.backoffMs) : 0;
      const backoffTime = Math.min(rp.backoffMs + jitter, MAX_BACKOFF_MS);
      
      await new Promise((r) => setTimeout(r, backoffTime));
    }
  }
};

