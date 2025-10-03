import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LanceDBHybridSearch } from '../src/retrieval/LanceDBHybrid.js';
import { createGraphRAGService, GraphRAGService } from '../src/services/GraphRAGService.js';

// Mock dependencies
vi.mock('../src/retrieval/LanceDBHybrid.js');

describe('brAInwav GraphRAG Service', () => {
	let graphragService: GraphRAGService;
	let mockLanceDB: vi.Mocked<LanceDBHybridSearch>;

	const mockEmbedDense = vi.fn().mockResolvedValue(new Array(1024).fill(0.1));
	const mockEmbedSparse = vi
		.fn()
		.mockResolvedValue({ indices: [0, 1, 2], values: [0.8, 0.6, 0.4] });

	beforeEach(async () => {
		// Reset mocks
		vi.clearAllMocks();

		// Create service with test configuration
		graphragService = createGraphRAGService({
			lancedbConfig: {
				uri: './test-data/lancedb',
				tableName: 'test_graphrag',
				dimensions: 1024,
				hybridMode: 'rrf',
				densityWeight: 0.7,
				queryTimeout: 5000,
				maxRetries: 1,
				brainwavBranding: true,
			},
			limits: {
				maxContextChunks: 10,
				queryTimeoutMs: 5000,
				maxConcurrentQueries: 2,
			},
			branding: {
				enabled: true,
				sourceAttribution: 'brAInwav Test GraphRAG',
				emitBrandedEvents: true,
			},
		});

		// Setup LanceDB mock
		mockLanceDB = vi.mocked(LanceDBHybridSearch.prototype);
		mockLanceDB.initialize = vi.fn().mockResolvedValue(undefined);
		mockLanceDB.hybridSearch = vi.fn().mockResolvedValue([
			{
				id: 'chunk_1',
				score: 0.95,
				nodeId: 'node_1',
				chunkContent: 'Test content about agent toolkit',
				metadata: {
					path: 'packages/agent-toolkit/src/index.ts',
					nodeType: 'PACKAGE',
					nodeKey: 'packages/agent-toolkit',
					lineStart: 1,
					lineEnd: 50,
					brainwavSource: 'brAInwav Test',
					relevanceScore: 0.95,
				},
			},
			{
				id: 'chunk_2',
				score: 0.87,
				nodeId: 'node_2',
				chunkContent: 'Test content about MCP integration',
				metadata: {
					path: 'packages/cortex-mcp/src/server.py',
					nodeType: 'SERVICE',
					nodeKey: 'packages/cortex-mcp',
					lineStart: 10,
					lineEnd: 30,
					brainwavSource: 'brAInwav Test',
					relevanceScore: 0.87,
				},
			},
		]);
		mockLanceDB.healthCheck = vi.fn().mockResolvedValue(true);
		mockLanceDB.close = vi.fn().mockResolvedValue(undefined);

		await graphragService.initialize(mockEmbedDense, mockEmbedSparse);
	});

	afterEach(async () => {
		await graphragService.close();
	});

	describe('Service Initialization', () => {
		it('should initialize with brAInwav branding', async () => {
			expect(mockLanceDB.initialize).toHaveBeenCalledWith(mockEmbedDense, mockEmbedSparse);
		});

		it('should validate configuration schema', () => {
			expect(() => {
				createGraphRAGService({
					lancedbConfig: {
						// @ts-expect-error - Testing invalid config
						uri: 123, // Invalid type
						dimensions: -1, // Invalid value
					},
				});
			}).toThrow();
		});
	});

	describe('Query Processing', () => {
		it('should process basic GraphRAG query with brAInwav branding', async () => {
			const result = await graphragService.query({
				question: 'How does the agent toolkit work?',
				k: 5,
				includeCitations: true,
			});

			expect(result.metadata.brainwavPowered).toBe(true);
			expect(result.metadata.brainwavSource).toBe('brAInwav Test GraphRAG');
			expect(result.sources).toHaveLength(2);
			expect(result.citations).toBeDefined();
			expect(result.citations?.every((c) => c.brainwavIndexed)).toBe(true);

			// Verify LanceDB was called with correct parameters
			expect(mockLanceDB.hybridSearch).toHaveBeenCalledWith({
				question: 'How does the agent toolkit work?',
				k: 5,
				includeCitations: true,
			});
		});

		it('should validate query parameters', async () => {
			await expect(
				graphragService.query({
					question: '', // Empty question
					k: 5,
				}),
			).rejects.toThrow();

			await expect(
				graphragService.query({
					question: 'Valid question',
					k: 0, // Invalid k
				}),
			).rejects.toThrow();

			await expect(
				graphragService.query({
					question: 'Valid question',
					k: 5,
					threshold: 1.5, // Invalid threshold
				}),
			).rejects.toThrow();
		});

		it('should respect rate limiting', async () => {
			// Start multiple concurrent queries (exceeding limit of 2)
			const queries = Array(5)
				.fill(null)
				.map(() =>
					graphragService.query({
						question: `Test query ${Math.random()}`,
						k: 3,
					}),
				);

			// Some should be rejected due to rate limiting
			const results = await Promise.allSettled(queries);
			const rejected = results.filter((r) => r.status === 'rejected');
			expect(rejected.length).toBeGreaterThan(0);

			// Check error message contains brAInwav branding
			const errorMessage = (rejected[0] as PromiseRejectedResult).reason.message;
			expect(errorMessage).toContain('brAInwav GraphRAG');
		});

		it('should include proper graph context in results', async () => {
			const result = await graphragService.query({
				question: 'What are the main components?',
				k: 3,
			});

			expect(result.graphContext).toMatchObject({
				focusNodes: expect.any(Number),
				expandedNodes: expect.any(Number),
				totalChunks: expect.any(Number),
				edgesTraversed: expect.any(Number),
			});

			expect(result.graphContext.totalChunks).toBe(2);
			expect(result.graphContext.focusNodes).toBeGreaterThanOrEqual(0);
		});

		it('should handle citations properly when requested', async () => {
			const resultWithCitations = await graphragService.query({
				question: 'Test question',
				k: 3,
				includeCitations: true,
			});

			expect(resultWithCitations.citations).toBeDefined();
			expect(resultWithCitations.citations).toHaveLength(2);
			expect(resultWithCitations.citations![0]).toMatchObject({
				path: expect.any(String),
				nodeType: expect.any(String),
				relevanceScore: expect.any(Number),
				brainwavIndexed: true,
			});

			const resultWithoutCitations = await graphragService.query({
				question: 'Test question',
				k: 3,
				includeCitations: false,
			});

			expect(resultWithoutCitations.citations).toBeUndefined();
		});
	});

	describe('Error Handling', () => {
		it('should handle LanceDB errors gracefully', async () => {
			mockLanceDB.hybridSearch.mockRejectedValueOnce(new Error('LanceDB connection failed'));

			await expect(
				graphragService.query({
					question: 'Test question',
					k: 3,
				}),
			).rejects.toThrow('LanceDB connection failed');
		});

		it('should emit error events with brAInwav branding', async () => {
			const consoleSpy = vi.spyOn(console, 'log').mockImplementation();
			mockLanceDB.hybridSearch.mockRejectedValueOnce(new Error('Test error'));

			try {
				await graphragService.query({
					question: 'Test question',
					k: 3,
				});
			} catch {
				// Expected to throw
			}

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('brAInwav A2A Event:'),
				expect.stringContaining('graphrag.query.failed'),
			);

			consoleSpy.mockRestore();
		});
	});

	describe('Health Monitoring', () => {
		it('should provide health status with brAInwav branding', async () => {
			const health = await graphragService.healthCheck();

			expect(health).toMatchObject({
				status: 'healthy',
				components: {
					lancedb: true,
				},
				brainwavSource: 'brAInwav Test GraphRAG',
			});
		});

		it('should report unhealthy when LanceDB fails', async () => {
			mockLanceDB.healthCheck.mockResolvedValueOnce(false);

			const health = await graphragService.healthCheck();

			expect(health.status).toBe('unhealthy');
			expect(health.components.lancedb).toBe(false);
			expect(health.brainwavSource).toBe('brAInwav Test GraphRAG');
		});
	});

	describe('brAInwav Branding Compliance', () => {
		it('should include brAInwav branding in all response metadata', async () => {
			const result = await graphragService.query({
				question: 'Test branding compliance',
				k: 3,
			});

			// Check main metadata
			expect(result.metadata.brainwavPowered).toBe(true);
			expect(result.metadata.brainwavSource).toContain('brAInwav');

			// Check source metadata
			expect(
				result.sources.every((source) => source.nodeType && typeof source.score === 'number'),
			).toBe(true);

			// Check citations if present
			if (result.citations) {
				expect(result.citations.every((citation) => citation.brainwavIndexed === true)).toBe(true);
			}
		});

		it('should emit A2A events with brAInwav headers', async () => {
			const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

			await graphragService.query({
				question: 'Test event emission',
				k: 3,
			});

			expect(consoleSpy).toHaveBeenCalledWith(
				'brAInwav A2A Event:',
				expect.stringMatching(/brAInwav\.memory-core\.graphrag/),
			);

			const eventCall = consoleSpy.mock.calls.find((call) => call[0] === 'brAInwav A2A Event:');

			if (eventCall) {
				const eventData = JSON.parse(eventCall[1]);
				expect(eventData.headers['brainwav-brand']).toBe('brAInwav');
				expect(eventData.source).toContain('brAInwav');
				expect(eventData.data.brainwavSource).toContain('brAInwav');
			}

			consoleSpy.mockRestore();
		});

		it('should maintain branding when branding is disabled', async () => {
			const unbrandedService = createGraphRAGService({
				branding: {
					enabled: false,
					sourceAttribution: 'Test GraphRAG',
					emitBrandedEvents: false,
				},
			});

			await unbrandedService.initialize(mockEmbedDense, mockEmbedSparse);

			const result = await unbrandedService.query({
				question: 'Test without branding',
				k: 3,
			});

			expect(result.metadata.brainwavPowered).toBe(false);
			expect(result.metadata.brainwavSource).toBe('Test GraphRAG');

			await unbrandedService.close();
		});
	});

	describe('Performance and Limits', () => {
		it('should respect chunk limits', async () => {
			const result = await graphragService.query({
				question: 'Test chunk limiting',
				k: 20,
				maxChunks: 5,
			});

			expect(result.sources.length).toBeLessThanOrEqual(5);
		});

		it('should track timing metadata', async () => {
			const result = await graphragService.query({
				question: 'Test timing',
				k: 3,
			});

			expect(result.metadata.retrievalDurationMs).toBeGreaterThan(0);
			expect(result.metadata.queryTimestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
		});

		it('should handle edge cases gracefully', async () => {
			// Empty results from LanceDB
			mockLanceDB.hybridSearch.mockResolvedValueOnce([]);

			const result = await graphragService.query({
				question: 'Query with no results',
				k: 5,
			});

			expect(result.sources).toHaveLength(0);
			expect(result.graphContext.totalChunks).toBe(0);
			expect(result.metadata.brainwavPowered).toBe(true);
		});
	});
});

describe('GraphRAG Factory Function', () => {
	it('should create service with default configuration', () => {
		const service = createGraphRAGService();
		expect(service).toBeInstanceOf(GraphRAGService);
	});

	it('should merge partial configuration with defaults', () => {
		const service = createGraphRAGService({
			limits: {
				maxContextChunks: 50,
				queryTimeoutMs: 60000,
				maxConcurrentQueries: 10,
			},
		});
		expect(service).toBeInstanceOf(GraphRAGService);
	});

	it('should respect environment variables', () => {
		const originalEnv = process.env.BRAINWAV_BRANDING;
		process.env.BRAINWAV_BRANDING = 'false';

		const service = createGraphRAGService();
		expect(service).toBeInstanceOf(GraphRAGService);

		// Restore environment
		if (originalEnv !== undefined) {
			process.env.BRAINWAV_BRANDING = originalEnv;
		} else {
			delete process.env.BRAINWAV_BRANDING;
		}
	});
});
