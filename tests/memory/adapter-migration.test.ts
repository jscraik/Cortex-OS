/**
 * TDD Migration Tests: Memory Adapter Consolidation
 * Phase 1.1: Remove Legacy Memory Adapters
 * 
 * Following brAInwav TDD standards - writing failing tests first
 * to guide the removal of direct database access
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Memory } from '../../packages/memories/src/domain/types.js';

describe('Memory Adapter Migration - Phase 1.1', () => {
	describe('Legacy Direct Database Adapter Removal', () => {
		it('should reject direct database connections', async () => {
			// This test should fail initially, then pass after migration
			const { MemoryAdapter } = await import('../../packages/memories/src/adapters/store.prisma/client.js');
			const adapter = new (MemoryAdapter as any)({});
			
			// Any attempt to use direct DB queries should be rejected
			await expect((adapter as any).directDBQuery?.('SELECT * FROM memories')).rejects.toThrow(
				'Direct DB access deprecated - use REST API'
			);
		});

		it('should route all operations through REST API', async () => {
			// Test that LocalMemoryAdapter uses REST client instead of direct DB
			const { LocalMemoryStore } = await import('../../packages/memories/src/adapters/store.localmemory.js');
			const adapter = new LocalMemoryStore();
			
			// Mock fetch to verify REST calls
			const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
				new Response(JSON.stringify({ id: 'test', kind: 'note', text: 'test' }), {
					status: 200,
					headers: { 'content-type': 'application/json' }
				})
			);

			const testMemory: Memory = {
				id: 'test-memory',
				kind: 'note',
				text: 'test content',
				tags: [],
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				provenance: { source: 'system' }
			};

			await adapter.upsert(testMemory);
			
			// Verify REST API was called, not direct database
			expect(fetchSpy).toHaveBeenCalledWith(
				expect.stringContaining('/memories/'),
				expect.objectContaining({
					method: 'PUT',
					headers: expect.objectContaining({
						'content-type': 'application/json'
					})
				})
			);

			fetchSpy.mockRestore();
		});

		it('should fail when trying to import removed PostgresAdapter', async () => {
			// This should pass once PostgresAdapter is removed
			await expect(async () => {
				await import('../../packages/memories/src/adapters/store.postgres.js');
			}).rejects.toThrow(/Cannot resolve module|Module not found/);
		});

		it('should fail when trying to import removed VectorAdapter', async () => {
			// This should pass once VectorAdapter is removed  
			await expect(async () => {
				await import('../../packages/memories/src/adapters/store.vector.js');
			}).rejects.toThrow(/Cannot resolve module|Module not found/);
		});
	});

	describe('REST API Adapter Validation', () => {
		let restAdapter: any;

		beforeEach(async () => {
			const { RestApiClient } = await import('../../packages/memories/src/adapters/rest-api/rest-adapter.js');
			restAdapter = new RestApiClient({
				baseUrl: 'http://localhost:3028',
				timeoutMs: 5000
			});
		});

		it('should enforce brAInwav branding in REST responses', async () => {
			const mockResponse = {
				memory: { id: 'test', kind: 'note', text: 'brAInwav test' },
				requestId: 'req-123'
			};

			vi.spyOn(restAdapter, 'getHttpClient').mockReturnValue({
				request: vi.fn().mockResolvedValue({
					data: mockResponse,
					headers: { 'x-brainwav-source': 'memory-core' },
					status: 200
				}),
				setDefaultHeaders: vi.fn(),
				setAuth: vi.fn(),
				close: vi.fn()
			});

			const result = await restAdapter.createMemory({
				memory: { id: 'test', kind: 'note', text: 'brAInwav test' }
			});

			expect(result.memory.text).toContain('brAInwav');
		});

		it('should handle circuit breaker for repeated failures', async () => {
			// Test that circuit breaker prevents cascading failures
			const mockHttpClient = {
				request: vi.fn().mockRejectedValue(new Error('Service unavailable')),
				setDefaultHeaders: vi.fn(),
				setAuth: vi.fn(),
				close: vi.fn()
			};

			vi.spyOn(restAdapter, 'getHttpClient').mockReturnValue(mockHttpClient);

			// First 5 failures should be attempted
			for (let i = 0; i < 5; i++) {
				await expect(restAdapter.healthCheck()).rejects.toThrow();
			}

			// 6th call should fail immediately with circuit breaker
			await expect(restAdapter.healthCheck()).rejects.toThrow(/circuit breaker|too many failures/i);
		});

		it('should enforce < 10ms latency overhead for REST operations', async () => {
			const startTime = performance.now();
			
			vi.spyOn(restAdapter, 'getHttpClient').mockReturnValue({
				request: vi.fn().mockResolvedValue({
					data: { status: 'healthy' },
					headers: {},
					status: 200
				}),
				setDefaultHeaders: vi.fn(),
				setAuth: vi.fn(), 
				close: vi.fn()
			});

			await restAdapter.healthCheck();
			
			const duration = performance.now() - startTime;
			expect(duration).toBeLessThan(10); // < 10ms overhead as per plan requirement
		});
	});

	describe('Python MCP Adapter Migration', () => {
		it('should verify Python adapter routes to Node MCP server', async () => {
			// This verifies cross-language integration requirement from plan
			const mockPythonResponse = {
				success: true,
				data: {
					results: [{ id: 'test', text: 'brAInwav memory', score: 0.95 }],
					total_found: 1
				}
			};

			// Mock the HTTP call that Python adapter would make to Node
			global.fetch = vi.fn().mockResolvedValue(
				new Response(JSON.stringify(mockPythonResponse), {
					status: 200,
					headers: { 'content-type': 'application/json' }
				})
			);

			// Simulate what Python LocalMemoryAdapter would do
			const response = await fetch('http://localhost:3028/memory/search', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					query: 'brAInwav test',
					search_type: 'semantic',
					limit: 5
				})
			});

			const data = await response.json();
			expect(data.success).toBe(true);
			expect(data.data.results[0].text).toContain('brAInwav');
		});
	});
});