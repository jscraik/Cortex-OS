export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export interface RateLimiterOptions {
  readonly windowMs: number;
  readonly maxRequests: number;
}

interface RateState {
  count: number;
  windowStart: number;
}

export class RateLimiter {
  private readonly options: RateLimiterOptions;
  private readonly states = new Map<string, RateState>();

  constructor(options: RateLimiterOptions) {
    this.options = options;
  }

  consume(key: string, weight = 1): void {
    const now = Date.now();
    const existing = this.states.get(key);
    if (!existing || now - existing.windowStart >= this.options.windowMs) {
      this.states.set(key, { count: weight, windowStart: now });
      return;
    }

    const next = existing.count + weight;
    if (next > this.options.maxRequests) {
      throw new RateLimitError('Rate limit exceeded for the provided token.');
    }
    existing.count = next;
  }

  reset(key?: string): void {
    if (key) {
      this.states.delete(key);
    } else {
      this.states.clear();
    }
  }
}
