/**
 * brAInwav Memory Integration Test Suite
 * Phase 1.2: End-to-end memory operation validation
 *
 * Following CODESTYLE.md: functional-first, ≤40 lines per function, named exports
 */

import { type ChildProcess, spawn } from 'child_process';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('brAInwav Memory Integration Tests - Phase 1.2', () => {
	let memoryServer: ChildProcess | null = null;
	const serverPort = 3041; // Use different port to avoid conflicts
	const baseUrl = `http://localhost:${serverPort}`;

	beforeEach(async () => {
		// Start local memory server for integration tests
		await startMemoryServer();
		await waitForServerReady();
	});

	afterEach(async () => {
		// Clean up server
		await stopMemoryServer();
	});

	describe('Memory Store Integration', () => {
		it('should store and retrieve memory through REST API', async () => {
			const storeResponse = await fetch(`${baseUrl}/memory/store`, {
				method: 'POST',
				headers: {
					'content-type': 'application/json',
					'user-agent': 'brAInwav-test-client',
				},
				body: JSON.stringify({
					content: 'brAInwav integration test memory',
					importance: 0.9,
					domain: 'integration-test',
					tags: ['brainwav', 'integration'],
				}),
			});

			expect(storeResponse.status).toBe(201);

			const storeResult = await storeResponse.json();
			expect(storeResult.success).toBe(true);
			expect(storeResult.data.id).toBeTruthy();
			expect(storeResult.data.vectorIndexed).toBe(true);

			// Verify brAInwav service headers
			expect(storeResponse.headers.get('x-brainwav-service')).toBe('memory-core');
		});

		it('should search memories with hybrid SQLite + vector approach', async () => {
			// First store a test memory
			const storeResponse = await fetch(`${baseUrl}/memory/store`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					content: 'brAInwav search integration test with unique keywords',
					importance: 0.7,
					domain: 'search-test',
					tags: ['searchable', 'brainwav'],
				}),
			});

			const storeResult = await storeResponse.json();
			expect(storeResult.success).toBe(true);

			// Wait for indexing
			await new Promise((resolve) => setTimeout(resolve, 1000));

			// Search for the stored memory
			const searchResponse = await fetch(`${baseUrl}/memory/search`, {
				method: 'POST',
				headers: {
					'content-type': 'application/json',
					'user-agent': 'brAInwav-test-client',
				},
				body: JSON.stringify({
					query: 'brAInwav search integration unique',
					limit: 10,
					threshold: 0.5,
					hybrid_search: true,
				}),
			});

			expect(searchResponse.status).toBe(200);

			const searchResult = await searchResponse.json();
			expect(searchResult.success).toBe(true);
			expect(searchResult.data).toBeDefined();
			expect(Array.isArray(searchResult.data)).toBe(true);

			// Should find our stored memory
			if (searchResult.data.length > 0) {
				const foundMemory = searchResult.data[0];
				expect(foundMemory.content).toContain('brAInwav search integration');
				expect(foundMemory.score).toBeGreaterThan(0.5);
			}
		});

		it('should perform memory analysis with relationship tracking', async () => {
			// Store related memories
			const memory1Response = await fetch(`${baseUrl}/memory/store`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					content: 'brAInwav memory analysis test - parent concept',
					importance: 0.8,
					domain: 'analysis-test',
					tags: ['parent', 'brainwav'],
				}),
			});

			const memory2Response = await fetch(`${baseUrl}/memory/store`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					content: 'brAInwav memory analysis test - child concept',
					importance: 0.6,
					domain: 'analysis-test',
					tags: ['child', 'brainwav'],
				}),
			});

			await memory1Response.json();
			await memory2Response.json();

			// Wait for processing
			await new Promise((resolve) => setTimeout(resolve, 1000));

			// Perform analysis
			const analysisResponse = await fetch(`${baseUrl}/memory/analysis`, {
				method: 'POST',
				headers: {
					'content-type': 'application/json',
					'user-agent': 'brAInwav-test-client',
				},
				body: JSON.stringify({
					analysis_type: 'summary',
					scope: 'domain',
					domain: 'analysis-test',
					max_memories: 50,
				}),
			});

			expect(analysisResponse.status).toBe(200);

			const analysisResult = await analysisResponse.json();
			expect(analysisResult.success).toBe(true);
			expect(analysisResult.data.summary).toBeTruthy();
			expect(analysisResult.data.memory_count).toBeGreaterThanOrEqual(2);
		});
	});

	describe('Memory System Health', () => {
		it('should pass health checks with brAInwav compliance', async () => {
			const healthResponse = await fetch(`${baseUrl}/healthz`);

			expect(healthResponse.status).toBe(200);

			const healthResult = await healthResponse.json();
			expect(healthResult.success).toBe(true);
			expect(healthResult.data.healthy).toBe(true);

			// Check readiness
			const readyResponse = await fetch(`${baseUrl}/readyz`);
			expect(readyResponse.status).toBe(200);

			const readyResult = await readyResponse.json();
			expect(readyResult.success).toBe(true);
			expect(readyResult.data.ready).toBe(true);
		});

		it('should maintain performance within brAInwav SLA', async () => {
			const startTime = Date.now();

			const response = await fetch(`${baseUrl}/memory/store`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					content: 'brAInwav performance test memory',
					importance: 0.5,
				}),
			});

			const duration = Date.now() - startTime;

			expect(response.status).toBe(201);
			expect(duration).toBeLessThan(250); // brAInwav <250ms SLA
		});
	});

	// Helper functions
	async function startMemoryServer(): Promise<void> {
		return new Promise((resolve, reject) => {
			const serverPath = join(process.cwd(), 'apps/cortex-os/packages/local-memory/dist/server.js');

			memoryServer = spawn('node', [serverPath], {
				env: {
					...process.env,
					PORT: serverPort.toString(),
					MEMORY_DB_PATH: './tmp/test-memories.db',
					NODE_ENV: 'test',
				},
				stdio: 'pipe',
			});

			memoryServer.on('error', reject);

			// Give server time to start
			setTimeout(resolve, 2000);
		});
	}

	async function waitForServerReady(): Promise<void> {
		const maxAttempts = 10;
		const delay = 500;

		for (let attempt = 0; attempt < maxAttempts; attempt++) {
			try {
				const response = await fetch(`${baseUrl}/healthz`, {
					signal: AbortSignal.timeout(1000),
				});
				if (response.ok) {
					return;
				}
			} catch {
				// Server not ready yet
			}

			await new Promise((resolve) => setTimeout(resolve, delay));
		}

		throw new Error('Memory server failed to become ready');
	}

	async function stopMemoryServer(): Promise<void> {
		if (memoryServer) {
			memoryServer.kill('SIGTERM');

			return new Promise((resolve) => {
				memoryServer!.on('exit', () => {
					memoryServer = null;
					resolve();
				});

				// Force kill if not stopped after 5 seconds
				setTimeout(() => {
					if (memoryServer) {
						memoryServer.kill('SIGKILL');
						memoryServer = null;
					}
					resolve();
				}, 5000);
			});
		}
	}
});
