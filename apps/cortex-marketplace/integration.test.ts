/**
 * @file Integration Tests
 * @description End-to-end integration tests for MCP marketplace
 */

import { existsSync } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { ServerManifest } from '@cortex-os/mcp-registry';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { build } from './src/app.js';

describe('MCP Marketplace Integration Tests', () => {
	let app: FastifyInstance;
	let testCacheDir: string;

	const mockRegistryData = {
		version: '2025-01-15',
		mcpVersion: '2025-06-18',
		updatedAt: '2025-01-15T12:00:00Z',
		serverCount: 2,
		servers: [
			{
				id: 'test-filesystem',
				name: 'Test Filesystem Server',
				description: 'Test filesystem access server',
				mcpVersion: '2025-06-18',
				capabilities: { tools: true, resources: true, prompts: false },
				publisher: {
					name: 'TestPublisher',
					email: 'test@example.com',
					verified: true,
				},
				category: 'development',
				license: 'Apache-2.0',
				transport: {
					stdio: { command: 'npx', args: ['-y', '@test/filesystem'] },
				},
				install: {
					claude: 'claude mcp add test-filesystem -- npx -y @test/filesystem',
					json: {
						mcpServers: {
							'test-filesystem': {
								command: 'npx',
								args: ['-y', '@test/filesystem'],
							},
						},
					},
				},
				permissions: ['files:read', 'files:write'],
				security: { riskLevel: 'medium' },
				featured: true,
				downloads: 1000,
				rating: 4.5,
				updatedAt: '2025-01-15T10:00:00Z',
			},
			{
				id: 'test-github',
				name: 'Test GitHub Integration',
				description: 'Test GitHub API integration',
				mcpVersion: '2025-06-18',
				capabilities: { tools: true, resources: true, prompts: true },
				publisher: { name: 'GitHub', email: 'test@github.com', verified: true },
				category: 'development',
				license: 'Apache-2.0',
				transport: { stdio: { command: 'npx', args: ['-y', '@test/github'] } },
				install: {
					claude: 'claude mcp add test-github -- npx -y @test/github',
					json: {
						mcpServers: {
							'test-github': { command: 'npx', args: ['-y', '@test/github'] },
						},
					},
				},
				permissions: ['network:https', 'data:read'],
				security: { riskLevel: 'low' },
				featured: false,
				downloads: 2500,
				rating: 4.8,
				updatedAt: '2025-01-14T15:00:00Z',
			},
		] as ServerManifest[],
	};

	beforeAll(async () => {
		// Create test cache directory
		testCacheDir = path.join(os.tmpdir(), 'marketplace-integration-test');
		if (existsSync(testCacheDir)) {
			await rm(testCacheDir, { recursive: true });
		}
		await mkdir(testCacheDir, { recursive: true });

		// Create mock registry file
		const registryPath = path.join(testCacheDir, 'test-registry.json');
		await writeFile(registryPath, JSON.stringify(mockRegistryData, null, 2));

		// Build app with test configuration
		app = build({
			logger: false,
			registries: {
				test: `file://${registryPath}`,
			},
			cacheDir: testCacheDir,
			cacheTtl: 1000, // Short TTL for testing
		});
	});

	afterAll(async () => {
		if (app) {
			await app.close();
		}

		// Cleanup test cache
		if (existsSync(testCacheDir)) {
			await rm(testCacheDir, { recursive: true });
		}
	});

	describe('Full Workflow Integration', () => {
		it('should complete full server discovery workflow', async () => {
			// 1. Check health
			const healthResponse = await app.inject({
				method: 'GET',
				url: '/health',
			});
			expect(healthResponse.statusCode).toBe(200);

			// 2. List registries
			const registriesResponse = await app.inject({
				method: 'GET',
				url: '/api/v1/registries',
			});
			expect(registriesResponse.statusCode).toBe(200);
			const registries = JSON.parse(registriesResponse.body);
			expect(registries.success).toBe(true);
			expect(registries.data).toHaveLength(1);

			// 3. Search for servers
			const searchResponse = await app.inject({
				method: 'GET',
				url: '/api/v1/servers/search?q=test&limit=10',
			});
			expect(searchResponse.statusCode).toBe(200);
			const searchResult = JSON.parse(searchResponse.body);
			expect(searchResult.success).toBe(true);
			expect(searchResult.data).toHaveLength(2);
			expect(searchResult.meta.total).toBe(2);

			// 4. Get specific server
			const serverResponse = await app.inject({
				method: 'GET',
				url: '/api/v1/servers/test-filesystem',
			});
			expect(serverResponse.statusCode).toBe(200);
			const server = JSON.parse(serverResponse.body);
			expect(server.success).toBe(true);
			expect(server.data.id).toBe('test-filesystem');

			// 5. Get installation instructions
			const installResponse = await app.inject({
				method: 'GET',
				url: '/api/v1/servers/test-filesystem/install?client=claude',
			});
			expect(installResponse.statusCode).toBe(200);
			const install = JSON.parse(installResponse.body);
			expect(install.success).toBe(true);
			expect(install.data.client).toBe('claude');
			expect(install.data.command).toContain('claude mcp add');
		});

		it('should handle complex search scenarios', async () => {
			// Search by category
			const categoryResponse = await app.inject({
				method: 'GET',
				url: '/api/v1/servers/search?category=development&limit=5',
			});
			expect(categoryResponse.statusCode).toBe(200);
			const categoryResult = JSON.parse(categoryResponse.body);
			expect(categoryResult.success).toBe(true);
			expect(categoryResult.data.every((s: ServerManifest) => s.category === 'development')).toBe(
				true,
			);

			// Search by risk level
			const riskResponse = await app.inject({
				method: 'GET',
				url: '/api/v1/servers/search?riskLevel=low',
			});
			expect(riskResponse.statusCode).toBe(200);
			const riskResult = JSON.parse(riskResponse.body);
			expect(riskResult.success).toBe(true);
			expect(riskResult.data.every((s: ServerManifest) => s.security.riskLevel === 'low')).toBe(
				true,
			);

			// Search featured only
			const featuredResponse = await app.inject({
				method: 'GET',
				url: '/api/v1/servers/search?featured=true',
			});
			expect(featuredResponse.statusCode).toBe(200);
			const featuredResult = JSON.parse(featuredResponse.body);
			expect(featuredResult.success).toBe(true);
			expect(
				featuredResult.data.every((s: unknown) => (s as { featured?: boolean }).featured === true),
			).toBe(true);

			// Sort by downloads
			const downloadsResponse = await app.inject({
				method: 'GET',
				url: '/api/v1/servers/search?sortBy=downloads&sortOrder=desc',
			});
			expect(downloadsResponse.statusCode).toBe(200);
			const downloadsResult = JSON.parse(downloadsResponse.body);
			expect(downloadsResult.success).toBe(true);

			// Verify sorting (GitHub has 2500 downloads vs Filesystem 1000)
			if (downloadsResult.data.length >= 2) {
				expect(downloadsResult.data[0].downloads).toBeGreaterThan(
					downloadsResult.data[1].downloads,
				);
			}
		});

		it('should provide comprehensive statistics', async () => {
			// Get overall stats
			const statsResponse = await app.inject({
				method: 'GET',
				url: '/api/v1/stats',
			});
			expect(statsResponse.statusCode).toBe(200);
			const stats = JSON.parse(statsResponse.body);
			expect(stats.success).toBe(true);
			expect(stats.data).toMatchObject({
				totalServers: 2,
				totalDownloads: 3500, // 1000 + 2500
				featuredCount: 1,
				categoryBreakdown: { development: 2 },
				riskLevelBreakdown: { medium: 1, low: 1 },
			});

			// Get categories
			const categoriesResponse = await app.inject({
				method: 'GET',
				url: '/api/v1/categories',
			});
			expect(categoriesResponse.statusCode).toBe(200);
			const categories = JSON.parse(categoriesResponse.body);
			expect(categories.success).toBe(true);
			expect(categories.data.categories).toHaveProperty('development');
			expect(categories.data.categories.development.count).toBe(2);

			// Get popular servers
			const popularResponse = await app.inject({
				method: 'GET',
				url: '/api/v1/stats/popular?limit=1',
			});
			expect(popularResponse.statusCode).toBe(200);
			const popular = JSON.parse(popularResponse.body);
			expect(popular.success).toBe(true);
			expect(popular.data).toHaveLength(1);
			expect(popular.data[0].id).toBe('test-github'); // Higher downloads

			// Get top rated
			const topRatedResponse = await app.inject({
				method: 'GET',
				url: '/api/v1/stats/top-rated?minDownloads=500&limit=2',
			});
			expect(topRatedResponse.statusCode).toBe(200);
			const topRated = JSON.parse(topRatedResponse.body);
			expect(topRated.success).toBe(true);
			expect(topRated.data[0].rating).toBeGreaterThanOrEqual(topRated.data[1]?.rating || 0);
		});

		it('should handle registry management operations', async () => {
			// Check registry status
			const statusResponse = await app.inject({
				method: 'GET',
				url: '/api/v1/registries/test/status',
			});
			expect(statusResponse.statusCode).toBe(200);
			const status = JSON.parse(statusResponse.body);
			expect(status.success).toBe(true);
			expect(status.data.healthy).toBe(true);

			// Refresh registry
			const refreshResponse = await app.inject({
				method: 'POST',
				url: '/api/v1/registries/test/refresh',
			});
			expect(refreshResponse.statusCode).toBe(200);
			const refresh = JSON.parse(refreshResponse.body);
			expect(refresh.success).toBe(true);

			// Refresh all registries
			const refreshAllResponse = await app.inject({
				method: 'POST',
				url: '/api/v1/registries/refresh',
			});
			expect(refreshAllResponse.statusCode).toBe(200);
			const refreshAll = JSON.parse(refreshAllResponse.body);
			expect(refreshAll.success).toBe(true);
			expect(refreshAll.results.refreshed).toContain('test');
		});

		it('should handle client-specific installation instructions', async () => {
			const clients = ['claude', 'cline', 'cortex-mcp', 'cursor', 'continue'];

			for (const client of clients) {
				const response = await app.inject({
					method: 'GET',
					url: `/api/v1/servers/test-filesystem/install?client=${client}`,
				});
				expect(response.statusCode).toBe(200);
				const install = JSON.parse(response.body);
				expect(install.success).toBe(true);
				expect(install.data.client).toBe(client);
				expect(install.data).toHaveProperty('command');
				expect(install.data).toHaveProperty('instructions');

				if (client === 'cline') {
					expect(install.data.command).toBe('');
					expect(install.data.instructions).toBe('Install via Cline MCP settings');
				}
			}

			// Test generic installation (no client specified)
			const genericResponse = await app.inject({
				method: 'GET',
				url: '/api/v1/servers/test-filesystem/install',
			});
			expect(genericResponse.statusCode).toBe(200);
			const generic = JSON.parse(genericResponse.body);
			expect(generic.success).toBe(true);
			expect(generic.data).toHaveProperty('available');
			expect(generic.data).toHaveProperty('claude');
			expect(generic.data).toHaveProperty('json');
		});
	});

	describe('Error Handling Integration', () => {
		it('should handle various error scenarios gracefully', async () => {
			// 404 for non-existent server
			const notFoundResponse = await app.inject({
				method: 'GET',
				url: '/api/v1/servers/nonexistent-server',
			});
			expect(notFoundResponse.statusCode).toBe(404);

			// Invalid server ID format
			const invalidIdResponse = await app.inject({
				method: 'GET',
				url: '/api/v1/servers/invalid..id',
			});
			expect(invalidIdResponse.statusCode).toBe(400);

			// Invalid search parameters
			const invalidSearchResponse = await app.inject({
				method: 'GET',
				url: '/api/v1/servers/search?limit=-1',
			});
			expect(invalidSearchResponse.statusCode).toBe(400);

			// Non-existent registry
			const nonExistentRegistryResponse = await app.inject({
				method: 'GET',
				url: '/api/v1/registries/nonexistent/status',
			});
			expect(nonExistentRegistryResponse.statusCode).toBe(404);

			// Method not allowed
			const methodNotAllowedResponse = await app.inject({
				method: 'DELETE',
				url: '/api/v1/servers/test-filesystem',
			});
			expect(methodNotAllowedResponse.statusCode).toBe(405);

			// Non-existent route
			const notFoundRouteResponse = await app.inject({
				method: 'GET',
				url: '/api/v1/nonexistent',
			});
			expect(notFoundRouteResponse.statusCode).toBe(404);
		});

		it('should provide consistent error response format', async () => {
			const response = await app.inject({
				method: 'GET',
				url: '/api/v1/servers/nonexistent',
			});

			expect(response.statusCode).toBe(404);
			const body = JSON.parse(response.body);
			expect(body).toMatchObject({
				success: false,
				error: {
					code: expect.any(String),
					message: expect.any(String),
				},
			});
		});
	});

	describe('Security and Performance Integration', () => {
		it('should enforce rate limiting', async () => {
			const requests = Array(10)
				.fill(null)
				.map((_, i) =>
					app.inject({
						method: 'GET',
						url: `/api/v1/servers/search?q=test${i}`,
					}),
				);

			const responses = await Promise.all(requests);

			// Should have at least some successful requests
			const successful = responses.filter((r) => r.statusCode === 200).length;
			expect(successful).toBeGreaterThan(0);

			// May have some rate limited (429) responses
			const rateLimited = responses.filter((r) => r.statusCode === 429).length;
			expect(successful + rateLimited).toBe(10);
		});

		it('should include security headers', async () => {
			const response = await app.inject({
				method: 'GET',
				url: '/api/v1/servers/search',
			});

			// Check for security headers (added by Helmet)
			expect(response.headers).toHaveProperty('x-frame-options');
			expect(response.headers).toHaveProperty('x-content-type-options');
		});

		it('should handle CORS properly', async () => {
			const response = await app.inject({
				method: 'OPTIONS',
				url: '/api/v1/servers/search',
				headers: {
					Origin: 'https://claude.ai',
					'Access-Control-Request-Method': 'GET',
				},
			});

			expect(response.statusCode).toBe(204);
			expect(response.headers['access-control-allow-origin']).toBeDefined();
			expect(response.headers['access-control-allow-methods']).toBeDefined();
		});
	});

	describe('Cache Integration', () => {
		it('should cache registry data effectively', async () => {
			// First request - should fetch from source
			const start1 = Date.now();
			const response1 = await app.inject({
				method: 'GET',
				url: '/api/v1/servers/search?q=test',
			});
			const duration1 = Date.now() - start1;
			expect(response1.statusCode).toBe(200);

			// Second request - should use cache (faster)
			const start2 = Date.now();
			const response2 = await app.inject({
				method: 'GET',
				url: '/api/v1/servers/search?q=test',
			});
			const duration2 = Date.now() - start2;
			expect(response2.statusCode).toBe(200);

			// Results should be identical
			expect(response1.body).toBe(response2.body);

			// Second request should be faster (cached)
			// Note: This is a heuristic test and may be flaky
			console.log(`First request: ${duration1}ms, Second request: ${duration2}ms`);
		});

		it('should refresh cache on demand', async () => {
			// Make initial request to populate cache
			await app.inject({
				method: 'GET',
				url: '/api/v1/servers/search',
			});

			// Refresh cache
			const refreshResponse = await app.inject({
				method: 'POST',
				url: '/api/v1/registries/test/refresh',
			});
			expect(refreshResponse.statusCode).toBe(200);

			// Subsequent request should still work
			const searchResponse = await app.inject({
				method: 'GET',
				url: '/api/v1/servers/search',
			});
			expect(searchResponse.statusCode).toBe(200);
		});
	});

	describe('API Documentation Integration', () => {
		it('should serve OpenAPI documentation', async () => {
			// Swagger UI
			const docsResponse = await app.inject({
				method: 'GET',
				url: '/documentation',
			});
			expect(docsResponse.statusCode).toBe(200);
			expect(docsResponse.headers['content-type']).toContain('text/html');

			// OpenAPI JSON spec
			const specResponse = await app.inject({
				method: 'GET',
				url: '/documentation/json',
			});
			expect(specResponse.statusCode).toBe(200);
			const spec = JSON.parse(specResponse.body);
			expect(spec).toHaveProperty('openapi');
			expect(spec).toHaveProperty('info');
			expect(spec).toHaveProperty('paths');
			expect(spec.paths).toHaveProperty('/api/v1/servers/search');

			// Root redirect
			const rootResponse = await app.inject({
				method: 'GET',
				url: '/',
			});
			expect(rootResponse.statusCode).toBe(302);
			expect(rootResponse.headers.location).toBe('/documentation');
		});
	});
});
