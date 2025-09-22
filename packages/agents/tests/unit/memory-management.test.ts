/**
 * Memory Management Tests
 * Following TDD plan requirements for memory leak prevention
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    EventStore,
    GlobalMemoryManager,
    MemoryBoundedStore,
    RateLimiter
} from '../../src/lib/memory-manager.js';

describe('Memory Management', () => {
    describe('MemoryBoundedStore', () => {
        let store: MemoryBoundedStore<string>;

        beforeEach(() => {
            store = new MemoryBoundedStore<string>({
                maxSize: 5,
                ttlMs: 1000,
                cleanupInterval: 500,
                evictionPolicy: 'lru',
                enableMetrics: false // Disable console output during tests
            });
        });

        afterEach(() => {
            store.destroy();
        });

        describe('Basic Operations', () => {
            it('should store and retrieve data', () => {
                store.set('key1', 'value1');
                const retrieved = store.get('key1');

                expect(retrieved).toBe('value1');
                expect(store.has('key1')).toBe(true);
                expect(store.size()).toBe(1);
            });

            it('should return null for non-existent keys', () => {
                const result = store.get('non-existent');
                expect(result).toBeNull();
                expect(store.has('non-existent')).toBe(false);
            });

            it('should delete entries', () => {
                store.set('key1', 'value1');
                const deleted = store.delete('key1');

                expect(deleted).toBe(true);
                expect(store.get('key1')).toBeNull();
                expect(store.size()).toBe(0);
            });

            it('should clear all entries', () => {
                store.set('key1', 'value1');
                store.set('key2', 'value2');
                store.clear();

                expect(store.size()).toBe(0);
                expect(store.get('key1')).toBeNull();
                expect(store.get('key2')).toBeNull();
            });

            it('should list all keys', () => {
                store.set('key1', 'value1');
                store.set('key2', 'value2');
                const keys = store.keys();

                expect(keys).toHaveLength(2);
                expect(keys).toContain('key1');
                expect(keys).toContain('key2');
            });
        });

        describe('Size Limits', () => {
            it('should evict entries when size limit is reached', () => {
                // Fill store to capacity
                for (let i = 0; i < 5; i++) {
                    store.set(`key${i}`, `value${i}`);
                }

                expect(store.size()).toBe(5);

                // Add one more - should evict the oldest (LRU)
                store.set('key5', 'value5');

                expect(store.size()).toBe(5); // Should still be at max size
                expect(store.has('key0')).toBe(false); // Oldest should be evicted
                expect(store.has('key5')).toBe(true); // New entry should be present
            });

            it('should use LRU eviction policy correctly', () => {
                // Fill store
                for (let i = 0; i < 5; i++) {
                    store.set(`key${i}`, `value${i}`);
                }

                // Access key1 to make it recently used
                store.get('key1');

                // Add new entry - should evict key0 (least recently used)
                store.set('new_key', 'new_value');

                expect(store.has('key0')).toBe(false); // Should be evicted
                expect(store.has('key1')).toBe(true); // Should remain (recently accessed)
                expect(store.has('new_key')).toBe(true);
            });
        });

        describe('TTL and Expiration', () => {
            it('should expire entries after TTL', async () => {
                store.set('key1', 'value1', 100); // 100ms TTL

                expect(store.get('key1')).toBe('value1');

                // Wait for expiration
                await new Promise(resolve => setTimeout(resolve, 150));

                expect(store.get('key1')).toBeNull();
                expect(store.has('key1')).toBe(false);
            });

            it('should use default TTL when none specified', async () => {
                const shortTTLStore = new MemoryBoundedStore<string>({
                    maxSize: 10,
                    ttlMs: 100,
                    cleanupInterval: 50,
                    evictionPolicy: 'lru',
                    enableMetrics: false
                });

                shortTTLStore.set('key1', 'value1'); // Use default TTL

                expect(shortTTLStore.get('key1')).toBe('value1');

                // Wait for expiration
                await new Promise(resolve => setTimeout(resolve, 150));

                expect(shortTTLStore.get('key1')).toBeNull();

                shortTTLStore.destroy();
            });
        });

        describe('Cleanup and Maintenance', () => {
            it('should clean up expired entries automatically', async () => {
                const cleanupStore = new MemoryBoundedStore<string>({
                    maxSize: 10,
                    ttlMs: 100,
                    cleanupInterval: 50,
                    evictionPolicy: 'lru',
                    enableMetrics: false
                });

                cleanupStore.set('key1', 'value1');
                cleanupStore.set('key2', 'value2');

                expect(cleanupStore.size()).toBe(2);

                // Wait for cleanup to run
                await new Promise(resolve => setTimeout(resolve, 200));

                expect(cleanupStore.size()).toBe(0);

                cleanupStore.destroy();
            });

            it('should provide memory metrics', () => {
                store.set('key1', 'value1');
                store.set('key2', 'value2');

                const metrics = store.getMetrics();

                expect(metrics.currentSize).toBe(2);
                expect(metrics.maxSize).toBe(5);
                expect(metrics.memoryUsageMB).toBeGreaterThan(0);
            });

            it('should track access patterns', () => {
                store.set('key1', 'value1');

                // Access the key multiple times
                store.get('key1');
                store.get('key1');
                store.get('non-existent'); // This should be a miss

                const metrics = store.getMetrics();

                expect(metrics.totalAccesses).toBe(3);
                // Hit rate should be 2/3 ≈ 0.67
                expect(metrics.hitRate).toBeCloseTo(0.67, 2);
            });
        });

        describe('Error Handling', () => {
            it('should throw error when adding to destroyed store', () => {
                store.destroy();

                expect(() => store.set('key1', 'value1')).toThrow('Cannot add to destroyed store');
            });

            it('should return null when getting from destroyed store', () => {
                store.set('key1', 'value1');
                store.destroy();

                expect(store.get('key1')).toBeNull();
                expect(store.has('key1')).toBe(false);
            });
        });
    });

    describe('RateLimiter', () => {
        let rateLimiter: RateLimiter;

        beforeEach(() => {
            rateLimiter = new RateLimiter({
                windowMs: 1000,
                maxRequests: 3,
                cleanupInterval: 500
            });
        });

        afterEach(() => {
            rateLimiter.destroy();
        });

        it('should allow requests within limit', () => {
            expect(rateLimiter.isAllowed('client1')).toBe(true);
            expect(rateLimiter.isAllowed('client1')).toBe(true);
            expect(rateLimiter.isAllowed('client1')).toBe(true);

            expect(rateLimiter.getRemaining('client1')).toBe(0);
        });

        it('should block requests over limit', () => {
            // Use up the allowance
            rateLimiter.isAllowed('client1');
            rateLimiter.isAllowed('client1');
            rateLimiter.isAllowed('client1');

            // This should be blocked
            expect(rateLimiter.isAllowed('client1')).toBe(false);
        });

        it('should reset after window expires', async () => {
            // Use up allowance
            rateLimiter.isAllowed('client1');
            rateLimiter.isAllowed('client1');
            rateLimiter.isAllowed('client1');

            expect(rateLimiter.isAllowed('client1')).toBe(false);

            // Wait for window to reset
            await new Promise(resolve => setTimeout(resolve, 1100));

            // Should be allowed again
            expect(rateLimiter.isAllowed('client1')).toBe(true);
        });

        it('should track different clients separately', () => {
            rateLimiter.isAllowed('client1');
            rateLimiter.isAllowed('client1');
            rateLimiter.isAllowed('client1');

            // client1 is at limit
            expect(rateLimiter.isAllowed('client1')).toBe(false);

            // client2 should still be allowed
            expect(rateLimiter.isAllowed('client2')).toBe(true);
        });

        it('should provide remaining request count', () => {
            expect(rateLimiter.getRemaining('client1')).toBe(3);

            rateLimiter.isAllowed('client1');
            expect(rateLimiter.getRemaining('client1')).toBe(2);

            rateLimiter.isAllowed('client1');
            expect(rateLimiter.getRemaining('client1')).toBe(1);
        });

        it('should provide time until reset', () => {
            rateLimiter.isAllowed('client1');
            const timeUntilReset = rateLimiter.getTimeUntilReset('client1');

            expect(timeUntilReset).toBeGreaterThan(0);
            expect(timeUntilReset).toBeLessThanOrEqual(1000);
        });

        it('should clean up stale entries', async () => {
            // Add entries for multiple clients
            for (let i = 0; i < 100; i++) {
                rateLimiter.isAllowed(`client${i}`);
            }

            const initialSize = rateLimiter.size();
            expect(initialSize).toBe(100);

            // Wait for cleanup
            await new Promise(resolve => setTimeout(resolve, 1200));

            const finalSize = rateLimiter.size();
            expect(finalSize).toBeLessThan(initialSize);
        });
    });

    describe('EventStore', () => {
        let eventStore: EventStore<{ type: string; data: unknown; id?: number }>;

        beforeEach(() => {
            eventStore = new EventStore({ maxSize: 5, ttlMs: 1000 });
        });

        afterEach(() => {
            eventStore.destroy();
        });

        it('should store and retrieve events', () => {
            const event = { type: 'test', data: 'test data' };
            const id = eventStore.add(event);

            expect(id).toBeDefined();
            expect(eventStore.get(id)).toEqual(event);
            expect(eventStore.size()).toBe(1);
        });

        it('should enforce size limits', () => {
            // Add events up to limit
            for (let i = 0; i < 5; i++) {
                eventStore.add({ type: 'test', data: `data${i}`, id: i });
            }

            expect(eventStore.size()).toBe(5);

            // Add one more - should evict oldest
            eventStore.add({ type: 'test', data: 'data5', id: 5 });

            expect(eventStore.size()).toBe(5);

            // Check that oldest was evicted and newest is present
            const oldest = eventStore.getOldest();
            const newest = eventStore.getNewest();

            expect(oldest?.id).toBe(1); // First should be evicted, so second is now oldest
            expect(newest?.id).toBe(5);
        });

        it('should get oldest and newest events', () => {
            eventStore.add({ type: 'first', data: 'first' });
            eventStore.add({ type: 'second', data: 'second' });
            eventStore.add({ type: 'third', data: 'third' });

            const oldest = eventStore.getOldest();
            const newest = eventStore.getNewest();

            expect(oldest?.type).toBe('first');
            expect(newest?.type).toBe('third');
        });

        it('should get all events in order', () => {
            const events = [
                { type: 'first', data: 'first' },
                { type: 'second', data: 'second' },
                { type: 'third', data: 'third' }
            ];

            for (const event of events) {
                eventStore.add(event);
            }

            const allEvents = eventStore.getAll();

            expect(allEvents).toHaveLength(3);
            expect(allEvents[0].type).toBe('first');
            expect(allEvents[1].type).toBe('second');
            expect(allEvents[2].type).toBe('third');
        });

        it('should clear all events', () => {
            eventStore.add({ type: 'test1', data: 'data1' });
            eventStore.add({ type: 'test2', data: 'data2' });

            expect(eventStore.size()).toBe(2);

            eventStore.clear();

            expect(eventStore.size()).toBe(0);
            expect(eventStore.getOldest()).toBeNull();
            expect(eventStore.getNewest()).toBeNull();
        });

        it('should handle empty store gracefully', () => {
            expect(eventStore.size()).toBe(0);
            expect(eventStore.getOldest()).toBeNull();
            expect(eventStore.getNewest()).toBeNull();
            expect(eventStore.getAll()).toEqual([]);
        });
    });

    describe('GlobalMemoryManager', () => {
        let globalManager: GlobalMemoryManager;
        let store1: MemoryBoundedStore<string>;
        let store2: MemoryBoundedStore<number>;
        let rateLimiter: RateLimiter;

        beforeEach(() => {
            globalManager = new GlobalMemoryManager(100); // Short interval for testing
            store1 = new MemoryBoundedStore<string>({ maxSize: 10, enableMetrics: false });
            store2 = new MemoryBoundedStore<number>({ maxSize: 10, enableMetrics: false });
            rateLimiter = new RateLimiter({ windowMs: 1000, maxRequests: 5 });
        });

        afterEach(() => {
            globalManager.destroy();
            store1.destroy();
            store2.destroy();
            rateLimiter.destroy();
        });

        it('should register and track multiple stores', () => {
            globalManager.register(store1);
            globalManager.register(store2);
            globalManager.register(rateLimiter);

            const metrics = globalManager.getGlobalMetrics();

            expect(metrics.totalStores).toBe(3);
            expect(metrics.totalEntries).toBe(0);
        });

        it('should aggregate metrics from all stores', () => {
            globalManager.register(store1);
            globalManager.register(store2);
            globalManager.register(rateLimiter);

            // Add data to stores
            store1.set('key1', 'value1');
            store1.set('key2', 'value2');
            store2.set('num1', 42);
            rateLimiter.isAllowed('client1');

            const metrics = globalManager.getGlobalMetrics();

            expect(metrics.totalEntries).toBe(4); // 2 + 1 + 1
            expect(metrics.totalMemoryUsageMB).toBeGreaterThan(0);
        });

        it('should unregister stores', () => {
            globalManager.register(store1);
            globalManager.register(store2);

            expect(globalManager.getGlobalMetrics().totalStores).toBe(2);

            globalManager.unregister(store1);

            expect(globalManager.getGlobalMetrics().totalStores).toBe(1);
        });

        it('should perform global cleanup', async () => {
            const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

            globalManager.register(store1);
            globalManager.register(store2);

            // Add some data
            store1.set('key1', 'value1');
            store2.set('num1', 42);

            // Wait for global cleanup to run
            await new Promise(resolve => setTimeout(resolve, 150));

            // Verify cleanup was called
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('Performing global memory cleanup')
            );

            consoleLogSpy.mockRestore();
        });

        it('should destroy all managed stores', () => {
            const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

            globalManager.register(store1);
            globalManager.register(store2);
            globalManager.register(rateLimiter);

            globalManager.destroy();

            const metrics = globalManager.getGlobalMetrics();
            expect(metrics.totalStores).toBe(0);
            expect(metrics.totalEntries).toBe(0);

            consoleLogSpy.mockRestore();
        });
    });

    describe('Memory Pressure Scenarios', () => {
        it('should handle high memory pressure gracefully', () => {
            const store = new MemoryBoundedStore<string>({
                maxSize: 100,
                ttlMs: 10000,
                maxMemoryMB: 0.001, // Very low limit to trigger pressure
                evictionPolicy: 'size',
                enableMetrics: false
            });

            // Add many large entries
            for (let i = 0; i < 50; i++) {
                store.set(`key${i}`, 'x'.repeat(1000)); // Large strings
            }

            // Force cleanup to handle memory pressure
            store.cleanup();

            // Should have evicted some entries
            expect(store.size()).toBeLessThan(50);

            store.destroy();
        });

        it('should use different eviction policies', () => {
            const policies = ['lru', 'ttl', 'importance', 'size'] as const;

            for (const policy of policies) {
                const store = new MemoryBoundedStore<string>({
                    maxSize: 3,
                    evictionPolicy: policy,
                    enableMetrics: false
                });

                // Fill store
                store.set('key1', 'value1');
                store.set('key2', 'value2');
                store.set('key3', 'value3');

                // Access key1 to give it different access patterns
                store.get('key1');

                // Add another to trigger eviction
                store.set('key4', 'value4');

                // Should still be at max size
                expect(store.size()).toBe(3);

                store.destroy();
            }
        });
    });
});
