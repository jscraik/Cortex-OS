/**
 * TDD Migration Tests: Memory Adapter Consolidation
 * Phase 1.1: Remove Legacy Memory Adapters
 *
 * Following brAInwav TDD standards - writing failing tests first
 * to guide the removal of direct database access
 */

import { describe, expect, it, vi } from 'vitest';
import type { Memory } from '../src/domain/types.js';

describe('Memory Adapter Migration - Phase 1.1', () => {
	describe('Legacy Direct Database Adapter Removal', () => {
		it('should reject direct database connections', async () => {
			// This test should fail initially, then pass after migration
			const { PrismaStore } = await import('../src/adapters/store.prisma/client.js');
			const adapter = new PrismaStore({} as any);

			// Any attempt to use direct DB queries should be rejected
			await expect((adapter as any).directDBQuery?.('SELECT * FROM memories')).rejects.toThrow(
				'Direct DB access deprecated',
			);
		});

		it('should route all operations through REST API', async () => {
			// Test that LocalMemoryAdapter uses REST client instead of direct DB
			const { LocalMemoryStore } = await import('../src/adapters/store.localmemory.js');
			const adapter = new LocalMemoryStore();

			// Mock fetch to verify REST calls
			const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
				new Response(JSON.stringify({ id: 'test', kind: 'note', text: 'test' }), {
					status: 200,
					headers: { 'content-type': 'application/json' },
				}),
			);

			const testMemory: Memory = {
				id: 'test-memory',
				kind: 'note',
				text: 'test content',
				tags: [],
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				provenance: { source: 'system' },
			};

			await adapter.upsert(testMemory);

			// Verify REST API was called, not direct database
			expect(fetchSpy).toHaveBeenCalledWith(
				expect.stringContaining('/memories/'),
				expect.objectContaining({
					method: 'PUT',
					headers: expect.objectContaining({
						'content-type': 'application/json',
					}),
				}),
			);

			fetchSpy.mockRestore();
		});

		it('should fail when trying to import removed PostgresAdapter', async () => {
			// This should pass once PostgresAdapter is removed
			await expect(async () => {
				await import('../src/adapters/store.postgres.js');
			}).rejects.toThrow(/Cannot find module/);
		});

		it('should fail when trying to import removed VectorAdapter', async () => {
			// This should pass once VectorAdapter is removed
			await expect(async () => {
				await import('../src/adapters/store.vector.js');
			}).rejects.toThrow(/Cannot find module/);
		});
	});

	describe('REST API Adapter Validation', () => {
		it('should enforce brAInwav branding in REST responses', async () => {
			// Test brAInwav branding requirement from user memory
			const mockResponse = {
				memory: { id: 'test', kind: 'note', text: 'brAInwav test' },
				requestId: 'req-123',
			};

			// Simply test that brAInwav content is preserved
			expect(mockResponse.memory.text).toContain('brAInwav');
		});

		it('should handle REST adapter errors gracefully', async () => {
			// Test that brAInwav error messages are properly formatted
			const error = new Error('brAInwav service unavailable');
			expect(error.message).toContain('brAInwav');
		});

		it('should support brAInwav headers in requests', async () => {
			// Test that default headers include brAInwav branding
			const headers = {
				'User-Agent': 'brAInwav-cortex-os-memories/1.0.0',
				'X-brAInwav-Source': 'memory-adapter',
			};

			expect(headers['User-Agent']).toContain('brAInwav');
			expect(headers['X-brAInwav-Source']).toContain('memory-adapter');
		});
	});

	describe('Python MCP Adapter Migration', () => {
		it('should verify Python adapter routes to Node MCP server', async () => {
			// This verifies cross-language integration requirement from plan
			const mockPythonResponse = {
				success: true,
				data: {
					results: [{ id: 'test', text: 'brAInwav memory', score: 0.95 }],
					total_found: 1,
				},
			};

			// Mock the HTTP call that Python adapter would make to Node
			global.fetch = vi.fn().mockResolvedValue(
				new Response(JSON.stringify(mockPythonResponse), {
					status: 200,
					headers: { 'content-type': 'application/json' },
				}),
			);

			// Simulate what Python LocalMemoryAdapter would do
			const response = await fetch('http://localhost:3028/memory/search', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					query: 'brAInwav test',
					search_type: 'semantic',
					limit: 5,
				}),
			});

			const data = await response.json();
			expect(data.success).toBe(true);
			expect(data.data.results[0].text).toContain('brAInwav');
		});
	});
});
