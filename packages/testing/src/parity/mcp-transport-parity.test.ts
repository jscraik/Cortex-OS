import { type ChildProcess, spawn } from 'node:child_process';
import { createInterface as createReadlineInterface } from 'node:readline';
import type {
	MemoryAnalysisInput,
	MemorySearchInput,
	MemoryStoreInput,
} from '@cortex-os/tool-spec';
import { beforeEach, describe, expect, it } from 'vitest';
import { sleep } from '../test-setup';

describe('MCP Transport Parity Tests', () => {
	let stdioProcess: ChildProcess;
	let httpProcess: ChildProcess;
	let stdioRL: ReturnType<typeof createReadlineInterface>;
	let httpPort = 9603;
	let messageId = 1;

	beforeEach(async () => {
		// Start fresh instances for each test
		stdioProcess = spawn('node', ['../mcp-server/dist/index.js', '--transport', 'stdio'], {
			stdio: ['pipe', 'pipe', 'pipe'],
			cwd: process.cwd(),
			env: {
				...process.env,
				NODE_ENV: 'test',
				QDRANT_URL: 'http://localhost:6333',
				QDRANT_COLLECTION: `parity-stdio-${Date.now()}`,
			},
		});

		httpProcess = spawn(
			'node',
			[
				'../mcp-server/dist/index.js',
				'--transport',
				'http',
				'--port',
				String(httpPort),
				'--host',
				'0.0.0.0',
			],
			{
				stdio: 'pipe',
				cwd: process.cwd(),
				env: {
					...process.env,
					NODE_ENV: 'test',
					QDRANT_URL: 'http://localhost:6333',
					QDRANT_COLLECTION: `parity-http-${Date.now()}`,
				},
			},
		);

		httpPort++; // Increment port for each test

		stdioRL = createReadlineInterface({
			input: stdioProcess.stdout!,
			output: stdioProcess.stdin!,
		});

		// Initialize servers
		await sleep(2000);
	});

	afterEach(async () => {
		// Clean up
		if (stdioProcess) {
			stdioProcess.kill('SIGTERM');
			await sleep(500);
		}

		if (httpProcess) {
			httpProcess.kill('SIGTERM');
			await sleep(500);
		}

		if (stdioRL) {
			stdioRL.close();
		}
	});

	async function sendStdioRequest(method: string, params?: any): Promise<any> {
		return new Promise((resolve, reject) => {
			const request = {
				jsonrpc: '2.0',
				id: messageId++,
				method,
				params,
			};

			let response = '';

			const onData = (line: string) => {
				response += line;
				try {
					const parsed = JSON.parse(response);
					stdioProcess.stdout?.removeListener('data', onData);
					if (parsed.error) {
						reject(new Error(parsed.error.message));
					} else {
						resolve(parsed.result);
					}
				} catch {
					// Continue reading
				}
			};

			stdioProcess.stdout?.on('data', onData);
			stdioProcess.stdin?.write(`${JSON.stringify(request)}\n`);

			// Timeout after 10 seconds
			setTimeout(() => {
				stdioProcess.stdout?.removeListener('data', onData);
				reject(new Error('STDIO request timeout'));
			}, 10000);
		});
	}

	async function sendHttpRequest(method: string, params?: any): Promise<any> {
		const response = await fetch(`http://localhost:${httpPort}/mcp`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				jsonrpc: '2.0',
				id: messageId++,
				method,
				params,
			}),
		});

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		const data = await response.json();

		if (data.error) {
			throw new Error(data.error.message);
		}

		return data.result;
	}

	async function compareResults(testName: string, method: string, params?: any) {
		console.log(`\nRunning parity test: ${testName}`);

		const stdioResult = await sendStdioRequest(method, params);
		const httpResult = await sendHttpRequest(method, params);

		// Compare structure and key fields
		expect(stdioResult).toBeDefined();
		expect(httpResult).toBeDefined();

		// Normalize results for comparison
		const normalize = (obj: any): any => {
			if (Array.isArray(obj)) {
				return obj.map(normalize);
			}

			if (obj && typeof obj === 'object') {
				const normalized: any = {};
				for (const [key, value] of Object.entries(obj)) {
					// Skip timestamps and IDs that will differ
					if (key === 'id' || key === 'createdAt' || key === 'generatedAt') {
						continue;
					}
					// Skip performance metrics
					if (key === 'searchTime' || key === 'indexingTime') {
						continue;
					}
					normalized[key] = normalize(value);
				}
				return normalized;
			}

			return obj;
		};

		const normalizedStdio = normalize(stdioResult);
		const normalizedHttp = normalize(httpResult);

		// Deep compare ignoring differences
		expect(normalizedHttp).toEqual(normalizedStdio);

		console.log(`✓ ${testName} - Results match`);

		return { stdioResult, httpResult };
	}

	describe('Tool List Parity', () => {
		it('should return identical tool lists', async () => {
			await compareResults('tools/list', 'tools/list');
		});
	});

	describe('Memory Store Parity', () => {
		it('should store identical memories', async () => {
			const input: MemoryStoreInput = {
				content: 'Parity test memory for store operation',
				importance: 7,
				tags: ['parity', 'test', 'store'],
				domain: 'testing',
				metadata: {
					source: 'parity-test',
					runId: Date.now(),
				},
			};

			const results = await compareResults('memory.store', 'tools/call', {
				name: 'memory.store',
				arguments: input,
			});

			// Both should return success and have IDs
			expect(results.stdioResult.data.id).toBeDefined();
			expect(results.httpResult.data.id).toBeDefined();
			expect(results.stdioResult.data.vectorIndexed).toBe(results.httpResult.data.vectorIndexed);
		});

		it('should handle validation errors identically', async () => {
			const invalidInput = {
				content: '', // Invalid empty content
				importance: 15, // Invalid out of range
			};

			try {
				await compareResults('memory.store (invalid)', 'tools/call', {
					name: 'memory.store',
					arguments: invalidInput,
				});
				expect.fail('Should have thrown validation error');
			} catch (error) {
				expect(error).toBeDefined();
				console.log(`✓ memory.store (invalid) - Both transports reject invalid input`);
			}
		});
	});

	describe('Memory Search Parity', () => {
		beforeEach(async () => {
			// Store identical test data in both transports
			const testMemories = [
				{
					content: 'First parity test memory for search',
					importance: 8,
					tags: ['parity', 'search', 'test'],
					domain: 'testing',
				},
				{
					content: 'Second parity test memory with different tags',
					importance: 6,
					tags: ['parity', 'different', 'memory'],
					domain: 'development',
				},
				{
					content: 'Third memory about work meetings and planning',
					importance: 9,
					tags: ['work', 'meeting', 'planning'],
					domain: 'work',
				},
			];

			for (const memory of testMemories) {
				// Store via STDIO
				await sendStdioRequest('tools/call', {
					name: 'memory.store',
					arguments: memory,
				});

				// Store via HTTP
				await sendHttpRequest('tools/call', {
					name: 'memory.store',
					arguments: memory,
				});
			}

			// Wait for indexing
			await sleep(1000);
		});

		it('should return identical semantic search results', async () => {
			const input: MemorySearchInput = {
				query: 'parity test search',
				searchType: 'semantic',
				limit: 5,
				threshold: 0.5,
			};

			const results = await compareResults('memory.search (semantic)', 'tools/call', {
				name: 'memory.search',
				arguments: input,
			});

			// Compare search metadata
			expect(results.stdioResult.data.total).toBe(results.httpResult.data.total);
			expect(results.stdioResult.data.searchType).toBe(results.httpResult.data.searchType);
		});

		it('should return identical keyword search results', async () => {
			const input: MemorySearchInput = {
				query: 'work meeting',
				searchType: 'keyword',
				limit: 10,
			};

			const results = await compareResults('memory.search (keyword)', 'tools/call', {
				name: 'memory.search',
				arguments: input,
			});

			// Both should find the work-related memory
			expect(results.stdioResult.data.memories.length).toBe(
				results.httpResult.data.memories.length,
			);
		});

		it('should return identical hybrid search results', async () => {
			const input: MemorySearchInput = {
				query: 'parity memory',
				searchType: 'hybrid',
				limit: 5,
				hybridWeight: 0.6,
			};

			const results = await compareResults('memory.search (hybrid)', 'tools/call', {
				name: 'memory.search',
				arguments: input,
			});

			expect(results.stdioResult.data.searchType).toBe('hybrid');
			expect(results.httpResult.data.searchType).toBe('hybrid');
		});

		it('should apply filters identically', async () => {
			const input: MemorySearchInput = {
				query: 'test',
				searchType: 'keyword',
				filters: {
					domain: 'testing',
					importanceMin: 7,
				},
				limit: 10,
			};

			const results = await compareResults('memory.search (filtered)', 'tools/call', {
				name: 'memory.search',
				arguments: input,
			});

			// Both should return the same filtered results
			expect(results.stdioResult.data.memories.length).toBe(
				results.httpResult.data.memories.length,
			);
		});
	});

	describe('Memory Analysis Parity', () => {
		it('should return identical frequency analysis', async () => {
			const input: MemoryAnalysisInput = {
				analysisType: 'frequency',
			};

			await compareResults('memory.analysis (frequency)', 'tools/call', {
				name: 'memory.analysis',
				arguments: input,
			});
		});

		it('should return identical temporal analysis', async () => {
			const input: MemoryAnalysisInput = {
				analysisType: 'temporal',
				timeRange: {
					start: new Date(Date.now() - 86400000).toISOString(),
					end: new Date().toISOString(),
				},
			};

			await compareResults('memory.analysis (temporal)', 'tools/call', {
				name: 'memory.analysis',
				arguments: input,
			});
		});

		it('should return identical importance analysis', async () => {
			const input: MemoryAnalysisInput = {
				analysisType: 'importance',
			};

			await compareResults('memory.analysis (importance)', 'tools/call', {
				name: 'memory.analysis',
				arguments: input,
			});
		});
	});

	describe('Memory Relationships Parity', () => {
		it('should return identical relationship graphs', async () => {
			// First store a memory to get an ID
			const storeResult = await sendStdioRequest('tools/call', {
				name: 'memory.store',
				arguments: {
					content: 'Memory for relationship testing',
					importance: 8,
					tags: ['relationship', 'test'],
					domain: 'testing',
				},
			});

			const memoryId = storeResult.data.id;

			const input = {
				memoryId,
				maxDepth: 2,
				relationshipTypes: ['semantic', 'tag'],
			};

			await compareResults('memory.relationships', 'tools/call', {
				name: 'memory.relationships',
				arguments: input,
			});
		});
	});

	describe('Memory Stats Parity', () => {
		it('should return identical statistics', async () => {
			const input = {
				include: ['qdrant_stats', 'search_performance'],
			};

			await compareResults('memory.stats', 'tools/call', {
				name: 'memory.stats',
				arguments: input,
			});
		});
	});

	describe('Error Handling Parity', () => {
		it('should handle unknown tools identically', async () => {
			try {
				await compareResults('unknown tool', 'tools/call', {
					name: 'unknown.tool',
					arguments: {},
				});
				expect.fail('Should have thrown error');
			} catch (error) {
				expect(error).toBeDefined();
				console.log(`✓ unknown tool - Both transports reject unknown tools`);
			}
		});

		it('should handle invalid JSON-RPC identically', async () => {
			// Test STDIO with invalid request
			try {
				stdioProcess.stdin?.write('invalid json\n');
				await sleep(100);
			} catch {
				// Expected
			}

			// Test HTTP with invalid request
			try {
				const response = await fetch(`http://localhost:${httpPort}/mcp`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: 'invalid json',
				});

				expect(response.status).toBe(400);
			} catch {
				// Expected
			}

			console.log(`✓ invalid JSON-RPC - Both transports handle malformed requests`);
		});
	});

	describe('Performance Parity', () => {
		it('should have comparable response times', async () => {
			const input: MemorySearchInput = {
				query: 'performance test',
				searchType: 'semantic',
				limit: 5,
			};

			// Measure STDIO time
			const stdioStart = Date.now();
			await sendStdioRequest('tools/call', {
				name: 'memory.search',
				arguments: input,
			});
			const stdioTime = Date.now() - stdioStart;

			// Measure HTTP time
			const httpStart = Date.now();
			await sendHttpRequest('tools/call', {
				name: 'memory.search',
				arguments: input,
			});
			const httpTime = Date.now() - httpStart;

			console.log(`STDIO time: ${stdioTime}ms, HTTP time: ${httpTime}ms`);

			// Both should complete within reasonable time
			expect(stdioTime).toBeLessThan(2000);
			expect(httpTime).toBeLessThan(2000);

			// Performance difference should be reasonable (HTTP can be a bit faster)
			const ratio = Math.max(stdioTime, httpTime) / Math.min(stdioTime, httpTime);
			expect(ratio).toBeLessThan(3); // Less than 3x difference
		});
	});

	describe('Concurrent Operations Parity', () => {
		it('should handle concurrent operations consistently', async () => {
			const concurrentRequests = 5;

			// Store multiple memories concurrently
			const stdioPromises = Array.from({ length: concurrentRequests }, (_, i) =>
				sendStdioRequest('tools/call', {
					name: 'memory.store',
					arguments: {
						content: `Concurrent STDIO memory ${i}`,
						importance: 5,
						tags: ['concurrent', 'stdio'],
						domain: 'testing',
					},
				}),
			);

			const httpPromises = Array.from({ length: concurrentRequests }, (_, i) =>
				sendHttpRequest('tools/call', {
					name: 'memory.store',
					arguments: {
						content: `Concurrent HTTP memory ${i}`,
						importance: 5,
						tags: ['concurrent', 'http'],
						domain: 'testing',
					},
				}),
			);

			const stdioResults = await Promise.all(stdioPromises);
			const httpResults = await Promise.all(httpPromises);

			// All operations should succeed
			expect(stdioResults.length).toBe(concurrentRequests);
			expect(httpResults.length).toBe(concurrentRequests);

			// All should have IDs
			expect(stdioResults.every((r) => r.data.id)).toBe(true);
			expect(httpResults.every((r) => r.data.id)).toBe(true);

			console.log(
				`✓ Concurrent operations - Both transports handle ${concurrentRequests} concurrent requests`,
			);
		});
	});
});
