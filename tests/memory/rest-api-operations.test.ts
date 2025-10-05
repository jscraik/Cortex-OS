/**
 * brAInwav Memory REST API Operations Test Suite
 * Phase 1.2: Comprehensive memory operation validation
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

function getHeaders(init: RequestInit | undefined): Headers {
	if (!init?.headers) {
		return new Headers();
	}
	return init.headers instanceof Headers ? init.headers : new Headers(init.headers as HeadersInit);
}

describe('brAInwav Memory REST API Operations - Phase 1.2', () => {
	describe('Memory Store Operations', () => {
		it('should store memory via REST API with brAInwav branding', async () => {
			const mockFetch = vi.spyOn(global, 'fetch').mockResolvedValue(
				new Response(
					JSON.stringify({
						success: true,
						data: { id: 'mem_123', vectorIndexed: true },
					}),
					{
						status: 201,
						headers: { 'content-type': 'application/json' },
					},
				),
			);

			const provider = createProvider();

			const input: MemoryStoreInput = {
				content: 'brAInwav test memory content',
				importance: 5,
				domain: 'test-domain',
				tags: ['brainwav', 'test'],
			};

			const result = await provider.store(input);

			const [url, init] = mockFetch.mock.calls[0];
			const headers = getHeaders(init);

			expect(url).toBe(`${BASE_URL}/memory/store`);
			expect(headers.get('content-type')).toBe('application/json');
			expect(headers.get('user-agent')).toMatch(/brainwav/i);
			expect(result).toEqual({ id: 'mem_123', vectorIndexed: true });

			mockFetch.mockRestore();
		});

		it('should search memories via REST API with brAInwav headers', async () => {
			const responsePayload = {
				success: true,
				data: [
					{
						id: 'mem_456',
						content: 'brAInwav search result',
						importance: 9,
						score: 0.95,
						domain: 'search-test',
						tags: ['brainwav'],
						createdAt: new Date().toISOString(),
						updatedAt: new Date().toISOString(),
						vectorIndexed: true,
					},
				],
			};

			const mockFetch = vi.spyOn(global, 'fetch').mockResolvedValue(
				new Response(JSON.stringify(responsePayload), {
					status: 200,
					headers: { 'content-type': 'application/json' },
				}),
			);

			const provider = createProvider();

			const searchInput: MemorySearchInput = {
				query: 'brAInwav memory search',
				tags: ['brainwav'],
				limit: 10,
				offset: 0,
				score_threshold: 0.7,
				hybrid_weight: 0.6,
				domain: 'search-test',
			};

			const results = await provider.search(searchInput);

			const [url, init] = mockFetch.mock.calls[0];
			const headers = getHeaders(init);

			expect(url).toBe(`${BASE_URL}/memory/search`);
			expect(headers.get('content-type')).toBe('application/json');
			expect(headers.get('user-agent')).toMatch(/brainwav/i);
			expect(results).toHaveLength(1);
			expect(results[0]).toMatchObject({
				content: 'brAInwav search result',
				score: 0.95,
			});

			mockFetch.mockRestore();
		});
	});

	describe('Memory API Error Handling', () => {
		it('should handle REST API errors with brAInwav branding', async () => {
			const mockFetch = vi.spyOn(global, 'fetch').mockResolvedValue(
				new Response(
					JSON.stringify({
						success: false,
						error: {
							code: 'VALIDATION_ERROR',
							message: 'brAInwav: Invalid memory input format',
						},
					}),
					{
						status: 200,
						headers: { 'content-type': 'application/json' },
					},
				),
			);

			const provider = createProvider();

			const invalidInput = {
				content: '',
				importance: 11,
			} as unknown as MemoryStoreInput;

			await expect(provider.store(invalidInput)).rejects.toThrow(/Invalid memory input/);

			mockFetch.mockRestore();
		});

		it('surfaces upstream HTTP failures with brAInwav context', async () => {
			const mockFetch = vi
				.spyOn(global, 'fetch')
				.mockResolvedValue(new Response('', { status: 503 }));

			const provider = createProvider();

			const input: MemoryStoreInput = {
				content: 'brAInwav retry test',
				importance: 7,
				domain: 'retry-test',
			};

			await expect(provider.store(input)).rejects.toThrow(/HTTP 503/i);

			mockFetch.mockRestore();
		});
	});

	describe('Memory Operation Performance', () => {
		it('should complete memory operations within brAInwav SLA (<250ms)', async () => {
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
				importance: (i % 10) + 1,
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
			const mockSearchResponse = () =>
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
				});

			const mockFetch = vi.spyOn(global, 'fetch').mockImplementation(() =>
				Promise.resolve(
					new Response(mockSearchResponse(), {
						status: 200,
						headers: { 'content-type': 'application/json' },
					}),
				),
			);

			const provider = createProvider();

			const searchQueries = [
				{ query: 'brAInwav artificial intelligence', domain: 'ai' },
				{ query: 'memory search performance', domain: 'search' },
				{ query: 'vector similarity testing', domain: 'similarity' },
				{ query: 'hybrid search algorithm', domain: 'hybrid' },
				{ query: 'cognitive architecture', domain: 'cog' },
			];

			const startTime = Date.now();

			const searchPromises = searchQueries.map(({ query, domain }) =>
				provider.search({
					query,
					domain,
					limit: 10,
					offset: 0,
					score_threshold: 0.6,
					hybrid_weight: 0.6,
				}),
			);

			const results = await Promise.all(searchPromises);
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
					importance: (i % 10) + 1,
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
					importance: (index % 10) + 1,
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
});
