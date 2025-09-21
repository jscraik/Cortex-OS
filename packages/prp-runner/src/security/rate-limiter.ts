import type { NextFunction, Request, Response } from 'express';
import type { RateLimitStore } from './rate-limit-store';
import { resolveRateLimitStoreFromEnv } from './rate-limit-store';

export type KeyFn = (req: Request) => string;

export interface RateLimitOptions {
    windowMs: number; // sliding window size
    max: number; // max requests per window
    keyGenerator?: KeyFn; // default: by API key or IP
    scope?: string; // optional namespace to isolate buckets per-endpoint
    store?: RateLimitStore; // pluggable backend
    adminBypass?: boolean; // skip limit if admin role present
}

interface Bucket {
    hits: number[]; // timestamps (ms)
}

const memoryStore = new Map<string, Bucket>();

function defaultKey(req: Request): string {
    const key = req.header('X-API-Key') || req.header('x-api-key');
    return (key || req.ip || 'anon').toString();
}

export function createRateLimiter(opts: RateLimitOptions) {
    const { windowMs, max, keyGenerator = defaultKey } = opts;
    // Prefer external store if provided or resolvable from env
    const externalStore = opts.store || resolveRateLimitStoreFromEnv();
    return function rateLimiter(req: Request, res: Response, next: NextFunction): void {
        const now = Date.now();
        // Admin bypass
        if (opts.adminBypass) {
            const role = (req.header('X-Role') || req.header('x-role') || '').trim();
            if (role === 'admin') {
                next();
                return;
            }
        }
        const keyBase = keyGenerator(req);
        const scope = opts.scope || 'global';
        const key = `${scope}:${keyBase}`;
        if (externalStore) {
            externalStore
                .hit(key, now, windowMs, max)
                .then((r) => {
                    if (!r.allowed) {
                        res.status(429).json({ error: 'Rate limit exceeded', retryAfter: r.retryAfterSec ?? 60 });
                        return;
                    }
                    next();
                })
                .catch(() => {
                    // On store error, fail open to avoid outage
                    next();
                });
            return;
        }
        const bucket = memoryStore.get(key) ?? { hits: [] };
        bucket.hits = bucket.hits.filter((t) => now - t < windowMs);
        if (bucket.hits.length >= max) {
            const retryAfter = Math.ceil((windowMs - (now - bucket.hits[0])) / 1000);
            res.status(429).json({ error: 'Rate limit exceeded', retryAfter });
            return;
        }
        bucket.hits.push(now);
        memoryStore.set(key, bucket);
        next();
    };
}

// Convenience variants for endpoints
export const perMinute = (max: number) => createRateLimiter({ windowMs: 60_000, max });

export function conditionalRateLimiter(
    predicate: (req: Request) => boolean,
    opts: RateLimitOptions,
) {
    const limiter = createRateLimiter(opts);
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!predicate(req)) {
            next();
            return;
        }
        limiter(req, res, next);
    };
}
