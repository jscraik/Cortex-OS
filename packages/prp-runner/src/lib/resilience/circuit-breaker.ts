export interface CircuitBreakerOptions {
    threshold?: number; // consecutive failures to open
    timeout?: number; // ms to stay open before half-open
    onStateChange?: (state: 'closed' | 'open' | 'half-open') => void;
}

type State = 'closed' | 'open' | 'half-open';

export class CircuitBreaker {
    private readonly threshold: number;
    private readonly timeout: number;
    private readonly onChange?: (state: 'closed' | 'open' | 'half-open') => void;
    private state: State = 'closed';
    private failures = 0;
    private openedAt = 0;

    constructor(opts: CircuitBreakerOptions = {}) {
        this.threshold = opts.threshold ?? 5;
        this.timeout = opts.timeout ?? 30_000;
        this.onChange = opts.onStateChange;
    }

    private toHalfOpenIfTimeout(): void {
        if (this.state === 'open' && Date.now() - this.openedAt >= this.timeout) {
            this.state = 'half-open';
            this.failures = 0;
            this.onChange?.('half-open');
        }
    }

    async call<T>(fn: () => Promise<T>): Promise<T> {
        this.toHalfOpenIfTimeout();
        if (this.state === 'open') {
            throw new Error('Circuit open');
        }
        try {
            const result = await fn();
            // success path
            this.failures = 0;
            if (this.state === 'half-open') {
                this.state = 'closed';
                this.onChange?.('closed');
            }
            return result;
        } catch (err) {
            this.failures += 1;
            if (this.failures >= this.threshold) {
                this.state = 'open';
                this.openedAt = Date.now();
                this.onChange?.('open');
            }
            throw err;
        }
    }
}

export async function retry<T>(fn: () => Promise<T>, attempts = 3, backoffMs = 50): Promise<T> {
    let lastErr: unknown;
    for (let i = 0; i < attempts; i++) {
        try {
            return await fn();
        } catch (err) {
            lastErr = err;
            if (i < attempts - 1) await new Promise((r) => setTimeout(r, backoffMs));
        }
    }
    throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

