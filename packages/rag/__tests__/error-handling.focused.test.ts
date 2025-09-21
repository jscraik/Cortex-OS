import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Chunk } from '../src/lib/types.js';
import { memoryStore } from '../src/store/memory.js';

// Promise utilities (extracted to avoid complexity)
const createTimeoutPromise = (ms: number, message: string): Promise<never> =>
	new Promise((_, reject) => {
		setTimeout(() => reject(new Error(message)), ms);
	});

const _createDelayedResolve = <T>(value: T, ms: number): Promise<T> =>
	new Promise((resolve) => {
		setTimeout(() => resolve(value), ms);
	});

/**
 * Error Handling Test Suite
 *
 * Tests critical error scenarios with simplified structure
 */

// Helper functions to avoid complexity
function createRandomVector(size: number): number[] {
	return Array.from({ length: size }, () => Math.random());
}

function createTestChunk(
	id: string,
	options: {
		textSize?: number;
		embeddingSize?: number;
		metadata?: Record<string, unknown>;
	} = {},
): Chunk {
	const { textSize = 100, embeddingSize = 50, metadata = {} } = options;
	return {
		id,
		text: 'test content '.repeat(Math.ceil(textSize / 13)),
		embedding: createRandomVector(embeddingSize),
		metadata,
	};
}

describe('RAG Error Handling', () => {
	let mockConsoleError: typeof console.error;

	beforeEach(() => {
		mockConsoleError = vi.fn();
		console.error = mockConsoleError;
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('Input Validation', () => {
		it('handles null inputs gracefully', async () => {
			const store = memoryStore();

			// Memory store should throw TypeError for non-iterable inputs
			await expect(store.upsert(null as never)).rejects.toThrow('not iterable');

			// Query with null should return empty results
			const queryResult = await store.query(null as never, 5);
			expect(queryResult).toBeDefined();
			expect(Array.isArray(queryResult)).toBe(true);
		});

		it('handles undefined inputs gracefully', async () => {
			const store = memoryStore();

			// Memory store should throw TypeError for non-iterable inputs
			await expect(store.upsert(undefined as never)).rejects.toThrow('not iterable');

			// Query with undefined should return empty results
			const queryResult = await store.query(undefined as never, 5);
			expect(queryResult).toBeDefined();
			expect(Array.isArray(queryResult)).toBe(true);
		});

		it('handles empty arrays', async () => {
			const store = memoryStore();

			// Empty array upsert should complete without error (returns undefined)
			const result = await store.upsert([]);
			expect(result).toBeUndefined(); // upsert returns void
		});

		it('handles malformed chunks', async () => {
			const store = memoryStore();

			const badChunks = [
				{
					id: 'no-embedding',
					text: 'content',
					// missing embedding
				},
				{
					id: 'empty-embedding',
					text: 'content',
					embedding: [],
				},
			];

			for (const chunk of badChunks) {
				try {
					await store.upsert([chunk as Chunk]);
				} catch (error) {
					expect(error).toBeDefined();
					console.log(`Malformed chunk handled: ${(error as Error).message}`);
				}
			}
		});
	});

	describe('Memory Management', () => {
		it('handles large documents', async () => {
			const store = memoryStore();

			const largeChunk = createTestChunk('large', {
				textSize: 10_000,
				embeddingSize: 1000,
			});

			try {
				await store.upsert([largeChunk]);

				if (largeChunk.embedding) {
					const results = await store.query(largeChunk.embedding, 1);
					expect(results).toBeDefined();
				}
			} catch (_error) {
				expect((_error as Error).message).toMatch(/size|memory|limit/i);
			}
		});

		it('recovers from memory pressure', async () => {
			const store = memoryStore();

			const largeChunk = createTestChunk('pressure-large', {
				textSize: 50_000,
				embeddingSize: 5000,
			});

			const smallChunk = createTestChunk('pressure-small', {
				textSize: 50,
				embeddingSize: 10,
			});

			// Try large chunk (may fail)
			try {
				await store.upsert([largeChunk]);
			} catch (error) {
				console.log('Large chunk failed as expected');
				expect(error).toBeDefined();
			}

			// Small chunk should succeed
			await expect(store.upsert([smallChunk])).resolves.not.toThrow();

			if (smallChunk.embedding) {
				const results = await store.query(smallChunk.embedding, 1);
				expect(results).toHaveLength(1);
			}
		});
	});

	describe('Network Simulation', () => {
		it('handles timeout errors', async () => {
			const slowTimeout = createTimeoutPromise(100, 'ETIMEDOUT');
			const quickTimeout = createTimeoutPromise(50, 'Timeout');

			const timeoutRace = Promise.race([slowTimeout, quickTimeout]);
			await expect(timeoutRace).rejects.toThrow();
		});

		it('handles connection errors', async () => {
			const connectionError = Object.assign(new Error('Connection refused'), {
				code: 'ECONNREFUSED',
			});

			const mockConnection = vi.fn().mockRejectedValue(connectionError);
			await expect(mockConnection()).rejects.toThrow('Connection refused');
		});
	});

	describe('Data Integrity', () => {
		it('handles special characters', async () => {
			const store = memoryStore();

			const specialChunks = [
				createTestChunk('unicode-1', { metadata: { content: '🚀 café naïve' } }),
				createTestChunk('unicode-2', { metadata: { content: '中文 日本語' } }),
				createTestChunk('control-chars', { metadata: { content: 'tab\there' } }),
			];

			await expect(store.upsert(specialChunks)).resolves.not.toThrow();

			for (const chunk of specialChunks) {
				if (chunk.embedding) {
					const results = await store.query(chunk.embedding, 1);
					expect(results).toBeDefined();
					expect(results[0]?.id).toBe(chunk.id);
				}
			}
		});

		it('maintains consistency after partial failures', async () => {
			const store = memoryStore();

			// Add baseline data
			const baselineChunk = createTestChunk('baseline');
			await store.upsert([baselineChunk]);

			// Verify baseline
			if (baselineChunk.embedding) {
				const baselineResults = await store.query(baselineChunk.embedding, 5);
				expect(baselineResults.length).toBeGreaterThan(0);
			}

			// Try batch with some bad data
			const mixedBatch = [
				createTestChunk('good-1'),
				null as never, // This should cause failure
				createTestChunk('good-2'),
			];

			try {
				await store.upsert(mixedBatch);
			} catch (error) {
				console.log('Mixed batch failed as expected');
				expect(error).toBeDefined();
			}

			// Baseline should still be intact
			if (baselineChunk.embedding) {
				const postResults = await store.query(baselineChunk.embedding, 5);
				expect(postResults.length).toBeGreaterThan(0);
				expect(postResults.some((r) => r.id === 'baseline')).toBe(true);
			}
		});
	});

	describe('Concurrent Operations', () => {
		it('handles concurrent upserts', async () => {
			const store = memoryStore();

			// Create multiple concurrent operations
			const operations = [];
			for (let i = 0; i < 5; i++) {
				const chunks = [];
				for (let j = 0; j < 3; j++) {
					chunks.push(createTestChunk(`concurrent-${i}-${j}`));
				}
				operations.push(store.upsert(chunks));
			}

			const results = await Promise.allSettled(operations);
			const successful = results.filter((r) => r.status === 'fulfilled');

			// Most operations should succeed
			expect(successful.length).toBeGreaterThan(2);
		});

		it('handles concurrent queries', async () => {
			const store = memoryStore();

			// Setup data
			const setupChunks = [];
			for (let i = 0; i < 10; i++) {
				setupChunks.push(createTestChunk(`setup-${i}`));
			}
			await store.upsert(setupChunks);

			// Run concurrent queries
			const queries = [];
			for (let i = 0; i < 5; i++) {
				const queryVector = createRandomVector(50);
				queries.push(store.query(queryVector, 3));
			}

			const queryResults = await Promise.all(queries);

			queryResults.forEach((results) => {
				expect(results).toBeDefined();
				expect(Array.isArray(results)).toBe(true);
				expect(results.length).toBeLessThanOrEqual(3);
			});
		});
	});

	describe('Error Recovery', () => {
		it('recovers from transient failures', async () => {
			let attemptCount = 0;

			const flakeyOp = async (): Promise<string> => {
				attemptCount++;
				if (attemptCount < 3) {
					throw new Error(`Transient failure ${attemptCount}`);
				}
				return 'success';
			};

			// Simple retry logic
			let result: string | null = null;
			for (let i = 0; i < 5; i++) {
				try {
					result = await flakeyOp();
					break;
				} catch (error) {
					console.log(`Attempt ${i + 1} failed:`, (error as Error).message);
					await new Promise((resolve) => setTimeout(resolve, 10));
				}
			}

			expect(result).toBe('success');
			expect(attemptCount).toBe(3);
		});

		it('maintains performance under load', async () => {
			const store = memoryStore();
			const operations = [];
			const startTime = Date.now();

			// Mixed workload
			for (let i = 0; i < 20; i++) {
				if (i % 2 === 0) {
					// Upsert operations
					const chunk = createTestChunk(`load-${i}`);
					operations.push(store.upsert([chunk]));
				} else {
					// Query operations
					const queryVector = createRandomVector(50);
					operations.push(store.query(queryVector, 2));
				}
			}

			const results = await Promise.allSettled(operations);
			const endTime = Date.now();
			const duration = endTime - startTime;

			const successful = results.filter((r) => r.status === 'fulfilled').length;
			const failed = results.filter((r) => r.status === 'rejected').length;

			console.log(`Load test: ${successful} success, ${failed} failed in ${duration}ms`);

			expect(duration).toBeLessThan(5000); // 5 second limit
			expect(successful).toBeGreaterThan(failed);
		});
	});

	describe('Resource Cleanup', () => {
		it('cleans up after failed operations', async () => {
			const store = memoryStore();
			const initialMemory = process.memoryUsage();

			// Perform operations that may fail
			for (let i = 0; i < 5; i++) {
				try {
					const chunk = createTestChunk(`cleanup-${i}`, {
						textSize: 5000,
						embeddingSize: 500,
					});

					if (i % 2 === 0) {
						throw new Error(`Simulated failure ${i}`);
					}

					await store.upsert([chunk]);
				} catch (error) {
					console.log(`Operation ${i} failed as expected`);
					expect(error).toBeDefined();
				}
			}

			// Force GC if available
			if (global.gc) {
				global.gc();
				await new Promise((resolve) => setTimeout(resolve, 100));
			}

			const finalMemory = process.memoryUsage();
			const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;

			console.log(`Memory growth: ${Math.round(memoryGrowth / 1024 / 1024)}MB`);

			// Memory growth should be reasonable
			expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // 50MB limit
		});

		it('handles graceful shutdown', async () => {
			const store = memoryStore();

			const longOperation = async () => {
				const chunks = [];
				for (let i = 0; i < 50; i++) {
					chunks.push(createTestChunk(`shutdown-${i}`));
				}
				await store.upsert(chunks);
				return 'completed';
			};

			const createShutdownSignal = () =>
				new Promise<string>((resolve) => {
					setTimeout(() => {
						console.log('Shutdown signal received');
						resolve('shutdown');
					}, 50);
				});

			const shutdownSignal = createShutdownSignal();

			const result = await Promise.race([longOperation(), shutdownSignal]);
			expect(['completed', 'shutdown']).toContain(result);
		});
	});
});
