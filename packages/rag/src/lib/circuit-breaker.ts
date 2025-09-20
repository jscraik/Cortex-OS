export type BreakerState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerOptions {
    failureThreshold: number; // failures before opening
    resetTimeoutMs: number; // time window to transition from open -> half-open
    now?: () => number; // inject time for tests (ms)
}

export class CircuitBreaker {
    private state: BreakerState = 'closed';
    private failures = 0;
    private openedAt = 0;
    private readonly threshold: number;
    private readonly resetMs: number;
    private readonly now: () => number;

    constructor(opts: CircuitBreakerOptions) {
        this.threshold = Math.max(1, opts.failureThreshold);
        this.resetMs = Math.max(0, opts.resetTimeoutMs);
        this.now = opts.now ?? (() => Date.now());
    }

    async execute<T>(op: () => Promise<T>): Promise<T> {
        const t = this.now();
        if (this.state === 'open') {
            if (t - this.openedAt >= this.resetMs) {
                this.state = 'half-open';
            } else {
                throw new Error('Circuit open');
            }
        }

        try {
            const result = await op();
            // success -> reset
            this.failures = 0;
            this.state = 'closed';
            return result;
        } catch (err) {
            // failure
            this.failures++;
            if (this.failures >= this.threshold) {
                this.state = 'open';
                this.openedAt = this.now();
            }
            throw err;
        }
    }
}
