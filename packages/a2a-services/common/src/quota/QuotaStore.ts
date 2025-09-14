export interface QuotaWindowState {
    count: number;
    start: number;
}

export type QuotaResult = 'ok' | 'limit';
export type PerKeyQuotaResult = 'ok' | 'global' | 'limit';

export interface QuotaStore {
    incrGlobal(windowMs: number, limit: number): Promise<QuotaResult>;
    incrPerKey(key: string, windowMs: number, limit: number, global?: { windowMs: number; limit: number }): Promise<PerKeyQuotaResult>;
    metrics(): { globalWindows: number; keys: number };
}

export class InMemoryQuotaStore implements QuotaStore {
    private readonly global: QuotaWindowState = { count: 0, start: Date.now() };
    private readonly perKey = new Map<string, QuotaWindowState>();

    private resetIfNeeded(state: QuotaWindowState, windowMs: number) {
        const now = Date.now();
        if (now - state.start >= windowMs) {
            state.count = 0;
            state.start = now;
        }
    }

    async incrGlobal(windowMs: number, limit: number): Promise<'ok' | 'limit'> {
        this.resetIfNeeded(this.global, windowMs);
        if (this.global.count >= limit) return 'limit';
        this.global.count += 1;
        return 'ok';
    }

    async incrPerKey(
        key: string,
        windowMs: number,
        limit: number,
        global?: { windowMs: number; limit: number },
    ): Promise<'ok' | 'global' | 'limit'> {
        if (global) {
            const g = await this.incrGlobal(global.windowMs, global.limit);
            if (g === 'limit') return 'global';
        }
        let state = this.perKey.get(key);
        if (!state) {
            state = { count: 0, start: Date.now() };
            this.perKey.set(key, state);
        }
        this.resetIfNeeded(state, windowMs);
        if (state.count >= limit) return 'limit';
        state.count += 1;
        return 'ok';
    }

    metrics() {
        return { globalWindows: 1, keys: this.perKey.size };
    }
}

export async function createQuotaStore(): Promise<QuotaStore> {
    const redisUrl = process.env.REDIS_URL?.trim();
    if (!redisUrl) return new InMemoryQuotaStore();
    try {
        // Dynamically resolve redis only if present to avoid hard dependency
        let client: { isOpen: boolean; connect: () => Promise<void>; sendCommand: (args: string[]) => Promise<unknown> } | null = null;
        try {
            // Use require within try to avoid TS resolution at build when dep absent
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const mod = require('redis');
            if (mod && typeof mod.createClient === 'function') {
                client = mod.createClient({ url: redisUrl });
            }
        } catch {
            return new InMemoryQuotaStore();
        }
        if (!client) return new InMemoryQuotaStore();
        if (!client.isOpen) await client.connect();
        if (!client.isOpen) await client.connect();
        const prefix = process.env.REDIS_QUOTA_PREFIX || 'quota';
        return new (class RedisQuotaStore implements QuotaStore {
            incrScriptSha?: string;
            async ensureScript() {
                if (this.incrScriptSha) return;
                // Lua script does atomic increment with window reset semantics
                const script = `
local key=KEYS[1]
local now=tonumber(ARGV[1])
local windowMs=tonumber(ARGV[2])
local limit=tonumber(ARGV[3])
local bucket=redis.call('HMGET', key, 'start','count')
local start=bucket[1] and tonumber(bucket[1]) or now
local count=bucket[2] and tonumber(bucket[2]) or 0
if (now - start) >= windowMs then
    start=now
    count=0
end
if count >= limit then
    return {start,count,'limit'}
end
count = count + 1
redis.call('HMSET', key, 'start', start, 'count', count)
redis.call('PEXPIRE', key, windowMs)
return {start,count,'ok'}
`;
                const shaRes = await client.sendCommand(['SCRIPT', 'LOAD', script]);
                this.incrScriptSha = typeof shaRes === 'string' ? shaRes : undefined;
            }
            async incrGlobal(windowMs: number, limit: number): Promise<QuotaResult> {
                await this.ensureScript();
                const now = Date.now();
                const res = (await client.sendCommand([
                    'EVALSHA',
                    this.incrScriptSha!,
                    '1',
                    `${prefix}:global`,
                    String(now),
                    String(windowMs),
                    String(limit),
                ])) as unknown[];
                const status = String(res[2]);
                return status === 'ok' ? 'ok' : 'limit';
            }
            async incrPerKey(
                key: string,
                windowMs: number,
                limit: number,
                global?: { windowMs: number; limit: number },
            ): Promise<PerKeyQuotaResult> {
                if (global) {
                    const g = await this.incrGlobal(global.windowMs, global.limit);
                    if (g === 'limit') return 'global';
                }
                await this.ensureScript();
                const now = Date.now();
                const res = (await client.sendCommand([
                    'EVALSHA',
                    this.incrScriptSha!,
                    '1',
                    `${prefix}:agent:${key}`,
                    String(now),
                    String(windowMs),
                    String(limit),
                ])) as unknown[];
                const status = String(res[2]);
                return status === 'ok' ? 'ok' : 'limit';
            }
            metrics() {
                // We cannot cheaply list keys without SCAN; return placeholder
                return { globalWindows: 1, keys: -1 };
            }
        })();
    } catch {
        return new InMemoryQuotaStore();
    }
}
