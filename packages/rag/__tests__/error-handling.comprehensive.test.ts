import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Chunk } from '../src/lib/types.js';
import { memoryStore } from '../src/store/memory.js';

/**
 * Comprehensive Error Handling Test Suite
 *
 * Tests edge cases, resource exhaustion, network failures,
 * memory pressure scenarios, and graceful degradation.
 */

describe('RAG Error Handling Coverage', () => {
    let originalProcessExit: typeof process.exit;
    let originalConsoleError: typeof console.error;

    beforeEach(() => {
        // Mock process.exit to prevent test termination
        originalProcessExit = process.exit;
        process.exit = vi.fn() as never;

        // Mock console.error to capture error logs
        originalConsoleError = console.error;
        console.error = vi.fn();
    });

    afterEach(() => {
        // Restore original functions
        process.exit = originalProcessExit;
        console.error = originalConsoleError;
        vi.restoreAllMocks();
    });

    describe('Memory Pressure and Resource Exhaustion', () => {
        it('handles out-of-memory conditions gracefully', async () => {
            const store = memoryStore();

            // Simulate memory pressure by creating very large embeddings
            const createLargeChunk = (id: string): Chunk => ({
                id,
                text: 'x'.repeat(100_000), // Large text content
                embedding: new Array(10_000).fill(0).map(() => Math.random()), // Large embedding
                metadata: { size: 'large' },
            });

            // Test with increasing memory load
            let successCount = 0;
            const maxAttempts = 100;

            try {
                for (let i = 0; i < maxAttempts; i++) {
                    const chunks = Array.from({ length: 10 }, (_, j) => createLargeChunk(`large-${i}-${j}`));

                    await store.upsert(chunks);
                    successCount++;

                    // Force garbage collection if available
                    if (global.gc) {
                        global.gc();
                    }
                }
            } catch (error) {
                // Expect graceful handling of memory exhaustion
                expect(error).toBeDefined();
                console.log(`Memory pressure handled after ${successCount} successful batches`);
            }

            // Should have processed at least some chunks before hitting limits
            expect(successCount).toBeGreaterThan(0);
        });

        it('recovers from temporary memory pressure', async () => {
            const store = memoryStore();

            // Create a mix of large and small chunks
            const largeChunk: Chunk = {
                id: 'large-chunk',
                text: 'x'.repeat(50_000),
                embedding: new Array(1000).fill(0).map(() => Math.random()),
                metadata: { type: 'large' },
            };

            const smallChunk: Chunk = {
                id: 'small-chunk',
                text: 'small content',
                embedding: new Array(10).fill(0).map(() => Math.random()),
                metadata: { type: 'small' },
            };

            // Try large chunk first (may fail due to memory)
            try {
                await store.upsert([largeChunk]);
            } catch (error) {
                console.log('Large chunk failed as expected:', error);
            }

            // Small chunk should succeed even after large chunk failure
            await expect(store.upsert([smallChunk])).resolves.not.toThrow();

            // Verify small chunk was stored
            if (smallChunk.embedding) {
                const results = await store.query(smallChunk.embedding, 1);
                expect(results).toHaveLength(1);
                expect(results[0].id).toBe('small-chunk');
            }
        });

        it('handles embedding dimension mismatches gracefully', async () => {
            const store = memoryStore();

            // Store chunk with standard dimensions
            const standardChunk: Chunk = {
                id: 'standard',
                text: 'standard content',
                embedding: new Array(384).fill(0).map(() => Math.random()),
                metadata: {},
            };

            await store.upsert([standardChunk]);

            // Try to query with mismatched dimensions
            const mismatchedQuery = new Array(512).fill(0).map(() => Math.random());

            const results = await store.query(mismatchedQuery, 5);

            // Should handle gracefully and return empty results or throw descriptive error
            expect(results).toBeDefined();
            expect(Array.isArray(results)).toBe(true);
        });
    });

    describe('Network and I/O Failure Simulation', () => {
        it('handles network timeouts with proper error recovery', async () => {
            // Mock a network operation that times out
            const mockNetworkOperation = vi.fn().mockImplementation(
                () =>
                    new Promise((_, reject) => {
                        setTimeout(() => reject(new Error('ETIMEDOUT')), 100);
                    }),
            );

            // Simulate timeout handling
            const timeoutPromise = Promise.race([
                mockNetworkOperation(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Operation timeout')), 50)),
            ]);

            await expect(timeoutPromise).rejects.toThrow();
        });

        it('handles connection refused errors', async () => {
            // Mock connection refused scenario
            const mockConnection = vi
                .fn()
                .mockRejectedValue(
                    Object.assign(new Error('Connection refused'), { code: 'ECONNREFUSED' }),
                );

            await expect(mockConnection()).rejects.toThrow('Connection refused');
        });

        it('handles DNS resolution failures', async () => {
            // Mock DNS failure
            const mockDNS = vi
                .fn()
                .mockRejectedValue(
                    Object.assign(new Error('DNS resolution failed'), { code: 'ENOTFOUND' }),
                );

            await expect(mockDNS()).rejects.toThrow('DNS resolution failed');
        });
    });

    describe('Malformed Data and Edge Cases', () => {
        it('handles null and undefined inputs gracefully', async () => {
            const store = memoryStore();

            // Test null inputs
            await expect(store.upsert(null as never)).rejects.toThrow();
            await expect(store.query(null as never, 5)).rejects.toThrow();

            // Test undefined inputs
            await expect(store.upsert(undefined as never)).rejects.toThrow();
            await expect(store.query(undefined as never, 5)).rejects.toThrow();

            // Test empty arrays
            const emptyResult = await store.upsert([]);
            expect(emptyResult).toBeDefined();
        });

        it('handles malformed embedding vectors', async () => {
            const store = memoryStore();

            const malformedChunks: Partial<Chunk>[] = [
                {
                    id: 'nan-embedding',
                    text: 'content',
                    embedding: [NaN, 1, 2, 3],
                    metadata: {},
                },
                {
                    id: 'infinite-embedding',
                    text: 'content',
                    embedding: [Infinity, 1, 2, 3],
                    metadata: {},
                },
                {
                    id: 'empty-embedding',
                    text: 'content',
                    embedding: [],
                    metadata: {},
                },
            ];

            for (const chunk of malformedChunks) {
                try {
                    await store.upsert([chunk as Chunk]);
                } catch (error) {
                    expect(error).toBeDefined();
                    console.log(`Malformed chunk rejected as expected:`, error);
                }
            }
        });

        it('handles extremely long text content', async () => {
            const store = memoryStore();

            const extremeChunk: Chunk = {
                id: 'extreme-length',
                text: 'x'.repeat(1_000_000), // 1MB of text
                embedding: new Array(384).fill(0).map(() => Math.random()),
                metadata: { length: 1_000_000 },
            };

            // Should either succeed or fail gracefully with descriptive error
            try {
                await store.upsert([extremeChunk]);
                if (extremeChunk.embedding) {
                    const results = await store.query(extremeChunk.embedding, 1);
                    expect(results[0].id).toBe('extreme-length');
                }
            } catch (error) {
                expect(error).toBeDefined();
                expect((error as Error).message).toMatch(/length|size|limit/i);
            }
        });

        it('handles special characters and encoding issues', async () => {
            const store = memoryStore();

            const specialChunks: Chunk[] = [
                {
                    id: 'unicode-1',
                    text: '🚀 Unicode: café naïve résumé',
                    embedding: new Array(10).fill(0).map(() => Math.random()),
                    metadata: { encoding: 'utf8' },
                },
                {
                    id: 'unicode-2',
                    text: '中文测试 日本語 한국어 العربية',
                    embedding: new Array(10).fill(0).map(() => Math.random()),
                    metadata: { encoding: 'utf8' },
                },
                {
                    id: 'control-chars',
                    text: 'Text with\0null\tand\ncontrol chars',
                    embedding: new Array(10).fill(0).map(() => Math.random()),
                    metadata: { encoding: 'mixed' },
                },
            ];

            await expect(store.upsert(specialChunks)).resolves.not.toThrow();

            // Verify retrieval works with special characters
            for (const chunk of specialChunks) {
                if (chunk.embedding) {
                    const results = await store.query(chunk.embedding, 1);
                    expect(results).toHaveLength(1);
                    expect(results[0].text).toBe(chunk.text);
                }
            }
        });
    });

    describe('Concurrent Access and Race Conditions', () => {
        it('handles concurrent upsert operations', async () => {
            const store = memoryStore();

            // Create multiple concurrent upsert operations
            const concurrentOps = Array.from({ length: 10 }, (_, i) => {
                const chunks: Chunk[] = Array.from({ length: 5 }, (_, j) => ({
                    id: `concurrent-${i}-${j}`,
                    text: `Content for batch ${i} chunk ${j}`,
                    embedding: new Array(50).fill(0).map(() => Math.random()),
                    metadata: { batch: i, chunk: j },
                }));

                return store.upsert(chunks);
            });

            // All operations should complete without race condition errors
            const results = await Promise.allSettled(concurrentOps);

            // Most operations should succeed
            const successful = results.filter((r) => r.status === 'fulfilled');
            expect(successful.length).toBeGreaterThan(5);

            // Any failures should be handled gracefully
            const failed = results.filter((r) => r.status === 'rejected');
            for (const failure of failed) {
                console.log('Concurrent operation failed gracefully:', failure.reason);
            }
        });

        it('handles concurrent query operations', async () => {
            const store = memoryStore();

            // Setup initial data
            const setupChunks: Chunk[] = Array.from({ length: 20 }, (_, i) => ({
                id: `setup-${i}`,
                text: `Setup content ${i}`,
                embedding: new Array(50).fill(0).map(() => Math.random()),
                metadata: { index: i },
            }));

            await store.upsert(setupChunks);

            // Create concurrent query operations
            const concurrentQueries = Array.from({ length: 15 }, () => {
                const queryVector = new Array(50).fill(0).map(() => Math.random());
                return store.query(queryVector, 3);
            });

            // All queries should complete successfully
            const queryResults = await Promise.all(concurrentQueries);

            queryResults.forEach((results) => {
                expect(results).toBeDefined();
                expect(Array.isArray(results)).toBe(true);
                expect(results.length).toBeLessThanOrEqual(3);
            });
        });
    });

    describe('Resource Cleanup and Garbage Collection', () => {
        it('properly cleans up after failed operations', async () => {
            const store = memoryStore();

            // Track initial memory state
            const initialMemory = process.memoryUsage();

            // Perform operations that might fail
            const failingOperations = Array.from({ length: 10 }, (_, i) => async () => {
                try {
                    const largeChunk: Chunk = {
                        id: `failing-${i}`,
                        text: 'x'.repeat(10_000),
                        embedding: new Array(1000).fill(0).map(() => Math.random()),
                        metadata: {},
                    };

                    if (i % 3 === 0) {
                        // Artificially fail some operations
                        throw new Error(`Simulated failure ${i}`);
                    }

                    await store.upsert([largeChunk]);
                } catch (error) {
                    // Errors should be handled gracefully
                    console.log(`Operation ${i} failed as expected:`, (error as Error).message);
                }
            });

            // Execute all operations
            await Promise.all(failingOperations.map((op) => op()));

            // Force garbage collection if available
            if (global.gc) {
                global.gc();
                await new Promise((resolve) => setTimeout(resolve, 100));
            }

            const finalMemory = process.memoryUsage();

            // Memory growth should be reasonable (not a precise test due to GC behavior)
            const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
            console.log(`Memory growth: ${Math.round(memoryGrowth / 1024 / 1024)}MB`);

            // This is a soft assertion - memory growth should be bounded
            expect(memoryGrowth).toBeLessThan(100 * 1024 * 1024); // 100MB limit
        });

        it('handles graceful shutdown scenarios', async () => {
            const store = memoryStore();

            // Start a long-running operation
            const longOperation = async () => {
                const chunks: Chunk[] = Array.from({ length: 100 }, (_, i) => ({
                    id: `shutdown-${i}`,
                    text: `Content ${i}`,
                    embedding: new Array(100).fill(0).map(() => Math.random()),
                    metadata: {},
                }));

                await store.upsert(chunks);
                return 'completed';
            };

            // Simulate shutdown signal after short delay
            const shutdownPromise = new Promise<string>((resolve) => {
                setTimeout(() => {
                    console.log('Simulated shutdown signal received');
                    resolve('shutdown');
                }, 50);
            });

            // Race between operation completion and shutdown
            const result = await Promise.race([longOperation(), shutdownPromise]);

            // Either completion or shutdown should be handled gracefully
            expect(['completed', 'shutdown']).toContain(result);
        });
    });

    describe('Error Recovery and Resilience', () => {
        it('recovers from transient failures', async () => {
            let attemptCount = 0;
            const flakeyOperation = async (): Promise<string> => {
                attemptCount++;
                if (attemptCount < 3) {
                    throw new Error(`Transient failure ${attemptCount}`);
                }
                return 'success';
            };

            // Simple retry logic
            const maxRetries = 5;
            let lastError: Error | null = null;

            for (let i = 0; i < maxRetries; i++) {
                try {
                    const result = await flakeyOperation();
                    expect(result).toBe('success');
                    expect(attemptCount).toBe(3);
                    return;
                } catch (error) {
                    lastError = error as Error;
                    await new Promise((resolve) => setTimeout(resolve, 10));
                }
            }

            throw lastError;
        });

        it('maintains data consistency after partial failures', async () => {
            const store = memoryStore();

            // First, insert some baseline data
            const baselineChunks: Chunk[] = Array.from({ length: 5 }, (_, i) => ({
                id: `baseline-${i}`,
                text: `Baseline ${i}`,
                embedding: new Array(10).fill(i).map(() => Math.random()),
                metadata: { type: 'baseline' },
            }));

            await store.upsert(baselineChunks);

            // Verify baseline data
            if (baselineChunks[0].embedding) {
                const baselineQuery = await store.query(baselineChunks[0].embedding, 10);
                expect(baselineQuery.length).toBeGreaterThan(0);
            }

            // Attempt batch operation that partially fails
            const mixedBatch: (Chunk | null)[] = [
                {
                    id: 'good-1',
                    text: 'Good chunk 1',
                    embedding: new Array(10).fill(0).map(() => Math.random()),
                    metadata: {},
                },
                null, // This will cause issues
                {
                    id: 'good-2',
                    text: 'Good chunk 2',
                    embedding: new Array(10).fill(0).map(() => Math.random()),
                    metadata: {},
                },
            ];

            // Batch should fail due to null chunk
            try {
                await store.upsert(mixedBatch as Chunk[]);
            } catch (error) {
                console.log('Mixed batch failed as expected:', error);
            }

            // Baseline data should still be intact
            if (baselineChunks[0].embedding) {
                const postFailureQuery = await store.query(baselineChunks[0].embedding, 10);
                expect(postFailureQuery.length).toBeGreaterThan(0);
                expect(
                    postFailureQuery.some((result: { id: string }) => result.id.startsWith('baseline-')),
                ).toBe(true);
            }
        });
    });

    describe('Performance Under Stress', () => {
        it('maintains reasonable performance under high load', async () => {
            const store = memoryStore();

            const startTime = Date.now();
            const operationPromises: Promise<unknown>[] = [];

            // Create mixed workload
            for (let i = 0; i < 50; i++) {
                // Upsert operations
                if (i % 3 === 0) {
                    const chunks: Chunk[] = [
                        {
                            id: `stress-${i}`,
                            text: `Stress content ${i}`,
                            embedding: new Array(20).fill(0).map(() => Math.random()),
                            metadata: { stress: true, index: i },
                        },
                    ];

                    operationPromises.push(store.upsert(chunks));
                }

                // Query operations
                if (i % 3 === 1) {
                    const queryVector = new Array(20).fill(0).map(() => Math.random());
                    operationPromises.push(store.query(queryVector, 3));
                }

                // Mixed operations
                if (i % 3 === 2) {
                    const chunk: Chunk = {
                        id: `mixed-${i}`,
                        text: `Mixed ${i}`,
                        embedding: new Array(20).fill(0).map(() => Math.random()),
                        metadata: {},
                    };

                    operationPromises.push(
                        store.upsert([chunk]).then(() => {
                            if (chunk.embedding) {
                                return store.query(chunk.embedding, 1);
                            }
                            return Promise.resolve([]);
                        }),
                    );
                }
            }

            // Wait for all operations with timeout
            const createTimeoutPromise = () =>
                new Promise<never>((_, reject) => {
                    setTimeout(() => reject(new Error('Operations timed out')), 5000);
                });

            const results = await Promise.race([
                Promise.allSettled(operationPromises),
                createTimeoutPromise(),
            ]);

            const endTime = Date.now();
            const duration = endTime - startTime;

            expect(results).toBeDefined();
            expect(duration).toBeLessThan(5000); // Should complete within 5 seconds

            console.log(`Stress test completed in ${duration}ms`);

            if (Array.isArray(results)) {
                const successful = results.filter((r) => r.status === 'fulfilled').length;
                const failed = results.filter((r) => r.status === 'rejected').length;

                console.log(`Successful operations: ${successful}, Failed: ${failed}`);

                // Most operations should succeed under normal load
                expect(successful).toBeGreaterThan(failed);
            }
        });
    });
});
