/**
 * brAInwav Memory REST API Operations Test Suite
 * Phase 1.2: Comprehensive memory operation validation
 *
 * Following CODESTYLE.md: functional-first, ≤40 lines per function, named exports
 */

import type { MemorySearchInput, MemoryStoreInput } from '@cortex-os/memories';
import { describe, expect, it, vi } from 'vitest';

describe('brAInwav Memory REST API Operations - Phase 1.2', () => {
	describe('Memory Store Operations', () => {
		it('should store memory via REST API with brAInwav branding', async () => {
			// Mock fetch to verify REST API calls
			const mockFetch = vi.spyOn(global, 'fetch').mockResolvedValue(
				new Response(
					JSON.stringify({
						success: true,
						data: { id: 'mem_123', vectorIndexed: true },
					}),
					{
						status: 201,
						headers: {
							'content-type': 'application/json',
							'x-brainwav-service': 'memory-core',
						},
					},
				),
			);

			const { LocalMemoryStore } = await import('@cortex-os/memories');
			const store = new LocalMemoryStore();

			const input: MemoryStoreInput = {
				content: 'brAInwav test memory content',
				importance: 0.8,
				domain: 'test',
				tags: ['brainwav', 'test'],
			};

			const result = await store.store(input);

			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringContaining('/memory/store'),
				expect.objectContaining({
					method: 'POST',
					headers: expect.objectContaining({
						'content-type': 'application/json',
						'user-agent': expect.stringContaining('brAInwav'),
					}),
					body: JSON.stringify(input),
				}),
			);

			expect(result).toEqual({
				id: 'mem_123',
				vectorIndexed: true,
			});

			mockFetch.mockRestore();
		});

		it('should search memories via REST API with brAInwav headers', async () => {
			const mockSearchResponse = {
				success: true,
				data: [
					{
						id: 'mem_456',
						content: 'brAInwav search result',
						importance: 0.9,
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
				new Response(JSON.stringify(mockSearchResponse), {
					status: 200,
					headers: {
						'content-type': 'application/json',
						'x-brainwav-service': 'memory-core',
					},
				}),
			);

			const { LocalMemoryStore } = await import('@cortex-os/memories');
			const store = new LocalMemoryStore();

			const searchInput: MemorySearchInput = {
				query: 'brAInwav memory search',
				limit: 10,
				threshold: 0.7,
			};

			const results = await store.searchByText(searchInput);

			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringContaining('/memory/search'),
				expect.objectContaining({
					method: 'POST',
					headers: expect.objectContaining({
						'content-type': 'application/json',
						'user-agent': expect.stringContaining('brAInwav'),
					}),
					body: JSON.stringify(searchInput),
				}),
			);

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
						status: 400,
						headers: {
							'content-type': 'application/json',
							'x-brainwav-service': 'memory-core',
						},
					},
				),
			);

			const { LocalMemoryStore } = await import('@cortex-os/memories');
			const store = new LocalMemoryStore();

			const invalidInput = {
				content: '', // Invalid empty content
				importance: 1.5, // Invalid importance > 1
			};

			await expect(store.store(invalidInput as unknown)).rejects.toThrow(
				expect.stringMatching(/brAInwav.*Invalid memory input/),
			);

			mockFetch.mockRestore();
		});

		it('should retry failed requests with exponential backoff', async () => {
			let callCount = 0;
			const mockFetch = vi.spyOn(global, 'fetch').mockImplementation(() => {
				callCount++;
				if (callCount < 3) {
					return Promise.resolve(new Response('', { status: 503 }));
				}
				return Promise.resolve(
					new Response(
						JSON.stringify({
							success: true,
							data: { id: 'retry_success', vectorIndexed: true },
						}),
						{ status: 201 },
					),
				);
			});

			const { LocalMemoryStore } = await import('@cortex-os/memories');
			const store = new LocalMemoryStore();

			const input: MemoryStoreInput = {
				content: 'brAInwav retry test',
				importance: 0.5,
			};

			const result = await store.store(input);

			expect(callCount).toBe(3); // Initial + 2 retries
			expect(result.id).toBe('retry_success');

			mockFetch.mockRestore();
		});
	});

	describe('Memory Operation Performance', () => {
		it('should complete memory operations within brAInwav SLA (<250ms)', async () => {
			const mockFetch = vi.spyOn(global, 'fetch').mockImplementation(() => {
				// Simulate fast response
				return Promise.resolve(
					new Response(
						JSON.stringify({
							success: true,
							data: { id: 'perf_test', vectorIndexed: true },
						}),
						{ status: 201 },
					),
				);
			});

			const { LocalMemoryStore } = await import('@cortex-os/memories');
			const store = new LocalMemoryStore();

			const startTime = Date.now();

			await store.store({
				content: 'brAInwav performance test',
				importance: 0.7,
			});

			const duration = Date.now() - startTime;

			expect(duration).toBeLessThan(250); // brAInwav SLA requirement

			mockFetch.mockRestore();
		});

		it('should handle concurrent memory operations efficiently', async () => {
			const mockFetch = vi.spyOn(global, 'fetch').mockResolvedValue(
				new Response(
					JSON.stringify({
						success: true,
						data: { id: 'concurrent_test', vectorIndexed: true },
					}),
					{ status: 201 },
				),
			);

			const { LocalMemoryStore } = await import('@cortex-os/memories');
			const store = new LocalMemoryStore();

			const concurrentOperations = Array.from({ length: 10 }, (_, i) =>
				store.store({
					content: `brAInwav concurrent test ${i}`,
					importance: 0.5,
				}),
			);

			const startTime = Date.now();
			const results = await Promise.all(concurrentOperations);
			const duration = Date.now() - startTime;

			expect(results).toHaveLength(10);
			expect(duration).toBeLessThan(1000); // All operations within 1 second
			expect(mockFetch).toHaveBeenCalledTimes(10);

			mockFetch.mockRestore();
		});
	});

	describe('brAInwav Compliance Validation', () => {
		it('should include brAInwav branding in all HTTP headers', async () => {
			const mockFetch = vi
				.spyOn(global, 'fetch')
				.mockResolvedValue(
					new Response(JSON.stringify({ success: true, data: {} }), { status: 200 }),
				);

			const { LocalMemoryStore } = await import('@cortex-os/memories');
			const store = new LocalMemoryStore();

			await store.store({
				content: 'brAInwav branding test',
				importance: 0.6,
			});

			expect(mockFetch).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					headers: expect.objectContaining({
						'user-agent': expect.stringMatching(/brAInwav/i),
						'x-brainwav-client': expect.any(String),
					}),
				}),
			);

			mockFetch.mockRestore();
		});

		it('should validate response includes brAInwav service headers', async () => {
			const mockFetch = vi.spyOn(global, 'fetch').mockResolvedValue(
				new Response(
					JSON.stringify({
						success: true,
						data: { id: 'branding_test', vectorIndexed: true },
					}),
					{
						status: 201,
						headers: {
							'content-type': 'application/json',
							'x-brainwav-service': 'memory-core',
							'x-brainwav-version': '1.0.0',
						},
					},
				),
			);

			const { LocalMemoryStore } = await import('@cortex-os/memories');
			const store = new LocalMemoryStore();

			// Mock response validation in store
			const originalFetch = store.fetch;
			store.fetch = async (...args) => {
				const response = await originalFetch.apply(store, args);

				// Validate brAInwav headers in response
				expect(response.headers.get('x-brainwav-service')).toBe('memory-core');
				expect(response.headers.get('x-brainwav-version')).toBeTruthy();

				return response;
			};

			await store.store({
				content: 'brAInwav header validation test',
				importance: 0.8,
			});

			mockFetch.mockRestore();
		});
	});
});
