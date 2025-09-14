/*
 * Simple in-memory schema cache with TTL + max entries + LRU eviction.
 * This is intentionally lightweight; for production a distributed cache (Redis) should be used.
 */
export interface SchemaCacheMetrics {
    hits: number;
    misses: number;
    loads: number; // successful loader executions
    evictions: number;
    size: number;
}

export interface SchemaCacheOptions {
    ttlMs: number;            // time to live for each entry
    maxEntries: number;       // hard cap on number of cached entries
    now?: () => number;       // injectable clock for tests
}

interface Entry<V> { value: V; expiresAt: number; }

export interface SchemaCache<V = unknown> {
    get<T extends V>(key: string, loader: () => Promise<T> | T): Promise<T>;
    peek<T extends V>(key: string): T | undefined;
    delete(key: string): void;
    clear(): void;
    metrics(): SchemaCacheMetrics;
}

export function createSchemaCache<V = unknown>({ ttlMs, maxEntries, now = () => Date.now() }: SchemaCacheOptions): SchemaCache<V> {
    if (ttlMs <= 0) throw new Error('ttlMs must be > 0');
    if (maxEntries <= 0) throw new Error('maxEntries must be > 0');

    // Map used as LRU: most recently used moved to end.
    const store = new Map<string, Entry<V>>();
    const metrics: SchemaCacheMetrics = { hits: 0, misses: 0, loads: 0, evictions: 0, size: 0 };

    function touch(key: string, entry: Entry<V>) {
        store.delete(key); // delete then set to move to end (MRU)
        store.set(key, entry);
    }

    function evictIfNeeded() {
        while (store.size > maxEntries) {
            // Oldest = first inserted (least recently used due to touch())
            const oldestKey = store.keys().next().value as string | undefined;
            if (oldestKey === undefined) break;
            store.delete(oldestKey);
            metrics.evictions += 1;
        }
        metrics.size = store.size;
    }

    async function get<T extends V>(key: string, loader: () => Promise<T> | T): Promise<T> {
        const existing = store.get(key);
        const nowTs = now();
        if (existing && existing.expiresAt > nowTs) {
            metrics.hits += 1;
            touch(key, existing);
            return existing.value as T;
        }
        if (existing) {
            // expired
            store.delete(key);
        }
        metrics.misses += 1;
        const loaded = await loader();
        metrics.loads += 1;
        const entry: Entry<V> = { value: loaded, expiresAt: nowTs + ttlMs };
        touch(key, entry);
        evictIfNeeded();
        return loaded;
    }

    function peek<T extends V>(key: string): T | undefined {
        const e = store.get(key);
        if (!e) return undefined;
        if (e.expiresAt <= now()) {
            store.delete(key);
            metrics.misses += 1; // treat stale peek as miss for observability
            metrics.size = store.size;
            return undefined;
        }
        return e.value as T;
    }

    function del(key: string) {
        if (store.delete(key)) {
            metrics.size = store.size;
        }
    }

    function clear() {
        store.clear();
        metrics.size = 0;
    }

    function getMetrics(): SchemaCacheMetrics { return { ...metrics, size: store.size }; }

    return { get, peek, delete: del, clear, metrics: getMetrics };
}
