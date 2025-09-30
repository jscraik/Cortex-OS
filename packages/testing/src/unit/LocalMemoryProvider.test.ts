import { LocalMemoryProvider } from '@cortex-os/memory-core';
import type {
	MemoryAnalysisInput,
	MemorySearchInput,
	MemoryStoreInput,
} from '@cortex-os/tool-spec';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestConfig } from '../test-setup';

describe('LocalMemoryProvider', () => {
	let provider: LocalMemoryProvider;
	let config: ReturnType<typeof createTestConfig>;

	beforeEach(async () => {
		config = createTestConfig();
		provider = new LocalMemoryProvider(config);
		await provider.initialize();
	});

	afterEach(async () => {
		await provider.close();
	});

	describe('store', () => {
		it('should store a memory and return an ID', async () => {
			const input: MemoryStoreInput = {
				content: 'Test memory content',
				importance: 5,
				tags: ['test', 'unit'],
				domain: 'testing',
			};

			const result = await provider.store(input);

			expect(result.id).toBeDefined();
			expect(typeof result.id).toBe('string');
			expect(result.vectorIndexed).toBe(true);
		});

		it('should store memories with all optional fields', async () => {
			const input: MemoryStoreInput = {
				content: 'Complete memory with all fields',
				importance: 9,
				tags: ['complete', 'full'],
				domain: 'integration',
				metadata: {
					source: 'test',
					timestamp: Date.now(),
				},
				ttl: 3600,
			};

			const result = await provider.store(input);

			expect(result.id).toBeDefined();
			expect(result.vectorIndexed).toBe(true);
		});

		it('should handle Qdrant failures gracefully', async () => {
			// Test with invalid Qdrant URL
			const badConfig = createTestConfig({
				qdrantUrl: 'http://invalid-qdrant:6333',
			});
			const badProvider = new LocalMemoryProvider(badConfig);
			await badProvider.initialize();

			const input: MemoryStoreInput = {
				content: 'Test with Qdrant failure',
				importance: 5,
				tags: ['test', 'qdrant-failure'],
				domain: 'testing',
			};

			const result = await badProvider.store(input);

			expect(result.id).toBeDefined();
			expect(result.vectorIndexed).toBe(false); // Should fallback to SQLite

			await badProvider.close();
		});

		it('should validate input data', async () => {
			const invalidInput = {
				content: '', // Empty content should fail
				importance: 15, // Too high
				tags: 'not-an-array', // Should be array
			};

			await expect(provider.store(invalidInput as any)).rejects.toThrow();
		});
	});

	describe('search', () => {
		beforeEach(async () => {
			// Store test data
			await provider.store({
				content: 'The meeting discussed quarterly results and budget planning',
				importance: 8,
				tags: ['meeting', 'business', 'quarterly'],
				domain: 'work',
			});

			await provider.store({
				content: 'Technical documentation for the new API endpoints',
				importance: 6,
				tags: ['technical', 'api', 'documentation'],
				domain: 'development',
			});

			await provider.store({
				content: 'Personal reminder: buy groceries and call mom',
				importance: 4,
				tags: ['personal', 'reminder'],
				domain: 'personal',
			});
		});

		it('should perform semantic search', async () => {
			const input: MemorySearchInput = {
				query: 'business meeting results',
				searchType: 'semantic',
				limit: 5,
				threshold: 0.5,
			};

			const result = await provider.search(input);

			expect(result.memories).toBeDefined();
			expect(result.memories.length).toBeGreaterThan(0);
			expect(result.total).toBeGreaterThan(0);
			expect(result.searchType).toBe('semantic');

			// First result should be most relevant
			const firstMemory = result.memories[0];
			expect(firstMemory.tags?.includes('business')).toBe(true);
		});

		it('should perform keyword search', async () => {
			const input: MemorySearchInput = {
				query: 'api technical',
				searchType: 'keyword',
				limit: 5,
			};

			const result = await provider.search(input);

			expect(result.memories).toBeDefined();
			expect(result.searchType).toBe('keyword');

			const technicalMemory = result.memories.find((m) => m.tags?.includes('technical'));
			expect(technicalMemory).toBeDefined();
		});

		it('should perform hybrid search', async () => {
			const input: MemorySearchInput = {
				query: 'documentation planning',
				searchType: 'hybrid',
				limit: 5,
				hybridWeight: 0.6,
			};

			const result = await provider.search(input);

			expect(result.memories).toBeDefined();
			expect(result.searchType).toBe('hybrid');
			expect(result.total).toBeGreaterThan(0);
		});

		it('should respect limit parameter', async () => {
			const input: MemorySearchInput = {
				query: 'test',
				searchType: 'keyword',
				limit: 2,
			};

			const result = await provider.search(input);

			expect(result.memories.length).toBeLessThanOrEqual(2);
		});

		it('should filter by domain', async () => {
			const input: MemorySearchInput = {
				query: 'test',
				searchType: 'keyword',
				limit: 10,
				filters: {
					domain: 'work',
				},
			};

			const result = await provider.search(input);

			expect(result.memories.every((m) => m.domain === 'work')).toBe(true);
		});

		it('should filter by tags', async () => {
			const input: MemorySearchInput = {
				query: 'test',
				searchType: 'keyword',
				limit: 10,
				filters: {
					tags: ['technical'],
				},
			};

			const result = await provider.search(input);

			expect(result.memories.every((m) => m.tags?.includes('technical'))).toBe(true);
		});

		it('should filter by importance range', async () => {
			const input: MemorySearchInput = {
				query: 'test',
				searchType: 'keyword',
				limit: 10,
				filters: {
					importanceMin: 7,
				},
			};

			const result = await provider.search(input);

			expect(result.memories.every((m) => (m.importance || 0) >= 7)).toBe(true);
		});

		it('should apply threshold filtering', async () => {
			const input: MemorySearchInput = {
				query: 'completely unrelated query',
				searchType: 'semantic',
				limit: 10,
				threshold: 0.8, // High threshold
			};

			const result = await provider.search(input);

			expect(result.memories.length).toBe(0);
		});
	});

	describe('analysis', () => {
		beforeEach(async () => {
			// Store varied test data for analysis
			await provider.store({
				content: 'The Q4 planning meeting exceeded expectations with record attendance',
				importance: 9,
				tags: ['meeting', 'planning', 'q4'],
				domain: 'work',
			});

			await provider.store({
				content: 'Team meeting for project kickoff and sprint planning',
				importance: 7,
				tags: ['meeting', 'planning', 'sprint'],
				domain: 'work',
			});

			await provider.store({
				content: 'Personal goal: complete online course by end of month',
				importance: 5,
				tags: ['goal', 'learning', 'personal'],
				domain: 'personal',
			});
		});

		it('should generate frequency analysis', async () => {
			const input: MemoryAnalysisInput = {
				analysisType: 'frequency',
				filters: {
					domain: 'work',
				},
			};

			const result = await provider.analysis(input);

			expect(result.type).toBe('frequency');
			expect(result.data).toBeDefined();
			expect(result.data.tags).toBeDefined();
			expect(result.data.domains).toBeDefined();
			expect(Object.keys(result.data.domains)).toContain('work');
		});

		it('should generate temporal analysis', async () => {
			const input: MemoryAnalysisInput = {
				analysisType: 'temporal',
				timeRange: {
					start: new Date(Date.now() - 86400000).toISOString(), // Last 24h
					end: new Date().toISOString(),
				},
			};

			const result = await provider.analysis(input);

			expect(result.type).toBe('temporal');
			expect(result.data).toBeDefined();
			expect(result.data.byDay).toBeDefined();
			expect(result.data.byHour).toBeDefined();
		});

		it('should generate importance distribution', async () => {
			const input: MemoryAnalysisInput = {
				analysisType: 'importance',
			};

			const result = await provider.analysis(input);

			expect(result.type).toBe('importance');
			expect(result.data).toBeDefined();
			expect(result.data.distribution).toBeDefined();
			expect(Array.isArray(result.data.distribution)).toBe(true);
		});

		it('should generate cluster analysis', async () => {
			const input: MemoryAnalysisInput = {
				analysisType: 'cluster',
				algorithm: 'kmeans',
				params: {
					k: 3,
				},
			};

			const result = await provider.analysis(input);

			expect(result.type).toBe('cluster');
			expect(result.data).toBeDefined();
			expect(result.data.clusters).toBeDefined();
			expect(Array.isArray(result.data.clusters)).toBe(true);
		});
	});

	describe('relationships', () => {
		let memoryId1: string;
		let _memoryId2: string;

		beforeEach(async () => {
			// Store related memories
			const result1 = await provider.store({
				content: 'Project kickoff meeting scheduled for next Monday',
				importance: 8,
				tags: ['meeting', 'project', 'kickoff'],
				domain: 'work',
			});
			memoryId1 = result1.id;

			const result2 = await provider.store({
				content: 'Prepare presentation materials for the project kickoff',
				importance: 7,
				tags: ['presentation', 'project', 'preparation'],
				domain: 'work',
			});
			_memoryId2 = result2.id;
		});

		it('should find related memories', async () => {
			const result = await provider.relationships({
				memoryId: memoryId1,
				maxDepth: 2,
				relationshipTypes: ['semantic', 'temporal', 'tag'],
			});

			expect(result.relationships).toBeDefined();
			expect(result.graph).toBeDefined();
			expect(result.stats).toBeDefined();

			// Should find at least one relationship
			expect(result.relationships.length).toBeGreaterThan(0);
		});

		it('should find relationships by type', async () => {
			const result = await provider.relationships({
				memoryId: memoryId1,
				maxDepth: 1,
				relationshipTypes: ['semantic'],
			});

			expect(result.relationships).toBeDefined();
			// All relationships should be semantic type
			expect(result.relationships.every((r) => r.type === 'semantic')).toBe(true);
		});
	});

	describe('stats', () => {
		beforeEach(async () => {
			// Store test data for stats
			await provider.store({
				content: 'Test memory 1',
				importance: 5,
				tags: ['test'],
				domain: 'testing',
			});

			await provider.store({
				content: 'Test memory 2',
				importance: 8,
				tags: ['test', 'important'],
				domain: 'testing',
			});

			await provider.store({
				content: 'Work memory',
				importance: 9,
				tags: ['work', 'meeting'],
				domain: 'work',
			});
		});

		it('should return basic statistics', async () => {
			const result = await provider.stats({});

			expect(result.totalMemories).toBe(3);
			expect(result.domains).toBeDefined();
			expect(result.domains.testing).toBe(2);
			expect(result.domains.work).toBe(1);
			expect(result.avgImportance).toBeGreaterThan(0);
			expect(result.lastUpdated).toBeDefined();
		});

		it('should include Qdrant stats when enabled', async () => {
			const result = await provider.stats({
				include: ['qdrant_stats'],
			});

			expect(result.qdrantStats).toBeDefined();
			expect(result.qdrantStats?.indexed).toBe(3);
		});

		it('should return search performance metrics', async () => {
			const result = await provider.stats({
				include: ['search_performance'],
			});

			expect(result.searchPerformance).toBeDefined();
			expect(result.searchPerformance?.avgSearchTime).toBeGreaterThan(0);
		});
	});

	describe('health check', () => {
		it('should return healthy status', async () => {
			const health = await provider.health();

			expect(health.status).toBe('healthy');
			expect(health.database).toBe('connected');
			expect(health.qdrant).toBe('connected');
			expect(health.uptime).toBeGreaterThan(0);
		});

		it('should handle Qdrant disconnection', async () => {
			// Test with invalid Qdrant
			const badConfig = createTestConfig({
				qdrantUrl: 'http://invalid-qdrant:6333',
			});
			const badProvider = new LocalMemoryProvider(badConfig);
			await badProvider.initialize();

			const health = await badProvider.health();

			expect(health.status).toBe('degraded');
			expect(health.database).toBe('connected');
			expect(health.qdrant).toBe('disconnected');

			await badProvider.close();
		});
	});

	describe('error handling', () => {
		it('should handle concurrent operations safely', async () => {
			const promises = Array.from({ length: 10 }, (_, i) =>
				provider.store({
					content: `Concurrent test memory ${i}`,
					importance: 5,
					tags: ['concurrent', 'test'],
					domain: 'testing',
				}),
			);

			const results = await Promise.all(promises);

			expect(results.length).toBe(10);
			expect(results.every((r) => r.id)).toBe(true);
		});

		it('should handle large content gracefully', async () => {
			const largeContent = 'x'.repeat(10000); // 10KB

			const result = await provider.store({
				content: largeContent,
				importance: 5,
				tags: ['large', 'test'],
				domain: 'testing',
			});

			expect(result.id).toBeDefined();

			// Should be able to retrieve it
			const search = await provider.search({
				query: 'large test',
				searchType: 'keyword',
				limit: 1,
			});

			expect(search.memories.length).toBe(1);
			expect(search.memories[0].content).toBe(largeContent);
		});
	});
});
