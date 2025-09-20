export interface TokenBucketOptions {
    capacity: number; // max tokens in bucket
    refillPerSecond: number; // tokens added per second
    now?: () => number; // ms timestamp function for testing
}

export class TokenBucket {
    private tokens: number;
    private lastRefill: number;
    private readonly now: () => number;
    constructor(private readonly opts: TokenBucketOptions) {
        if (opts.capacity <= 0 || opts.refillPerSecond < 0) {
            throw new Error('Invalid token bucket configuration');
        }
        this.tokens = opts.capacity;
        this.now = opts.now ?? (() => Date.now());
        this.lastRefill = this.now();
    }

    private refill(): void {
        const current = this.now();
        const elapsedMs = current - this.lastRefill;
        if (elapsedMs <= 0) return;
        const toAdd = (elapsedMs / 1000) * this.opts.refillPerSecond;
        this.tokens = Math.min(this.opts.capacity, this.tokens + toAdd);
        this.lastRefill = current;
    }

    tryRemove(tokens = 1): boolean {
        if (tokens <= 0) return true;
        this.refill();
        if (this.tokens >= tokens) {
            this.tokens -= tokens;
            return true;
        }
        return false;
    }

    get available(): number {
        this.refill();
        return this.tokens;
    }
}

export function createTokenBucket(options: TokenBucketOptions): TokenBucket {
    return new TokenBucket(options);
}
