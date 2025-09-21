import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Chunk } from '../src/lib/types.js';
import { memoryStore } from '../src/store/memory.js';

/**
 * Memory Management Test Suite
 *
 * Tests memory usage patterns, garbage collection behavior,
 * and resource cleanup in long-running operations.
 */

// Helper to get memory usage snapshot
function getMemorySnapshot() {
	return {
		...process.memoryUsage(),
		timestamp: Date.now(),
	};
}

// Helper to calculate memory growth
function calculateMemoryGrowth(
	before: ReturnType<typeof getMemorySnapshot>,
	after: ReturnType<typeof getMemorySnapshot>,
) {
	return {
		rss: after.rss - before.rss,
		heapUsed: after.heapUsed - before.heapUsed,
		heapTotal: after.heapTotal - before.heapTotal,
		external: after.external - before.external,
		duration: after.timestamp - before.timestamp,
	};
}

// Helper to create test chunks
function createTestChunk(id: string, size: number = 1000): Chunk {
	return {
		id,
		text: 'Memory test content '.repeat(Math.ceil(size / 20)),
		embedding: Array.from({ length: 384 }, () => Math.random()),
		metadata: { size, created: Date.now() },
	};
}

// Helper to force garbage collection if available
function forceGC(): Promise<void> {
	return new Promise((resolve) => {
		if (global.gc) {
			global.gc();
		}
		// Small delay to allow GC to complete
		setTimeout(resolve, 100);
	});
}

describe('Memory Management', () => {
	beforeEach(async () => {
		// Force GC before each test
		await forceGC();
	});

	afterEach(async () => {
		// Force GC after each test
		await forceGC();
	});

	describe('Memory Usage Patterns', () => {
		it('tracks memory usage during bulk insertion', async () => {
			const store = memoryStore();
			const batchSize = 100;
			const numBatches = 10;
			const memorySnapshots = [];

			memorySnapshots.push(getMemorySnapshot());

			for (let batch = 0; batch < numBatches; batch++) {
				const chunks: Chunk[] = [];
				for (let i = 0; i < batchSize; i++) {
					chunks.push(createTestChunk(`batch-${batch}-${i}`, 2000));
				}

				await store.upsert(chunks);
				memorySnapshots.push(getMemorySnapshot());
			}

			// Analyze memory growth patterns
			const growthRates = [];
			for (let i = 1; i < memorySnapshots.length; i++) {
				const growth = calculateMemoryGrowth(memorySnapshots[i - 1], memorySnapshots[i]);
				growthRates.push(growth.heapUsed);
			}

			// Memory growth should be roughly linear for consistent batch sizes
			const avgGrowth = growthRates.reduce((sum, growth) => sum + growth, 0) / growthRates.length;
			const maxGrowth = Math.max(...growthRates);
			const minGrowth = Math.min(...growthRates);

			console.log(`Average memory growth per batch: ${Math.round(avgGrowth / 1024 / 1024)}MB`);
			console.log(
				`Growth range: ${Math.round(minGrowth / 1024 / 1024)}MB - ${Math.round(maxGrowth / 1024 / 1024)}MB`,
			);

			// Growth should be consistent (no memory leaks)
			expect(maxGrowth / avgGrowth).toBeLessThan(3); // Max growth shouldn't be more than 3x average
		});

		it('monitors memory usage during query operations', async () => {
			const store = memoryStore();

			// Setup data
			const setupChunks: Chunk[] = [];
			for (let i = 0; i < 500; i++) {
				setupChunks.push(createTestChunk(`setup-${i}`, 1000));
			}
			await store.upsert(setupChunks);

			const preQueryMemory = getMemorySnapshot();

			// Perform many query operations
			const numQueries = 100;
			for (let i = 0; i < numQueries; i++) {
				const queryVector = Array.from({ length: 384 }, () => Math.random());
				await store.query(queryVector, 10);
			}

			const postQueryMemory = getMemorySnapshot();
			const queryGrowth = calculateMemoryGrowth(preQueryMemory, postQueryMemory);

			console.log(
				`Memory growth from ${numQueries} queries: ${Math.round(queryGrowth.heapUsed / 1024)}KB`,
			);

			// Query operations should not cause significant memory growth
			expect(queryGrowth.heapUsed).toBeLessThan(10 * 1024 * 1024); // Less than 10MB growth
		});

		it('handles memory cleanup after large operations', async () => {
			const store = memoryStore();
			const preOperationMemory = getMemorySnapshot();

			// Perform memory-intensive operation
			const largeChunks: Chunk[] = [];
			for (let i = 0; i < 100; i++) {
				largeChunks.push(createTestChunk(`large-${i}`, 10000)); // 10KB each
			}

			await store.upsert(largeChunks);

			const postOperationMemory = getMemorySnapshot();
			const operationGrowth = calculateMemoryGrowth(preOperationMemory, postOperationMemory);

			// Force garbage collection
			await forceGC();

			const postGCMemory = getMemorySnapshot();
			const finalGrowth = calculateMemoryGrowth(preOperationMemory, postGCMemory);

			console.log(
				`Memory growth after operation: ${Math.round(operationGrowth.heapUsed / 1024 / 1024)}MB`,
			);
			console.log(`Memory growth after GC: ${Math.round(finalGrowth.heapUsed / 1024 / 1024)}MB`);

			// Memory usage should be reasonable after GC
			expect(finalGrowth.heapUsed).toBeLessThan(operationGrowth.heapUsed * 1.5); // Some cleanup should occur
		});
	});

	describe('Garbage Collection Behavior', () => {
		it('verifies GC effectiveness on temporary objects', async () => {
			const store = memoryStore();
			const gcSnapshots = [];

			// Create and dispose of temporary objects
			for (let cycle = 0; cycle < 5; cycle++) {
				const beforeCycle = getMemorySnapshot();

				// Create temporary objects that should be GC'd
				const tempChunks: Chunk[] = [];
				for (let i = 0; i < 200; i++) {
					tempChunks.push(createTestChunk(`temp-${cycle}-${i}`, 5000));
				}

				// Use the objects temporarily
				await store.upsert(tempChunks);

				// Clear references (in real scenarios, these would go out of scope)
				tempChunks.length = 0;

				// Force GC
				await forceGC();

				const afterCycle = getMemorySnapshot();
				const cycleGrowth = calculateMemoryGrowth(beforeCycle, afterCycle);
				gcSnapshots.push({
					cycle,
					growth: cycleGrowth.heapUsed,
					heapUsed: afterCycle.heapUsed,
				});

				console.log(
					`Cycle ${cycle}: Memory growth ${Math.round(cycleGrowth.heapUsed / 1024 / 1024)}MB`,
				);
			}

			// Memory should not grow indefinitely across cycles
			const firstCycle = gcSnapshots[0];
			const lastCycle = gcSnapshots[gcSnapshots.length - 1];
			const totalGrowth = lastCycle.heapUsed - firstCycle.heapUsed;

			console.log(
				`Total memory growth across all cycles: ${Math.round(totalGrowth / 1024 / 1024)}MB`,
			);

			// Total growth should be reasonable (not linear with number of cycles)
			expect(totalGrowth).toBeLessThan(100 * 1024 * 1024); // Less than 100MB total growth
		});

		it('monitors memory stability in long-running operations', async () => {
			const store = memoryStore();
			const stabilitySnapshots = [];
			const numOperations = 50;

			for (let op = 0; op < numOperations; op++) {
				// Mix of operations to simulate real usage
				if (op % 3 === 0) {
					// Upsert operation
					const chunks = [createTestChunk(`stability-${op}`, 2000)];
					await store.upsert(chunks);
				} else if (op % 3 === 1) {
					// Query operation
					const queryVector = Array.from({ length: 384 }, () => Math.random());
					await store.query(queryVector, 5);
				} else {
					// Mixed operation
					const chunk = createTestChunk(`mixed-${op}`, 1500);
					await store.upsert([chunk]);
					if (chunk.embedding) {
						await store.query(chunk.embedding, 3);
					}
				}

				// Periodic GC
				if (op % 10 === 0) {
					await forceGC();
				}

				stabilitySnapshots.push(getMemorySnapshot());
			}

			// Analyze stability - memory should not grow without bound
			const memoryUsages = stabilitySnapshots.map((s) => s.heapUsed);
			const maxMemory = Math.max(...memoryUsages);
			const minMemory = Math.min(...memoryUsages);
			const avgMemory = memoryUsages.reduce((sum, usage) => sum + usage, 0) / memoryUsages.length;

			console.log(
				`Memory stability - Min: ${Math.round(minMemory / 1024 / 1024)}MB, ` +
					`Max: ${Math.round(maxMemory / 1024 / 1024)}MB, ` +
					`Avg: ${Math.round(avgMemory / 1024 / 1024)}MB`,
			);

			// Memory usage should be stable (max not too much higher than average)
			expect(maxMemory / avgMemory).toBeLessThan(2); // Max usage < 2x average
		});
	});

	describe('Resource Cleanup', () => {
		it('cleans up resources after store operations', async () => {
			const preTestMemory = getMemorySnapshot();

			// Create multiple stores to test cleanup
			const stores = [];
			for (let i = 0; i < 5; i++) {
				const store = memoryStore();
				const chunks = Array.from({ length: 50 }, (_, j) =>
					createTestChunk(`cleanup-${i}-${j}`, 1000),
				);
				await store.upsert(chunks);
				stores.push(store);
			}

			const midTestMemory = getMemorySnapshot();
			const operationGrowth = calculateMemoryGrowth(preTestMemory, midTestMemory);

			// Clear references to stores to allow GC
			stores.splice(0, stores.length);

			// Force GC multiple times
			for (let i = 0; i < 3; i++) {
				await forceGC();
				await new Promise((resolve) => setTimeout(resolve, 50));
			}

			const postCleanupMemory = getMemorySnapshot();
			const finalGrowth = calculateMemoryGrowth(preTestMemory, postCleanupMemory);

			console.log(
				`Memory after operations: ${Math.round(operationGrowth.heapUsed / 1024 / 1024)}MB`,
			);
			console.log(`Memory after cleanup: ${Math.round(finalGrowth.heapUsed / 1024 / 1024)}MB`);

			// Cleanup should reduce memory usage significantly
			expect(finalGrowth.heapUsed).toBeLessThan(operationGrowth.heapUsed * 0.8); // At least 20% reduction
		});

		it('handles memory pressure gracefully', async () => {
			const store = memoryStore();
			const pressureResults = [];

			// Gradually increase memory pressure
			const baselines = [1000, 5000, 10000, 20000]; // Chunk sizes

			for (const size of baselines) {
				const beforePressure = getMemorySnapshot();

				try {
					const chunks = Array.from({ length: 50 }, (_, i) =>
						createTestChunk(`pressure-${size}-${i}`, size),
					);

					await store.upsert(chunks);

					const afterPressure = getMemorySnapshot();
					const growth = calculateMemoryGrowth(beforePressure, afterPressure);

					pressureResults.push({
						chunkSize: size,
						success: true,
						memoryGrowth: growth.heapUsed,
						heapUsed: afterPressure.heapUsed,
					});
				} catch (error) {
					pressureResults.push({
						chunkSize: size,
						success: false,
						error: (error as Error).message,
					});

					console.log(
						`Memory pressure limit reached at chunk size ${size}: ${(error as Error).message}`,
					);
					break;
				}

				// Force GC between tests
				await forceGC();
			}

			// At least some operations should succeed
			const successful = pressureResults.filter((r) => r.success);
			expect(successful.length).toBeGreaterThan(0);

			// Memory growth should correlate with chunk size
			if (successful.length > 1) {
				const growthRates = successful
					.filter((r) => r.memoryGrowth !== undefined)
					.map((r) => (r.memoryGrowth as number) / r.chunkSize);

				if (growthRates.length > 0) {
					const avgGrowthRate =
						growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length;

					console.log(
						`Average memory growth rate: ${avgGrowthRate.toFixed(4)} bytes per chunk byte`,
					);
					expect(avgGrowthRate).toBeGreaterThan(0);
				}
			}
		});

		it('maintains performance under memory constraints', async () => {
			const store = memoryStore();
			const performanceMetrics = [];

			// Test performance as memory usage increases (reduced iterations)
			for (let round = 0; round < 5; round++) {
				const beforeRound = Date.now();
				const memoryBefore = getMemorySnapshot();

				// Add data
				const chunks = Array.from(
					{ length: 10 },
					(_, i) => createTestChunk(`perf-${round}-${i}`, 1000), // Smaller chunks
				);
				await store.upsert(chunks);

				// Query performance test
				const queryStart = Date.now();
				const queryVector = Array.from({ length: 384 }, () => Math.random());
				const results = await store.query(queryVector, 5);
				const queryTime = Date.now() - queryStart;

				const memoryAfter = getMemorySnapshot();
				const totalTime = Date.now() - beforeRound;
				const memoryGrowth = calculateMemoryGrowth(memoryBefore, memoryAfter);

				performanceMetrics.push({
					round,
					totalTime,
					queryTime,
					resultsCount: results.length,
					memoryGrowth: memoryGrowth.heapUsed,
					totalMemory: memoryAfter.heapUsed,
				});

				console.log(
					`Round ${round}: Query ${queryTime}ms, Total ${totalTime}ms, Memory ${Math.round(memoryAfter.heapUsed / 1024 / 1024)}MB`,
				);
			}

			// Performance should remain reasonable
			const queryTimes = performanceMetrics.map((m) => m.queryTime);
			const avgQueryTime = queryTimes.reduce((sum, time) => sum + time, 0) / queryTimes.length;
			const maxQueryTime = Math.max(...queryTimes);

			console.log(`Query time - Avg: ${avgQueryTime}ms, Max: ${maxQueryTime}ms`);

			// Basic performance checks
			expect(avgQueryTime).toBeLessThan(50); // Average under 50ms
			expect(maxQueryTime).toBeLessThan(100); // Max under 100ms

			// Ensure we got some results
			const totalResults = performanceMetrics.reduce((sum, m) => sum + m.resultsCount, 0);
			expect(totalResults).toBeGreaterThan(0);
		});
	});

	describe('Memory Leak Detection', () => {
		it('detects potential memory leaks in repetitive operations', async () => {
			const store = memoryStore();
			const leakDetectionSamples = [];
			const numSamples = 10; // Reduced from 20
			const operationsPerSample = 5; // Reduced from 10

			for (let sample = 0; sample < numSamples; sample++) {
				const beforeSample = getMemorySnapshot();

				// Perform repetitive operations
				for (let op = 0; op < operationsPerSample; op++) {
					const chunk = createTestChunk(`leak-test-${sample}-${op}`, 500); // Smaller chunks
					await store.upsert([chunk]);

					if (chunk.embedding) {
						await store.query(chunk.embedding, 3); // Fewer results
					}
				}

				// Periodic GC
				await forceGC();

				const afterSample = getMemorySnapshot();
				const sampleGrowth = calculateMemoryGrowth(beforeSample, afterSample);

				leakDetectionSamples.push({
					sample,
					memoryGrowth: sampleGrowth.heapUsed,
					totalMemory: afterSample.heapUsed,
				});
			}

			// Analyze for potential leaks (simplified)
			const totalMemories = leakDetectionSamples.map((s) => s.totalMemory);
			const firstMemory = totalMemories[0];
			const lastMemory = totalMemories[totalMemories.length - 1];
			const totalGrowth = lastMemory - firstMemory;

			console.log(`Memory growth over ${numSamples} samples: ${Math.round(totalGrowth / 1024)}KB`);

			// Growth should be bounded
			expect(totalGrowth).toBeLessThan(20 * 1024 * 1024); // Less than 20MB total growth

			const avgMemory = totalMemories.reduce((sum, mem) => sum + mem, 0) / totalMemories.length;
			const maxMemory = Math.max(...totalMemories);

			// Memory should not grow excessively
			expect(maxMemory).toBeLessThan(avgMemory * 2); // Max < 2x average
		});
	});
});
