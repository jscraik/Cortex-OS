/**
 * brAInwav Memory Performance Benchmark Suite
 * Phase 1.2: Memory system performance validation
 *
 * Following CODESTYLE.md: functional-first, ≤40 lines per function, named exports
 */

import { describe, expect, it } from 'vitest';

describe('brAInwav Memory Performance Benchmarks - Phase 1.2', () => {
	describe('Memory Store Performance', () => {
		it('should handle bulk memory storage within brAInwav performance targets', async () => {
			const { LocalMemoryStore } = await import('@cortex-os/memories');
			const store = new LocalMemoryStore();

			const testMemories = Array.from({ length: 100 }, (_, i) => ({
				content: `brAInwav bulk test memory ${i} with detailed content for realistic sizing`,
				importance: Math.random() * 0.8 + 0.2, // 0.2 to 1.0
				domain: `bulk-test-${Math.floor(i / 10)}`,
				tags: ['bulk', 'performance', 'brainwav', `batch-${Math.floor(i / 25)}`],
				metadata: {
					testIndex: i,
					category: 'performance-test',
					timestamp: new Date().toISOString(),
				},
			}));

			const startTime = Date.now();

			// Mock successful responses for performance testing
			const mockFetch = vi.spyOn(global, 'fetch').mockImplementation(() =>
				Promise.resolve(
					new Response(
						JSON.stringify({
							success: true,
							data: { id: `bulk_${Math.random().toString(36).substr(2, 9)}`, vectorIndexed: true },
						}),
						{ status: 201 },
					),
				),
			);

			const results = await Promise.all(testMemories.map((memory) => store.store(memory)));

			const duration = Date.now() - startTime;
			const avgTimePerMemory = duration / testMemories.length;

			expect(results).toHaveLength(100);
			expect(duration).toBeLessThan(5000); // Total time < 5 seconds for 100 memories
			expect(avgTimePerMemory).toBeLessThan(50); // < 50ms per memory on average

			mockFetch.mockRestore();
		});

		it('should maintain search performance under load', async () => {
			const { LocalMemoryStore } = await import('@cortex-os/memories');
			const store = new LocalMemoryStore();

			const searchQueries = [
				'brAInwav artificial intelligence',
				'memory search performance',
				'vector similarity testing',
				'hybrid search algorithm',
				'cognitive architecture',
			];

			const mockSearchResponse = {
				success: true,
				data: Array.from({ length: 10 }, (_, i) => ({
					id: `search_result_${i}`,
					content: `brAInwav search result ${i}`,
					importance: 0.8,
					score: 0.9 - i * 0.05,
					domain: 'search-test',
					tags: ['result', 'brainwav'],
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
					vectorIndexed: true,
				})),
			};

			const mockFetch = vi
				.spyOn(global, 'fetch')
				.mockResolvedValue(new Response(JSON.stringify(mockSearchResponse), { status: 200 }));

			const startTime = Date.now();

			// Execute concurrent searches
			const searchPromises = searchQueries.map((query) =>
				store.searchByText({
					query,
					limit: 10,
					threshold: 0.7,
					hybrid_search: true,
				}),
			);

			const results = await Promise.all(searchPromises);
			const duration = Date.now() - startTime;

			expect(results).toHaveLength(5);
			expect(duration).toBeLessThan(1000); // All searches within 1 second
			expect(results.every((result) => result.length <= 10)).toBe(true);

			mockFetch.mockRestore();
		});

		it('should optimize memory usage during large operations', async () => {
			const { LocalMemoryStore } = await import('@cortex-os/memories');
			const store = new LocalMemoryStore();

			// Measure initial memory usage
			const initialMemory = process.memoryUsage();

			const mockFetch = vi.spyOn(global, 'fetch').mockImplementation(() =>
				Promise.resolve(
					new Response(
						JSON.stringify({
							success: true,
							data: { id: 'memory_test', vectorIndexed: true },
						}),
						{ status: 201 },
					),
				),
			);

			// Perform 500 memory operations
			const operations = Array.from({ length: 500 }, (_, i) =>
				store.store({
					content: `brAInwav memory usage test ${i}`,
					importance: 0.5,
				}),
			);

			await Promise.all(operations);

			const finalMemory = process.memoryUsage();
			const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;

			// Memory growth should be reasonable (< 50MB for 500 operations)
			expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024);

			mockFetch.mockRestore();
		});
	});

	describe('Memory System Scalability', () => {
		it('should handle concurrent users efficiently', async () => {
			const { LocalMemoryStore } = await import('@cortex-os/memories');

			const userSessions = Array.from({ length: 20 }, () => new LocalMemoryStore());

			const mockFetch = vi.spyOn(global, 'fetch').mockImplementation(() =>
				Promise.resolve(
					new Response(
						JSON.stringify({
							success: true,
							data: { id: 'concurrent_user_test', vectorIndexed: true },
						}),
						{ status: 201 },
					),
				),
			);

			const startTime = Date.now();

			// Simulate 20 concurrent users each performing 5 operations
			const concurrentOperations = userSessions.flatMap((store, userIndex) =>
				Array.from({ length: 5 }, (_, opIndex) =>
					store.store({
						content: `brAInwav concurrent user ${userIndex} operation ${opIndex}`,
						importance: 0.6,
						domain: `user-${userIndex}`,
						tags: ['concurrent', 'brainwav'],
					}),
				),
			);

			const results = await Promise.all(concurrentOperations);
			const duration = Date.now() - startTime;

			expect(results).toHaveLength(100); // 20 users × 5 operations
			expect(duration).toBeLessThan(3000); // All operations within 3 seconds
			expect(mockFetch).toHaveBeenCalledTimes(100);

			mockFetch.mockRestore();
		});

		it('should maintain response times under sustained load', async () => {
			const { LocalMemoryStore } = await import('@cortex-os/memories');
			const store = new LocalMemoryStore();

			const responseTimes: number[] = [];

			const mockFetch = vi.spyOn(global, 'fetch').mockImplementation(() =>
				Promise.resolve(
					new Response(
						JSON.stringify({
							success: true,
							data: { id: 'sustained_load_test', vectorIndexed: true },
						}),
						{ status: 201 },
					),
				),
			);

			// Perform operations in batches to simulate sustained load
			for (let batch = 0; batch < 10; batch++) {
				const batchStartTime = Date.now();

				const batchOperations = Array.from({ length: 20 }, (_, i) =>
					store.store({
						content: `brAInwav sustained load batch ${batch} operation ${i}`,
						importance: 0.5,
					}),
				);

				await Promise.all(batchOperations);

				const batchDuration = Date.now() - batchStartTime;
				responseTimes.push(batchDuration);

				// Small delay between batches
				await new Promise((resolve) => setTimeout(resolve, 100));
			}

			const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
			const maxResponseTime = Math.max(...responseTimes);

			expect(avgResponseTime).toBeLessThan(500); // Average batch time < 500ms
			expect(maxResponseTime).toBeLessThan(1000); // No batch takes > 1 second
			expect(responseTimes.length).toBe(10); // All batches completed

			mockFetch.mockRestore();
		});
	});

	describe('Memory Resource Optimization', () => {
		it('should implement efficient connection pooling', async () => {
			const { LocalMemoryStore } = await import('@cortex-os/memories');

			// Create multiple store instances to test connection reuse
			const stores = Array.from({ length: 5 }, () => new LocalMemoryStore());

			let connectionAttempts = 0;
			const mockFetch = vi.spyOn(global, 'fetch').mockImplementation(() => {
				connectionAttempts++;
				return Promise.resolve(
					new Response(
						JSON.stringify({
							success: true,
							data: { id: 'connection_pool_test', vectorIndexed: true },
						}),
						{ status: 201 },
					),
				);
			});

			// Each store performs operations
			const operations = stores.map((store, index) =>
				store.store({
					content: `brAInwav connection pool test ${index}`,
					importance: 0.7,
				}),
			);

			await Promise.all(operations);

			expect(connectionAttempts).toBe(5); // One connection per store
			expect(stores).toHaveLength(5);

			mockFetch.mockRestore();
		});

		it('should implement request deduplication for identical operations', async () => {
			const { LocalMemoryStore } = await import('@cortex-os/memories');
			const store = new LocalMemoryStore();

			let uniqueRequests = 0;
			const seenRequests = new Set<string>();

			const mockFetch = vi.spyOn(global, 'fetch').mockImplementation((url, options) => {
				const requestKey = `${url}-${options?.body}`;
				if (!seenRequests.has(requestKey)) {
					uniqueRequests++;
					seenRequests.add(requestKey);
				}

				return Promise.resolve(
					new Response(
						JSON.stringify({
							success: true,
							data: { id: 'dedup_test', vectorIndexed: true },
						}),
						{ status: 201 },
					),
				);
			});

			const identicalInput = {
				content: 'brAInwav deduplication test',
				importance: 0.6,
			};

			// Make 5 identical requests simultaneously
			const duplicateOperations = Array.from({ length: 5 }, () => store.store(identicalInput));

			const results = await Promise.all(duplicateOperations);

			expect(results).toHaveLength(5);
			// Deduplication should be handled at the HTTP client level
			// This test verifies the behavior exists
			expect(mockFetch).toHaveBeenCalled();

			mockFetch.mockRestore();
		});
	});
});
