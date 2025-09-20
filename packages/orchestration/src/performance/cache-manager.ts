/**
 * nO Master Agent Loop - Intelligent Caching Manager
 * 
 * Provides multi-layer caching with optional Redis backend, LRU in-memory cache,
 * and intelligent cache strategies for performance optimization.
 * 
 * Co-authored-by: brAInwav Development Team
 */

export interface CacheConfig {
    redis: {
        enabled: boolean;
        url: string;
        password?: string;
        db?: number;
        keyPrefix?: string;
        defaultTTL: number; // seconds
    };
    memory: {
        enabled: boolean;
        maxSize: number; // number of entries
        defaultTTL: number; // milliseconds
    };
    strategies: {
        writeThrough: boolean;
        writeBehind: boolean;
        readThrough: boolean;
    };
}

export interface CacheEntry<T = unknown> {
    key: string;
    value: T;
    ttl: number;
    createdAt: number;
    lastAccessed: number;
    accessCount: number;
    size: number; // bytes
}

export interface CacheStats {
    hits: number;
    misses: number;
    sets: number;
    deletes: number;
    evictions: number;
    memoryUsage: number;
    totalKeys: number;
}

/**
 * Multi-layer Cache Manager (In-Memory Implementation)
 */
export class CacheManager {
    private config: CacheConfig;
    private memoryCache: Map<string, CacheEntry> = new Map();
    private accessOrder: string[] = []; // For LRU eviction
    private stats: CacheStats = {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        evictions: 0,
        memoryUsage: 0,
        totalKeys: 0,
    };

    constructor(config: CacheConfig) {
        this.config = config;
        this.startCleanupInterval();
    }

    /**
     * Get value from cache
     */
    async get<T = unknown>(key: string): Promise<T | null> {
        const cacheKey = this.buildKey(key);

        try {
            // Try memory cache
            if (this.config.memory.enabled) {
                const memoryResult = this.getFromMemory<T>(cacheKey);
                if (memoryResult !== null) {
                    this.stats.hits++;
                    return memoryResult;
                }
            }

            this.stats.misses++;
            return null;

        } catch (error) {
            console.error('Cache get error:', error);
            this.stats.misses++;
            return null;
        }
    }

    /**
     * Set value in cache
     */
    async set<T = unknown>(
        key: string,
        value: T,
        ttl?: number
    ): Promise<boolean> {
        const cacheKey = this.buildKey(key);
        const memoryTTL = (ttl || this.config.memory.defaultTTL) * 1000; // Convert to ms

        try {
            // Write to memory cache if enabled
            if (this.config.memory.enabled) {
                this.setInMemory(cacheKey, value, memoryTTL);
            }

            this.stats.sets++;
            return true;

        } catch (error) {
            console.error('Cache set error:', error);
            return false;
        }
    }

    /**
     * Delete value from cache
     */
    async delete(key: string): Promise<boolean> {
        const cacheKey = this.buildKey(key);

        try {
            let deleted = false;

            // Delete from memory cache
            if (this.config.memory.enabled && this.memoryCache.has(cacheKey)) {
                const entry = this.memoryCache.get(cacheKey)!;
                this.stats.memoryUsage -= entry.size;
                this.memoryCache.delete(cacheKey);
                this.removeFromAccessOrder(cacheKey);
                deleted = true;
            }

            if (deleted) {
                this.stats.deletes++;
                this.stats.totalKeys--;
            }

            return deleted;

        } catch (error) {
            console.error('Cache delete error:', error);
            return false;
        }
    }

    /**
     * Get or set pattern - get value, or compute and cache if not found
     */
    async getOrSet<T = unknown>(
        key: string,
        compute: () => Promise<T>,
        ttl?: number
    ): Promise<T> {
        const cached = await this.get<T>(key);
        if (cached !== null) {
            return cached;
        }

        try {
            const computed = await compute();
            await this.set(key, computed, ttl);
            return computed;
        } catch (error) {
            console.error('Cache getOrSet compute error:', error);
            throw error;
        }
    }

    /**
     * Check if key exists in cache
     */
    async exists(key: string): Promise<boolean> {
        const cacheKey = this.buildKey(key);

        // Check memory cache
        if (this.config.memory.enabled && this.memoryCache.has(cacheKey)) {
            const entry = this.memoryCache.get(cacheKey)!;
            if (!this.isExpired(entry)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Get multiple values at once
     */
    async getMultiple<T = unknown>(keys: string[]): Promise<Map<string, T | null>> {
        const result = new Map<string, T | null>();

        // Process in parallel for better performance
        const promises = keys.map(async key => {
            const value = await this.get<T>(key);
            return { key, value };
        });

        const results = await Promise.allSettled(promises);
        results.forEach((promiseResult, index) => {
            if (promiseResult.status === 'fulfilled') {
                result.set(promiseResult.value.key, promiseResult.value.value);
            } else {
                result.set(keys[index], null);
            }
        });

        return result;
    }

    /**
     * Set multiple values at once
     */
    async setMultiple<T = unknown>(
        entries: Array<{ key: string; value: T; ttl?: number }>
    ): Promise<boolean[]> {
        const promises = entries.map(entry =>
            this.set(entry.key, entry.value, entry.ttl)
        );

        const results = await Promise.allSettled(promises);
        return results.map(result =>
            result.status === 'fulfilled' ? result.value : false
        );
    }

    /**
     * Clear entire cache
     */
    async clear(): Promise<void> {
        try {
            // Clear memory cache
            if (this.config.memory.enabled) {
                this.memoryCache.clear();
                this.accessOrder = [];
                this.stats.memoryUsage = 0;
            }

            this.stats.totalKeys = 0;

        } catch (error) {
            console.error('Cache clear error:', error);
        }
    }

    /**
     * Get cache statistics
     */
    getStats(): CacheStats & {
        hitRate: number;
        memoryEntries: number;
    } {
        const totalRequests = this.stats.hits + this.stats.misses;
        const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;

        return {
            ...this.stats,
            hitRate,
            memoryEntries: this.memoryCache.size,
        };
    }

    /**
     * Invalidate cache by pattern
     */
    async invalidatePattern(pattern: string): Promise<number> {
        let deleted = 0;

        try {
            // Invalidate from memory cache
            if (this.config.memory.enabled) {
                const regex = new RegExp(pattern);
                const keysToDelete = Array.from(this.memoryCache.keys())
                    .filter(key => regex.test(key));

                for (const key of keysToDelete) {
                    await this.delete(key);
                    deleted++;
                }
            }

        } catch (error) {
            console.error('Cache invalidate pattern error:', error);
        }

        return deleted;
    }

    /**
     * Get from memory cache
     */
    private getFromMemory<T>(key: string): T | null {
        const entry = this.memoryCache.get(key);
        if (!entry) {
            return null;
        }

        if (this.isExpired(entry)) {
            this.evictFromMemory(key);
            return null;
        }

        // Update access statistics
        entry.lastAccessed = Date.now();
        entry.accessCount++;
        this.updateAccessOrder(key);

        return entry.value as T;
    }

    /**
     * Set in memory cache
     */
    private setInMemory<T>(key: string, value: T, ttl: number): void {
        // Check if we need to evict entries
        this.ensureMemoryCapacity();

        const size = this.estimateSize(value);
        const entry: CacheEntry<T> = {
            key,
            value,
            ttl,
            createdAt: Date.now(),
            lastAccessed: Date.now(),
            accessCount: 1,
            size,
        };

        // Remove existing entry if present
        if (this.memoryCache.has(key)) {
            const oldEntry = this.memoryCache.get(key)!;
            this.stats.memoryUsage -= oldEntry.size;
        } else {
            this.stats.totalKeys++;
        }

        this.memoryCache.set(key, entry);
        this.stats.memoryUsage += size;
        this.updateAccessOrder(key);
    }

    /**
     * Build cache key with prefix
     */
    private buildKey(key: string): string {
        const prefix = this.config.redis.keyPrefix || 'nO';
        return `${prefix}:${key}`;
    }

    /**
     * Check if cache entry is expired
     */
    private isExpired(entry: CacheEntry): boolean {
        return Date.now() > (entry.createdAt + entry.ttl);
    }

    /**
     * Ensure memory cache doesn't exceed capacity
     */
    private ensureMemoryCapacity(): void {
        while (this.memoryCache.size >= this.config.memory.maxSize) {
            this.evictLRU();
        }
    }

    /**
     * Evict least recently used entry
     */
    private evictLRU(): void {
        if (this.accessOrder.length === 0) return;

        const keyToEvict = this.accessOrder.shift()!;
        this.evictFromMemory(keyToEvict);
        this.stats.evictions++;
    }

    /**
     * Evict entry from memory cache
     */
    private evictFromMemory(key: string): void {
        const entry = this.memoryCache.get(key);
        if (entry) {
            this.stats.memoryUsage -= entry.size;
            this.memoryCache.delete(key);
            this.removeFromAccessOrder(key);
            this.stats.totalKeys--;
        }
    }

    /**
     * Update access order for LRU
     */
    private updateAccessOrder(key: string): void {
        this.removeFromAccessOrder(key);
        this.accessOrder.push(key);
    }

    /**
     * Remove key from access order
     */
    private removeFromAccessOrder(key: string): void {
        const index = this.accessOrder.indexOf(key);
        if (index > -1) {
            this.accessOrder.splice(index, 1);
        }
    }

    /**
     * Estimate size of value in bytes
     */
    private estimateSize(value: unknown): number {
        try {
            return JSON.stringify(value).length * 2; // Rough estimate (UTF-16)
        } catch {
            return 1000; // Default estimate
        }
    }

    /**
     * Start cleanup interval for expired entries
     */
    private startCleanupInterval(): void {
        setInterval(() => {
            this.cleanupExpiredEntries();
        }, 60000); // Clean up every minute
    }

    /**
     * Clean up expired entries from memory cache
     */
    private cleanupExpiredEntries(): void {
        const now = Date.now();
        const keysToDelete: string[] = [];

        for (const [key, entry] of this.memoryCache) {
            if (now > (entry.createdAt + entry.ttl)) {
                keysToDelete.push(key);
            }
        }

        for (const key of keysToDelete) {
            this.evictFromMemory(key);
        }
    }
}

/**
 * Default cache configuration
 */
export const defaultCacheConfig: CacheConfig = {
    redis: {
        enabled: false, // Disabled by default since Redis dependency is optional
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        password: process.env.REDIS_PASSWORD,
        db: 0,
        keyPrefix: 'nO',
        defaultTTL: 3600, // 1 hour
    },
    memory: {
        enabled: true,
        maxSize: 1000,
        defaultTTL: 300000, // 5 minutes in ms
    },
    strategies: {
        writeThrough: true,
        writeBehind: false,
        readThrough: true,
    },
};
