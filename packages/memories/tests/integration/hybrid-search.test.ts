import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HybridSearchMemoryStore } from '../../src/adapters/store.hybrid-search.js';
import { InMemoryStore } from '../../src/adapters/store.memory.js';
import { createMemory } from '../test-utils.js';

describe('HybridSearchMemoryStore', () => {
	let baseStore: InMemoryStore;
	let hybridStore: HybridSearchMemoryStore;
	let namespace: string;

	beforeEach(() => {
		baseStore = new InMemoryStore();
		hybridStore = new HybridSearchMemoryStore(baseStore);
		namespace = `test-${Math.random().toString(36).substring(7)}`;
	});

	afterEach(async () => {
		// Clean up
		const allMemories = await baseStore.list(namespace);
		for (const memory of allMemories) {
			await baseStore.delete(memory.id, namespace);
		}
	});

	describe('Hybrid Query Processing', () => {
		it('should combine text and vector search results', async () => {
			// Create memories with both text and vector content
			const memories = [
				createMemory({
					text: 'Machine learning algorithms',
					vector: [0.1, 0.2, 0.3, 0.4, 0.5],
					metadata: { category: 'AI', importance: 'high' },
				}),
				createMemory({
					text: 'Deep learning neural networks',
					vector: [0.2, 0.3, 0.4, 0.5, 0.6],
					metadata: { category: 'AI', importance: 'high' },
				}),
				createMemory({
					text: 'Traditional programming methods',
					vector: [0.9, 0.8, 0.7, 0.6, 0.5],
					metadata: { category: 'Programming', importance: 'medium' },
				}),
			];

			// Store all memories
			for (const memory of memories) {
				await hybridStore.upsert(memory, namespace);
			}

			// Perform hybrid search
			const results = await hybridStore.search(
				{
					text: 'learning',
					vector: [0.15, 0.25, 0.35, 0.45, 0.55],
					textWeight: 0.5,
					vectorWeight: 0.5,
					limit: 5,
					filters: {
						metadata: { category: 'AI' },
					},
				},
				namespace,
			);

			expect(results).toHaveLength(2); // Should find AI-related memories
			expect(results[0].score).toBeGreaterThan(0);
			expect(results[0].text).toMatch(/learning/);
		});

		it('should apply configurable weights to text and vector scores', async () => {
			const memory = createMemory({
				text: 'Python programming language',
				vector: [0.5, 0.5, 0.5, 0.5, 0.5],
				metadata: { language: 'Python' },
			});

			await hybridStore.upsert(memory, namespace);

			// Search with text emphasis
			const textEmphasisResults = await hybridStore.search(
				{
					text: 'Python',
					vector: [0.1, 0.1, 0.1, 0.1, 0.1],
					textWeight: 0.8,
					vectorWeight: 0.2,
					limit: 5,
				},
				namespace,
			);

			// Search with vector emphasis
			const vectorEmphasisResults = await hybridStore.search(
				{
					text: 'Python',
					vector: [0.5, 0.5, 0.5, 0.5, 0.5],
					textWeight: 0.2,
					vectorWeight: 0.8,
					limit: 5,
				},
				namespace,
			);

			expect(textEmphasisResults).toHaveLength(1);
			expect(vectorEmphasisResults).toHaveLength(1);
			// The scores should differ based on weights
			expect(textEmphasisResults[0].score).not.toBe(vectorEmphasisResults[0].score);
		});

		it('should handle text-only queries', async () => {
			const memory = createMemory({
				text: 'React components and hooks',
				metadata: { framework: 'React' },
			});

			await hybridStore.upsert(memory, namespace);

			// Search with only text
			const results = await hybridStore.search(
				{
					text: 'React',
					textWeight: 1.0,
					vectorWeight: 0.0,
					limit: 5,
				},
				namespace,
			);

			expect(results).toHaveLength(1);
			expect(results[0].text).toBe('React components and hooks');
		});

		it('should handle vector-only queries', async () => {
			const memory = createMemory({
				text: 'Database indexing strategies',
				vector: [0.3, 0.4, 0.5, 0.6, 0.7],
				metadata: { topic: 'databases' },
			});

			await hybridStore.upsert(memory, namespace);

			// Search with only vector
			const results = await hybridStore.search(
				{
					vector: [0.3, 0.4, 0.5, 0.6, 0.7],
					textWeight: 0.0,
					vectorWeight: 1.0,
					limit: 5,
				},
				namespace,
			);

			expect(results).toHaveLength(1);
			expect(results[0].text).toBe('Database indexing strategies');
		});

		it('should support result fusion strategies', async () => {
			const memories = [
				createMemory({
					text: 'Cloud computing services',
					vector: [0.1, 0.2, 0.3, 0.4, 0.5],
					metadata: { category: 'cloud' },
				}),
				createMemory({
					text: 'Distributed computing systems',
					vector: [0.9, 0.8, 0.7, 0.6, 0.5],
					metadata: { category: 'distributed' },
				}),
			];

			for (const memory of memories) {
				await hybridStore.upsert(memory, namespace);
			}

			// Test reciprocal rank fusion (RRF)
			const rrfResults = await hybridStore.search(
				{
					text: 'computing',
					vector: [0.2, 0.3, 0.4, 0.5, 0.6],
					fusionStrategy: 'rrf',
					limit: 5,
				},
				namespace,
			);

			// Test weighted sum fusion
			const weightedResults = await hybridStore.search(
				{
					text: 'computing',
					vector: [0.2, 0.3, 0.4, 0.5, 0.6],
					fusionStrategy: 'weighted',
					textWeight: 0.5,
					vectorWeight: 0.5,
					limit: 5,
				},
				namespace,
			);

			expect(rrfResults).toHaveLength(2);
			expect(weightedResults).toHaveLength(2);
			// Results order might differ based on fusion strategy
		});
	});

	describe('Filter Combinations', () => {
		it('should apply metadata filters to hybrid results', async () => {
			const memories = [
				createMemory({
					text: 'JavaScript async functions',
					vector: [0.1, 0.2, 0.3, 0.4, 0.5],
					metadata: { language: 'JavaScript', type: 'tutorial' },
				}),
				createMemory({
					text: 'Python async functions',
					vector: [0.2, 0.3, 0.4, 0.5, 0.6],
					metadata: { language: 'Python', type: 'tutorial' },
				}),
				createMemory({
					text: 'JavaScript design patterns',
					vector: [0.3, 0.4, 0.5, 0.6, 0.7],
					metadata: { language: 'JavaScript', type: 'patterns' },
				}),
			];

			for (const memory of memories) {
				await hybridStore.upsert(memory, namespace);
			}

			// Search with metadata filter
			const results = await hybridStore.search(
				{
					text: 'functions',
					vector: [0.15, 0.25, 0.35, 0.45, 0.55],
					filters: {
						metadata: { language: 'JavaScript' },
					},
					limit: 5,
				},
				namespace,
			);

			expect(results).toHaveLength(1);
			expect(results[0].text).toBe('JavaScript async functions');
		});

		it('should support temporal filters', async () => {
			// Create memories with different timestamps
			const oldMemory = createMemory({
				text: 'Legacy system architecture',
				vector: [0.1, 0.1, 0.1, 0.1, 0.1],
				createdAt: '2023-01-01T00:00:00Z',
			});

			const newMemory = createMemory({
				text: 'Modern microservices architecture',
				vector: [0.9, 0.9, 0.9, 0.9, 0.9],
				createdAt: '2024-01-01T00:00:00Z',
			});

			await hybridStore.upsert(oldMemory, namespace);
			await hybridStore.upsert(newMemory, namespace);

			// Search with date filter
			const results = await hybridStore.search(
				{
					text: 'architecture',
					vector: [0.5, 0.5, 0.5, 0.5, 0.5],
					filters: {
						dateRange: {
							start: '2024-01-01T00:00:00Z',
							end: '2024-12-31T23:59:59Z',
						},
					},
					limit: 5,
				},
				namespace,
			);

			expect(results).toHaveLength(1);
			expect(results[0].text).toBe('Modern microservices architecture');
		});

		it('should combine multiple filter types', async () => {
			const memories = [
				createMemory({
					text: 'Important security update',
					vector: [0.8, 0.8, 0.8, 0.8, 0.8],
					metadata: { priority: 'high', category: 'security' },
					createdAt: '2024-06-01T00:00:00Z',
				}),
				createMemory({
					text: 'Regular maintenance notice',
					vector: [0.2, 0.2, 0.2, 0.2, 0.2],
					metadata: { priority: 'low', category: 'maintenance' },
					createdAt: '2024-06-15T00:00:00Z',
				}),
			];

			for (const memory of memories) {
				await hybridStore.upsert(memory, namespace);
			}

			// Search with combined filters
			const results = await hybridStore.search(
				{
					text: 'update',
					vector: [0.7, 0.7, 0.7, 0.7, 0.7],
					filters: {
						metadata: { priority: 'high' },
						dateRange: {
							start: '2024-06-01T00:00:00Z',
							end: '2024-06-30T23:59:59Z',
						},
					},
					limit: 5,
				},
				namespace,
			);

			expect(results).toHaveLength(1);
			expect(results[0].text).toBe('Important security update');
		});
	});

	describe('Aggregation Queries', () => {
		it('should support facet aggregation', async () => {
			const memories = [
				createMemory({
					text: 'React tutorial',
					vector: [0.1, 0.2, 0.3, 0.4, 0.5],
					metadata: { category: 'frontend', framework: 'React' },
				}),
				createMemory({
					text: 'Vue.js guide',
					vector: [0.2, 0.3, 0.4, 0.5, 0.6],
					metadata: { category: 'frontend', framework: 'Vue' },
				}),
				createMemory({
					text: 'Express.js backend',
					vector: [0.3, 0.4, 0.5, 0.6, 0.7],
					metadata: { category: 'backend', framework: 'Express' },
				}),
				createMemory({
					text: 'Django tutorial',
					vector: [0.4, 0.5, 0.6, 0.7, 0.8],
					metadata: { category: 'backend', framework: 'Django' },
				}),
			];

			for (const memory of memories) {
				await hybridStore.upsert(memory, namespace);
			}

			// Search with aggregation - use vector search to match all documents
			const response = await hybridStore.searchWithAggregations(
				{
					text: '', // No text filter
					vector: [0.25, 0.35, 0.45, 0.55, 0.65], // Central vector to match all
					textWeight: 0.0, // Disable text search
					vectorWeight: 1.0, // Use only vector search
					aggregations: {
						category: { type: 'terms', field: 'category' },
						framework: { type: 'terms', field: 'framework' },
					},
					limit: 10,
				},
				namespace,
			);

			expect(response.aggregations).toBeDefined();
			expect(response.aggregations.category.buckets).toHaveLength(2);
			expect(response.aggregations.framework.buckets).toHaveLength(4);
		});

		it('should calculate statistics on numeric fields', async () => {
			const memories = [
				createMemory({
					text: 'Project Alpha',
					metadata: { budget: 100000, teamSize: 5 },
				}),
				createMemory({
					text: 'Project Beta',
					metadata: { budget: 250000, teamSize: 8 },
				}),
				createMemory({
					text: 'Project Gamma',
					metadata: { budget: 50000, teamSize: 3 },
				}),
			];

			for (const memory of memories) {
				await hybridStore.upsert(memory, namespace);
			}

			// Search with stats aggregation
			const response = await hybridStore.searchWithAggregations(
				{
					text: 'Project',
					aggregations: {
						budgetStats: { type: 'stats', field: 'budget' },
						teamStats: { type: 'stats', field: 'teamSize' },
					},
					limit: 10,
				},
				namespace,
			);

			expect(response.aggregations.budgetStats).toEqual({
				count: 3,
				min: 50000,
				max: 250000,
				sum: 400000,
				avg: 133333.33,
			});
		});

		it('should support histogram aggregations', async () => {
			const memories = [
				createMemory({
					text: 'January report',
					metadata: { value: 10, date: '2024-01-15' },
				}),
				createMemory({
					text: 'February report',
					metadata: { value: 20, date: '2024-02-15' },
				}),
				createMemory({
					text: 'March report',
					metadata: { value: 15, date: '2024-03-15' },
				}),
			];

			for (const memory of memories) {
				await hybridStore.upsert(memory, namespace);
			}

			// Search with histogram
			const response = await hybridStore.searchWithAggregations(
				{
					text: 'report',
					aggregations: {
						monthlyValues: {
							type: 'histogram',
							field: 'value',
							interval: 10,
						},
					},
					limit: 10,
				},
				namespace,
			);

			expect(response.aggregations.monthlyValues.buckets).toHaveLength(3);
			expect(response.aggregations.monthlyValues.buckets[0]).toEqual({
				key: 10,
				count: 1,
				min: 10,
				max: 10,
			});
		});
	});

	describe('Performance Optimization', () => {
		it('should cache frequent queries', async () => {
			const memory = createMemory({
				text: 'Cached search results',
				vector: [0.5, 0.5, 0.5, 0.5, 0.5],
			});

			await hybridStore.upsert(memory, namespace);

			// Perform same search twice
			const query1 = {
				text: 'cached',
				vector: [0.5, 0.5, 0.5, 0.5, 0.5],
				limit: 5,
			};

			const results1 = await hybridStore.search(query1, namespace);
			const results2 = await hybridStore.search(query1, namespace);

			expect(results1).toEqual(results2);

			// Check cache metrics
			const metrics = hybridStore.getCacheMetrics();
			expect(metrics.hits).toBeGreaterThan(0);
		});

		it('should handle large result sets efficiently', async () => {
			// Create 100 test memories
			const memories = [];
			for (let i = 0; i < 100; i++) {
				memories.push(
					createMemory({
						text: `Test document ${i}`,
						vector: [Math.random(), Math.random(), Math.random(), Math.random(), Math.random()],
						metadata: { index: i },
					}),
				);
			}

			// Batch insert
			for (const memory of memories) {
				await hybridStore.upsert(memory, namespace);
			}

			// Search with large limit
			const results = await hybridStore.search(
				{
					text: 'test',
					vector: [0.5, 0.5, 0.5, 0.5, 0.5],
					limit: 100,
				},
				namespace,
			);

			expect(results).toHaveLength(100);
			expect(results[0].score).toBeDefined();
		});

		it('should support pagination for large result sets', async () => {
			// Create 50 test memories
			const memories = [];
			for (let i = 0; i < 50; i++) {
				memories.push(
					createMemory({
						text: `Paginated test ${i}`,
						vector: [i / 50, i / 50, i / 50, i / 50, i / 50],
					}),
				);
			}

			for (const memory of memories) {
				await hybridStore.upsert(memory, namespace);
			}

			// Get first page
			const page1 = await hybridStore.search(
				{
					text: 'paginated',
					vector: [0.5, 0.5, 0.5, 0.5, 0.5],
					limit: 10,
					offset: 0,
				},
				namespace,
			);

			// Get second page
			const page2 = await hybridStore.search(
				{
					text: 'paginated',
					vector: [0.5, 0.5, 0.5, 0.5, 0.5],
					limit: 10,
					offset: 10,
				},
				namespace,
			);

			expect(page1).toHaveLength(10);
			expect(page2).toHaveLength(10);
			expect(page1[0].id).not.toBe(page2[0].id);
		});
	});

	describe('Query Analytics', () => {
		it('should track query performance metrics', async () => {
			const memory = createMemory({
				text: 'Performance test',
				vector: [0.5, 0.5, 0.5, 0.5, 0.5],
			});

			await hybridStore.upsert(memory, namespace);

			// Perform search
			await hybridStore.search(
				{
					text: 'performance',
					vector: [0.5, 0.5, 0.5, 0.5, 0.5],
					limit: 5,
				},
				namespace,
			);

			// Check analytics
			const analytics = hybridStore.getQueryAnalytics();
			expect(analytics.totalQueries).toBe(1);
			expect(analytics.averageLatency).toBeGreaterThan(0);
		});

		it('should identify popular search terms', async () => {
			const memories = [
				createMemory({ text: 'Machine learning basics' }),
				createMemory({ text: 'Deep learning advanced' }),
				createMemory({ text: 'Learning algorithms' }),
			];

			for (const memory of memories) {
				await hybridStore.upsert(memory, namespace);
			}

			// Search for learning multiple times
			await hybridStore.search({ text: 'learning', limit: 5 }, namespace);
			await hybridStore.search({ text: 'learning', limit: 5 }, namespace);

			const analytics = hybridStore.getQueryAnalytics();
			expect(analytics.topTerms.learning).toBe(2);
		});
	});
});
