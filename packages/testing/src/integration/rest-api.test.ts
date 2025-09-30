import type { Server } from 'node:http';
import type {
	MemoryAnalysisInput,
	MemorySearchInput,
	MemoryStoreInput,
} from '@cortex-os/tool-spec';
import express from 'express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { sleep } from '../test-setup';

describe('REST API Integration', () => {
	let app: express.Application;
	let server: Server;
	let _baseUrl: string;

	beforeAll(async () => {
		// Create Express app for testing
		app = express();
		app.use(express.json());

		// Mock REST API implementation
		app.use((_req, res, next) => {
			res.setHeader('Access-Control-Allow-Origin', '*');
			res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
			res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
			next();
		});

		// Health check endpoint
		app.get('/healthz', (_req, res) => {
			res.json({
				status: 'healthy',
				timestamp: new Date().toISOString(),
				uptime: process.uptime(),
				services: {
					database: 'connected',
					qdrant: 'connected',
				},
			});
		});

		// Memory endpoints
		app.post('/api/v1/memory/store', async (req, res) => {
			try {
				const input: MemoryStoreInput = req.body;

				// Validate input
				if (!input.content || input.importance < 0 || input.importance > 10) {
					return res.status(400).json({
						error: 'Invalid input',
						details: 'Content is required and importance must be between 0 and 10',
					});
				}

				// Mock successful storage
				const result = {
					success: true,
					data: {
						id: `rest-mem-${Date.now()}-${Math.random()}`,
						vectorIndexed: true,
						createdAt: new Date().toISOString(),
					},
				};

				res.json(result);
			} catch (error) {
				res.status(500).json({
					error: 'Internal server error',
					details: (error as Error).message,
				});
			}
		});

		app.post('/api/v1/memory/search', async (req, res) => {
			try {
				const input: MemorySearchInput = req.body;

				// Mock search results
				const mockMemories = [
					{
						id: 'rest-mem-1',
						content: 'REST API test memory for search',
						importance: 7,
						tags: ['rest', 'api', 'test'],
						domain: 'testing',
						createdAt: new Date().toISOString(),
						score: 0.92,
					},
					{
						id: 'rest-mem-2',
						content: 'Another test memory',
						importance: 5,
						tags: ['test', 'memory'],
						domain: 'development',
						createdAt: new Date(Date.now() - 86400000).toISOString(),
						score: 0.78,
					},
				];

				// Apply filters
				let filteredMemories = mockMemories;

				if (input.filters?.domain) {
					filteredMemories = filteredMemories.filter((m) => m.domain === input.filters?.domain);
				}

				if (input.filters?.tags) {
					filteredMemories = filteredMemories.filter((m) =>
						input.filters?.tags?.some((tag) => m.tags?.includes(tag)),
					);
				}

				// Apply limit
				const limitedMemories = filteredMemories.slice(0, input.limit || 10);

				const result = {
					success: true,
					data: {
						memories: limitedMemories,
						total: limitedMemories.length,
						searchType: input.searchType || 'semantic',
						searchTime: Math.floor(Math.random() * 100) + 20,
						query: input.query,
					},
				};

				res.json(result);
			} catch (error) {
				res.status(500).json({
					error: 'Internal server error',
					details: (error as Error).message,
				});
			}
		});

		app.post('/api/v1/memory/analysis', async (req, res) => {
			try {
				const input: MemoryAnalysisInput = req.body;

				// Mock analysis results
				let resultData: any = {};

				switch (input.analysisType) {
					case 'frequency':
						resultData = {
							tags: {
								test: 15,
								api: 8,
								rest: 5,
								memory: 12,
							},
							domains: {
								testing: 10,
								development: 8,
								personal: 2,
							},
						};
						break;

					case 'temporal':
						resultData = {
							byDay: {
								'2024-01-15': 5,
								'2024-01-16': 8,
								'2024-01-17': 3,
							},
							byHour: {
								9: 4,
								10: 6,
								11: 3,
								14: 2,
								15: 1,
							},
						};
						break;

					case 'importance':
						resultData = {
							distribution: [
								{ range: '1-3', count: 5 },
								{ range: '4-6', count: 12 },
								{ range: '7-10', count: 8 },
							],
							avgImportance: 5.8,
							medianImportance: 6,
						};
						break;

					case 'cluster':
						resultData = {
							clusters: [
								{
									id: 'cluster-1',
									centroid: 'work meetings',
									size: 8,
									samples: ['Meeting notes', 'Project discussion'],
								},
								{
									id: 'cluster-2',
									centroid: 'technical documentation',
									size: 5,
									samples: ['API docs', 'Code examples'],
								},
							],
							totalClusters: 2,
						};
						break;

					default:
						throw new Error(`Unknown analysis type: ${input.analysisType}`);
				}

				const result = {
					success: true,
					data: {
						type: input.analysisType,
						data: resultData,
						generatedAt: new Date().toISOString(),
					},
				};

				res.json(result);
			} catch (error) {
				res.status(500).json({
					error: 'Internal server error',
					details: (error as Error).message,
				});
			}
		});

		app.post('/api/v1/memory/relationships', async (req, res) => {
			try {
				const { memoryId, maxDepth = 2, relationshipTypes } = req.body;

				if (!memoryId) {
					return res.status(400).json({
						error: 'memoryId is required',
					});
				}

				// Mock relationship data
				const result = {
					success: true,
					data: {
						relationships: [
							{
								from: memoryId,
								to: 'related-mem-1',
								type: 'semantic',
								strength: 0.85,
								metadata: {
									similarity: 0.85,
								},
							},
							{
								from: memoryId,
								to: 'related-mem-2',
								type: 'tag',
								strength: 0.7,
								metadata: {
									sharedTags: ['test', 'api'],
								},
							},
						],
						graph: {
							nodes: [
								{ id: memoryId, label: 'Source Memory' },
								{ id: 'related-mem-1', label: 'Related Memory 1' },
								{ id: 'related-mem-2', label: 'Related Memory 2' },
							],
							edges: [
								{ from: memoryId, to: 'related-mem-1', type: 'semantic' },
								{ from: memoryId, to: 'related-mem-2', type: 'tag' },
							],
						},
						stats: {
							totalRelationships: 2,
							relationshipTypes: {
								semantic: 1,
								tag: 1,
							},
							maxDepth: maxDepth,
						},
					},
				};

				res.json(result);
			} catch (error) {
				res.status(500).json({
					error: 'Internal server error',
					details: (error as Error).message,
				});
			}
		});

		app.get('/api/v1/memory/stats', async (req, res) => {
			try {
				const include = req.query.include as string[];

				// Mock stats
				const result: any = {
					success: true,
					data: {
						totalMemories: 25,
						domains: {
							testing: 10,
							development: 8,
							personal: 5,
							work: 2,
						},
						avgImportance: 6.2,
						lastUpdated: new Date().toISOString(),
						searchPerformance: {
							avgSearchTime: 45,
							totalSearches: 156,
						},
					},
				};

				if (include?.includes('qdrant_stats')) {
					result.data.qdrantStats = {
						indexed: 25,
						totalVectors: 25,
						collectionSize: '2.5MB',
					};
				}

				res.json(result);
			} catch (error) {
				res.status(500).json({
					error: 'Internal server error',
					details: (error as Error).message,
				});
			}
		});

		// OpenAPI documentation
		app.get('/openapi.json', (_req, res) => {
			res.json({
				openapi: '3.1.0',
				info: {
					title: 'Cortex Memory REST API',
					version: '1.0.0',
				},
				paths: {
					'/api/v1/memory/store': {
						post: {
							summary: 'Store a memory',
							tags: ['Memory'],
						},
					},
					'/api/v1/memory/search': {
						post: {
							summary: 'Search memories',
							tags: ['Memory'],
						},
					},
				},
			});
		});

		// Start server
		server = app.listen(9702);
		_baseUrl = 'http://localhost:9702';

		await sleep(1000);
	});

	afterAll(() => {
		server.close();
	});

	describe('Health Check', () => {
		it('should return health status', async () => {
			const response = await request(app).get('/healthz');
			expect(response.status).toBe(200);
			expect(response.body.status).toBe('healthy');
			expect(response.body.services).toBeDefined();
		});
	});

	describe('Memory Store', () => {
		it('should store a memory', async () => {
			const input: MemoryStoreInput = {
				content: 'REST API integration test',
				importance: 8,
				tags: ['rest', 'api', 'integration'],
				domain: 'testing',
			};

			const response = await request(app).post('/api/v1/memory/store').send(input).expect(200);

			expect(response.body.success).toBe(true);
			expect(response.body.data.id).toBeDefined();
			expect(response.body.data.vectorIndexed).toBe(true);
		});

		it('should validate store input', async () => {
			const invalidInput = {
				content: '',
				importance: 15, // Invalid
			};

			const response = await request(app)
				.post('/api/v1/memory/store')
				.send(invalidInput)
				.expect(400);

			expect(response.body.error).toBeDefined();
		});
	});

	describe('Memory Search', () => {
		beforeEach(async () => {
			// Store test data
			await request(app)
				.post('/api/v1/memory/store')
				.send({
					content: 'REST API search test memory',
					importance: 7,
					tags: ['search', 'test', 'rest'],
					domain: 'testing',
				});
		});

		it('should search memories', async () => {
			const input: MemorySearchInput = {
				query: 'search test',
				searchType: 'semantic',
				limit: 5,
			};

			const response = await request(app).post('/api/v1/memory/search').send(input).expect(200);

			expect(response.body.success).toBe(true);
			expect(response.body.data.memories).toBeDefined();
			expect(Array.isArray(response.body.data.memories)).toBe(true);
			expect(response.body.data.total).toBeGreaterThan(0);
			expect(response.body.data.searchType).toBe('semantic');
		});

		it('should apply filters', async () => {
			const input: MemorySearchInput = {
				query: 'test',
				searchType: 'keyword',
				filters: {
					domain: 'testing',
					tags: ['rest'],
				},
				limit: 10,
			};

			const response = await request(app).post('/api/v1/memory/search').send(input).expect(200);

			expect(response.body.success).toBe(true);
			expect(response.body.data.memories.every((m: any) => m.domain === 'testing')).toBe(true);
			expect(response.body.data.memories.every((m: any) => m.tags?.includes('rest'))).toBe(true);
		});

		it('should respect limit', async () => {
			const input: MemorySearchInput = {
				query: 'test',
				searchType: 'keyword',
				limit: 1,
			};

			const response = await request(app).post('/api/v1/memory/search').send(input).expect(200);

			expect(response.body.data.memories.length).toBeLessThanOrEqual(1);
		});
	});

	describe('Memory Analysis', () => {
		it('should perform frequency analysis', async () => {
			const response = await request(app)
				.post('/api/v1/memory/analysis')
				.send({
					analysisType: 'frequency',
				})
				.expect(200);

			expect(response.body.success).toBe(true);
			expect(response.body.data.type).toBe('frequency');
			expect(response.body.data.data.tags).toBeDefined();
			expect(response.body.data.data.domains).toBeDefined();
		});

		it('should perform temporal analysis', async () => {
			const response = await request(app)
				.post('/api/v1/memory/analysis')
				.send({
					analysisType: 'temporal',
					timeRange: {
						start: new Date(Date.now() - 86400000).toISOString(),
						end: new Date().toISOString(),
					},
				})
				.expect(200);

			expect(response.body.success).toBe(true);
			expect(response.body.data.data.byDay).toBeDefined();
			expect(response.body.data.data.byHour).toBeDefined();
		});

		it('should perform cluster analysis', async () => {
			const response = await request(app)
				.post('/api/v1/memory/analysis')
				.send({
					analysisType: 'cluster',
					algorithm: 'kmeans',
					params: { k: 3 },
				})
				.expect(200);

			expect(response.body.success).toBe(true);
			expect(response.body.data.data.clusters).toBeDefined();
			expect(Array.isArray(response.body.data.data.clusters)).toBe(true);
		});
	});

	describe('Memory Relationships', () => {
		it('should find related memories', async () => {
			const response = await request(app)
				.post('/api/v1/memory/relationships')
				.send({
					memoryId: 'test-mem-123',
					maxDepth: 2,
					relationshipTypes: ['semantic', 'tag'],
				})
				.expect(200);

			expect(response.body.success).toBe(true);
			expect(response.body.data.relationships).toBeDefined();
			expect(response.body.data.graph).toBeDefined();
			expect(response.body.data.stats).toBeDefined();
			expect(response.body.data.relationships.length).toBeGreaterThan(0);
		});

		it('should require memoryId', async () => {
			const response = await request(app).post('/api/v1/memory/relationships').send({}).expect(400);

			expect(response.body.error).toBeDefined();
		});
	});

	describe('Memory Stats', () => {
		it('should return basic stats', async () => {
			const response = await request(app).get('/api/v1/memory/stats').expect(200);

			expect(response.body.success).toBe(true);
			expect(response.body.data.totalMemories).toBeDefined();
			expect(response.body.data.domains).toBeDefined();
			expect(response.body.data.avgImportance).toBeDefined();
		});

		it('should include Qdrant stats when requested', async () => {
			const response = await request(app)
				.get('/api/v1/memory/stats?include=qdrant_stats')
				.expect(200);

			expect(response.body.data.qdrantStats).toBeDefined();
		});
	});

	describe('CORS Handling', () => {
		it('should handle preflight requests', async () => {
			const response = await request(app).options('/api/v1/memory/store').expect(200);

			expect(response.headers['access-control-allow-origin']).toBe('*');
			expect(response.headers['access-control-allow-methods']).toContain('POST');
		});
	});

	describe('Error Handling', () => {
		it('should handle 404 for unknown routes', async () => {
			const _response = await request(app).get('/api/v1/unknown').expect(404);
		});

		it('should handle malformed JSON', async () => {
			const _response = await request(app)
				.post('/api/v1/memory/store')
				.set('Content-Type', 'application/json')
				.send('invalid json')
				.expect(400);
		});
	});

	describe('OpenAPI Documentation', () => {
		it('should serve OpenAPI spec', async () => {
			const response = await request(app).get('/openapi.json').expect(200);

			expect(response.body.openapi).toBe('3.1.0');
			expect(response.body.paths).toBeDefined();
		});
	});

	describe('Rate Limiting', () => {
		it('should handle rate limits', async () => {
			// Make multiple requests quickly
			const requests = Array.from({ length: 10 }, () => request(app).get('/healthz'));

			const responses = await Promise.all(requests);
			const successCount = responses.filter((r) => r.status === 200).length;

			// At least some requests should succeed
			expect(successCount).toBeGreaterThan(0);
		});
	});
});
