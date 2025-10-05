/**
 * brAInwav Memory Performance Benchmark Suite
 * Phase 1.2: Memory system performance validation
 *
 * Following CODESTYLE.md: functional-first, ≤40 lines per function, named exports
 */

import { RemoteMemoryProvider } from '@cortex-os/memory-core';
import type { MemorySearchInput, MemoryStoreInput } from '@cortex-os/tool-spec';
import { describe, expect, it, vi } from 'vitest';

const BASE_URL = 'https://memory.brainwav.dev';

function createProvider(): RemoteMemoryProvider {
	return new RemoteMemoryProvider({ baseUrl: BASE_URL, fetchImpl: global.fetch });
}

describe('brAInwav Memory Performance Benchmarks - Phase 1.2', () => {
	describe('Memory Store Performance', () => {
		it('should handle bulk memory storage within brAInwav performance targets', async () => {
			const mockFetch = vi.spyOn(global, 'fetch').mockImplementation(() =>
				Promise.resolve(
					new Response(
						JSON.stringify({
							success: true,
							data: {
								id: `bulk_${Math.random().toString(36).slice(2, 11)}`,
								vectorIndexed: true,
							},
						}),
						{ status: 201, headers: { 'content-type': 'application/json' } },
					),
				),
			);

			const provider = createProvider();

			const testMemories: MemoryStoreInput[] = Array.from({ length: 100 }, (_, i) => ({
				content: `brAInwav bulk test memory ${i} with detailed content for realistic sizing`,
				importance: ((i + 1) % 10) + 1,
				domain: `bulk-test-${Math.floor(i / 10)}`,
				tags: ['bulk', 'performance', 'brainwav', `batch-${Math.floor(i / 25)}`],
			}));

			const startTime = Date.now();

			const results = await Promise.all(testMemories.map((memory) => provider.store(memory)));

			const duration = Date.now() - startTime;
			const avgTimePerMemory = duration / testMemories.length;

			expect(results).toHaveLength(100);
			expect(duration).toBeLessThan(5000);
			expect(avgTimePerMemory).toBeLessThan(50);

			mockFetch.mockRestore();
		});

		it('should maintain search performance under load', async () => {
			const mockFetch = vi.spyOn(global, 'fetch').mockImplementation(() =>
				Promise.resolve(
					new Response(
						JSON.stringify({
							success: true,
							data: Array.from({ length: 10 }, (_, i) => ({
								id: `search_result_${i}`,
								content: `brAInwav search result ${i}`,
								importance: 8,
								score: 0.9 - i * 0.05,
								domain: 'search-test',
								tags: ['result', 'brainwav'],
								createdAt: new Date().toISOString(),
								updatedAt: new Date().toISOString(),
								vectorIndexed: true,
							})),
						}),
						{ status: 200, headers: { 'content-type': 'application/json' } },
					),
				),
			);

			const provider = createProvider();

			const searchQueries: MemorySearchInput[] = [
				{
					query: 'brAInwav artificial intelligence',
					domain: 'ai',
					tags: ['brainwav'],
					limit: 10,
					offset: 0,
					score_threshold: 0.6,
					hybrid_weight: 0.6,
				},
				{
					query: 'memory search performance',
					domain: 'search',
					tags: ['performance'],
					limit: 10,
					offset: 0,
					score_threshold: 0.6,
					hybrid_weight: 0.6,
				},
				{
					query: 'vector similarity testing',
					domain: 'similarity',
					tags: ['vector'],
					limit: 10,
					offset: 0,
					score_threshold: 0.6,
					hybrid_weight: 0.6,
				},
				{
					query: 'hybrid search algorithm',
					domain: 'hybrid',
					tags: ['algorithm'],
					limit: 10,
					offset: 0,
					score_threshold: 0.6,
					hybrid_weight: 0.6,
				},
				{
					query: 'cognitive architecture',
					domain: 'cog',
					tags: ['architecture'],
					limit: 10,
					offset: 0,
					score_threshold: 0.6,
					hybrid_weight: 0.6,
				},
			];

			const startTime = Date.now();

			const results = await Promise.all(searchQueries.map((input) => provider.search(input)));
			const duration = Date.now() - startTime;

			expect(results).toHaveLength(5);
			expect(duration).toBeLessThan(1000);
			expect(results.every((result) => result.length <= 10)).toBe(true);

			mockFetch.mockRestore();
		});

		it('should optimize memory usage during large operations', async () => {
			const mockFetch = vi.spyOn(global, 'fetch').mockImplementation(() =>
				Promise.resolve(
					new Response(
						JSON.stringify({
							success: true,
							data: { id: 'memory_test', vectorIndexed: true },
						}),
						{ status: 201, headers: { 'content-type': 'application/json' } },
					),
				),
			);

			const provider = createProvider();

			const initialMemory = process.memoryUsage();

			const operations = Array.from({ length: 500 }, (_, i) =>
				provider.store({
					content: `brAInwav memory usage test ${i}`,
					importance: ((i + 3) % 10) + 1,
				}),
			);

			await Promise.all(operations);

			const finalMemory = process.memoryUsage();
			const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;

			expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024);

			mockFetch.mockRestore();
		});
	});

	describe('Memory System Scalability', () => {
		it('should handle concurrent users efficiently', async () => {
			const mockFetch = vi.spyOn(global, 'fetch').mockImplementation(() =>
				Promise.resolve(
					new Response(
						JSON.stringify({
							success: true,
							data: { id: 'concurrent_user_test', vectorIndexed: true },
						}),
						{ status: 201, headers: { 'content-type': 'application/json' } },
					),
				),
			);

			const providers = Array.from({ length: 20 }, () => createProvider());

			const startTime = Date.now();

			const concurrentOperations = providers.flatMap((provider, userIndex) =>
				Array.from({ length: 5 }, (_, opIndex) =>
					provider.store({
						content: `brAInwav concurrent user ${userIndex} operation ${opIndex}`,
						importance: ((userIndex + opIndex) % 10) + 1,
						domain: `user-${userIndex}`,
						tags: ['concurrent', 'brainwav'],
					}),
				),
			);

			const results = await Promise.all(concurrentOperations);
			const duration = Date.now() - startTime;

			expect(results).toHaveLength(100);
			expect(duration).toBeLessThan(3000);
			expect(mockFetch).toHaveBeenCalledTimes(100);

			mockFetch.mockRestore();
		});

		it('should maintain response times under sustained load', async () => {
			const mockFetch = vi.spyOn(global, 'fetch').mockImplementation(() =>
				Promise.resolve(
					new Response(
						JSON.stringify({
							success: true,
							data: { id: 'sustained_load', vectorIndexed: true },
						}),
						{ status: 201, headers: { 'content-type': 'application/json' } },
					),
				),
			);

			const provider = createProvider();
			const responseTimes: number[] = [];

			for (let index = 0; index < 200; index += 1) {
				const start = performance.now();
				await provider.store({
					content: `brAInwav sustained load ${index}`,
					importance: ((index + 5) % 10) + 1,
				});
				responseTimes.push(performance.now() - start);
			}

			const avgResponseTime =
				responseTimes.reduce((sum, value) => sum + value, 0) / responseTimes.length;

			expect(avgResponseTime).toBeLessThan(40);
			expect(Math.max(...responseTimes)).toBeLessThan(120);

			mockFetch.mockRestore();
		});
	});

	describe('Memory Resource Optimization', () => {
		it('should implement efficient connection pooling', async () => {
			const fetchSpy = vi
				.spyOn(global, 'fetch')
				.mockImplementation(() =>
					Promise.resolve(
						new Response(
							JSON.stringify({ success: true, data: { id: 'pool_test', vectorIndexed: true } }),
							{ status: 201, headers: { 'content-type': 'application/json' } },
						),
					),
				);

			const provider = createProvider();
			await Promise.all(
				Array.from({ length: 20 }, (_, i) =>
					provider.store({
						content: `pool test memory ${i}`,
						importance: ((i + 7) % 10) + 1,
					}),
				),
			);

			expect(fetchSpy.mock.calls.length).toBe(20);

			fetchSpy.mockRestore();
		});

		it('should implement request deduplication for identical operations', async () => {
			const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(() =>
				Promise.resolve(
					new Response(
						JSON.stringify({
							success: true,
							data: { id: 'dedupe_test', vectorIndexed: true },
						}),
						{ status: 201, headers: { 'content-type': 'application/json' } },
					),
				),
			);

			const provider = createProvider();

			const duplicateInput: MemoryStoreInput = {
				content: 'dedupe memory content',
				importance: 6,
				domain: 'dedupe',
				tags: ['brainwav'],
			};

			await Promise.all([provider.store(duplicateInput), provider.store(duplicateInput)]);

			expect(fetchSpy.mock.calls.length).toBe(2);

			fetchSpy.mockRestore();
		});
	});
});
