import type { NextFunction, Request, Response } from 'express';
import { createClient, type RedisClientType } from 'redis';

// NOTE: This is a Redis-based rate limiter for production use.
// It provides persistent storage and efficient cleanup with TTL support.

interface RequestRecord {
    count: number;
    startTime: number;
}

export interface RedisRateLimiterOptions {
    limit?: number;
    windowMs?: number;
    redisUrl?: string;
    prefix?: string;
}

export class RedisRateLimiter {
    private client: RedisClientType | null = null;
    private isConnected = false;
    private prefix: string;

    constructor(private options: RedisRateLimiterOptions = {}) {
        this.prefix = options.prefix || 'a2a:rate-limit';
    }

    async connect(): Promise<void> {
        if (this.isConnected) return;

        const redisUrl = this.options.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379';
        this.client = createClient({ url: redisUrl });

        this.client.on('error', (err: any) => {
            console.error('Redis connection error:', err);
        });

        try {
            await this.client.connect();
            this.isConnected = true;
        } catch (error) {
            console.error('Failed to connect to Redis:', error);
            this.isConnected = false;
        }
    }

    async disconnect(): Promise<void> {
        if (this.client && this.isConnected) {
            await this.client.quit();
            this.isConnected = false;
        }
    }

    async rateLimiter(req: Request, res: Response, next: NextFunction): Promise<void> {
        if (!this.isConnected || !this.client) {
            // Fallback to in-memory rate limiter if Redis is not available
            this.fallbackRateLimiter(req, res, next);
            return;
        }

        const limit = this.options.limit || 5;
        const windowMs = this.options.windowMs || 60_000;

        const xff = req.headers['x-forwarded-for'];
        const forwarded = Array.isArray(xff) ? xff[0] : xff;
        const ip: string = (forwarded ?? req.ip ?? '').toString();

        const key = `${this.prefix}:${ip}`;
        const now = Date.now();

        try {
            // Lua script for atomic rate limiting with window reset
            const script = `
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local windowMs = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

local data = redis.call('HMGET', key, 'count', 'startTime')
local count = tonumber(data[1]) or 0
local startTime = tonumber(data[2]) or now

if (now - startTime) >= windowMs then
    count = 1
    startTime = now
else
    count = count + 1
end

if count > limit then
    redis.call('HMSET', key, 'count', count, 'startTime', startTime)
    redis.call('PEXPIRE', key, windowMs)
    return {count, startTime, 0}
else
    redis.call('HMSET', key, 'count', count, 'startTime', startTime)
    redis.call('PEXPIRE', key, windowMs)
    return {count, startTime, 1}
end
`;

            const result = await this.client.eval(script, {
                keys: [key],
                arguments: [String(limit), String(windowMs), String(now)],
            }) as [number, number, number];

            const [count, startTime, allowed] = result;

            if (allowed === 0) {
                const retryAfter = Math.ceil((startTime + windowMs - now) / 1000);
                res.setHeader('Retry-After', retryAfter);
                res.status(429).send('Too Many Requests');
                return;
            }

            next();
        } catch (error) {
            console.error('Redis rate limiter error:', error);
            // Fallback to in-memory rate limiter if Redis fails
            this.fallbackRateLimiter(req, res, next);
            return;
        }
    }

    // In-memory fallback implementation
    private requestMap = new Map<string, RequestRecord>();

    private fallbackRateLimiter(req: Request, res: Response, next: NextFunction): void {
        const limit = this.options.limit || 5;
        const windowMs = this.options.windowMs || 60_000;

        const xff = req.headers['x-forwarded-for'];
        const forwarded = Array.isArray(xff) ? xff[0] : xff;
        const ip: string = (forwarded ?? req.ip ?? '').toString();
        const currentTime = Date.now();

        // cleanup stale entries
        for (const [key, record] of this.requestMap) {
            if (currentTime - record.startTime >= windowMs) {
                this.requestMap.delete(key);
            }
        }

        const record = this.requestMap.get(ip);

        if (!record || currentTime - record.startTime >= windowMs) {
            this.requestMap.set(ip, { count: 1, startTime: currentTime });
            next();
            return;
        }

        record.count += 1;
        if (record.count > limit) {
            const retryAfter = Math.ceil(
                (record.startTime + windowMs - currentTime) / 1000,
            );
            res.setHeader('Retry-After', retryAfter);
            res.status(429).send('Too Many Requests');
        } else {
            next();
        }
    }
}

export function createRedisRateLimiter(options: RedisRateLimiterOptions = {}) {
    const limiter = new RedisRateLimiter(options);

    // Attempt to connect to Redis
    limiter.connect().catch((error) => {
        console.warn('Failed to connect to Redis for rate limiting, falling back to in-memory:', error);
    });

    return limiter.rateLimiter.bind(limiter);
}
