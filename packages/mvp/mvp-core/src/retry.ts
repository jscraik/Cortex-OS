import { randomInt } from 'node:crypto';

export type RetryPolicy = {
        maxRetries: number;
        backoffMs: number;
        jitter?: boolean;
};

export async function retry<T>(fn: () => Promise<T>, policy: RetryPolicy): Promise<T> {
        let attempt = 0;
        let lastErr: unknown;
        while (attempt <= policy.maxRetries) {
                try {
                        return await fn();
                } catch (e) {
                        lastErr = e;
                        if (attempt++ === policy.maxRetries) break;
                        const jitterMs = policy.jitter ? randomInt(0, Math.max(policy.backoffMs, 1)) : 0;
                        await new Promise((resolve) => setTimeout(resolve, policy.backoffMs + jitterMs));
                }
        }
        throw lastErr;
}
