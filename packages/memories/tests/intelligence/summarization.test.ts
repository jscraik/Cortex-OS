import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IntelligentMemoryStore } from '../../src/adapters/store.intelligent.js';
import { InMemoryStore } from '../../src/adapters/store.memory.js';
import { createMemory } from '../test-utils.js';

describe('IntelligentMemoryStore', () => {
	let baseStore: InMemoryStore;
	let intelligentStore: IntelligentMemoryStore;
	let namespace: string;

	beforeEach(() => {
		vi.clearAllMocks();
		baseStore = new InMemoryStore();
		namespace = `test-${Math.random().toString(36).substring(7)}`;
	});

	afterEach(async () => {
		// Clean up
		const allMemories = await baseStore.list(namespace);
		for (const memory of allMemories) {
			await baseStore.delete(memory.id, namespace);
		}
	});

	describe('Summary Generation', () => {
		it('should generate summaries for memory groups', async () => {
			// Configure summarization
			intelligentStore = new IntelligentMemoryStore(baseStore, {
				summarization: {
					enabled: true,
					maxGroupSize: 10,
					minGroupSize: 3,
					summaryLength: 200,
				},
			});

			// Create related memories
			const memories = [
				createMemory({ text: 'Learned about React hooks and useState hook' }),
				createMemory({ text: 'Practiced useEffect hook for side effects' }),
				createMemory({ text: 'Studied useContext for context management' }),
				createMemory({ text: 'Explored useReducer for complex state' }),
			];

			for (const memory of memories) {
				await intelligentStore.upsert(memory, namespace);
			}

			// Generate summary
			const summary = await intelligentStore.generateSummary({
				query: 'React hooks',
				namespace,
				timeRange: { start: new Date(Date.now() - 86400000), end: new Date() },
			});

			expect(summary).toBeDefined();
			expect(summary.keyPoints.length).toBeGreaterThan(0);
			expect(summary.summary).toContain('React');
			expect(summary.memoriesIncluded).toBe(4);
			expect(summary.confidence).toBeGreaterThan(0.5);
		});

		it('should handle different summary lengths', async () => {
			intelligentStore = new IntelligentMemoryStore(baseStore, {
				summarization: {
					enabled: true,
					maxGroupSize: 10,
					minGroupSize: 2,
					summaryLength: 100, // Short summary
				},
			});

			const memories = [
				createMemory({ text: 'Machine learning fundamentals include supervised learning' }),
				createMemory({ text: 'Unsupervised learning finds patterns in unlabeled data' }),
				createMemory({ text: 'Reinforcement learning uses rewards to train models' }),
			];

			for (const memory of memories) {
				await intelligentStore.upsert(memory, namespace);
			}

			const summary = await intelligentStore.generateSummary({
				query: 'machine learning',
				namespace,
				summaryLength: 50,
			});

			expect(summary.summary.length).toBeLessThanOrEqual(50);
		});

		it('should extract key themes and concepts', async () => {
			intelligentStore = new IntelligentMemoryStore(baseStore, {
				summarization: {
					enabled: true,
					extractThemes: true,
				},
			});

			const memories = [
				createMemory({ text: 'JavaScript async/await simplifies promise handling' }),
				createMemory({ text: 'Promise.all() handles multiple promises concurrently' }),
				createMemory({ text: 'Async functions return promises implicitly' }),
			];

			for (const memory of memories) {
				await intelligentStore.upsert(memory, namespace);
			}

			const summary = await intelligentStore.generateSummary({
				query: 'JavaScript promises',
				namespace,
			});

			expect(summary.themes).toContain('promises');
			expect(summary.themes).toContain('async');
		});

		it('should generate chronological timelines', async () => {
			intelligentStore = new IntelligentMemoryStore(baseStore, {
				summarization: {
					enabled: true,
					generateTimeline: true,
				},
			});

			// Create memories with different timestamps
			const baseTime = Date.now();
			const memories = [
				createMemory({
					text: 'Started learning Python basics',
					createdAt: new Date(baseTime - 86400000).toISOString(),
				}),
				createMemory({
					text: 'Learned about Python decorators',
					createdAt: new Date(baseTime - 43200000).toISOString(),
				}),
				createMemory({
					text: 'Mastered Python context managers',
					createdAt: new Date(baseTime).toISOString(),
				}),
			];

			for (const memory of memories) {
				await intelligentStore.upsert(memory, namespace);
			}

			const timeline = await intelligentStore.generateTimeline({
				namespace,
				period: 'week',
			});

			expect(timeline.events).toHaveLength(3);
			expect(timeline.events[0].timestamp).toBeLessThan(timeline.events[2].timestamp);
			expect(timeline.summary).toContain('Python');
		});
	});

	describe('Memory Consolidation', () => {
		it('should consolidate related memories', async () => {
			intelligentStore = new IntelligentMemoryStore(baseStore, {
				consolidation: {
					enabled: true,
					similarityThreshold: 0.8,
					maxConsolidatedSize: 5000,
				},
			});

			// Create similar memories
			const memories = [
				createMemory({ text: 'The capital of France is Paris' }),
				createMemory({ text: 'Paris is the capital city of France' }),
				createMemory({ text: "France's capital is Paris, a beautiful city" }),
			];

			for (const memory of memories) {
				await intelligentStore.upsert(memory, namespace);
			}

			// Consolidate memories
			const consolidationResult = await intelligentStore.consolidateMemories({
				namespace,
				strategy: 'semantic',
			});

			expect(consolidationResult.consolidated).toHaveLength(1);
			expect(consolidationResult.originalCount).toBe(3);
			expect(consolidationResult.spaceSaved).toBeGreaterThan(0);
		});

		it('should preserve important details during consolidation', async () => {
			intelligentStore = new IntelligentMemoryStore(baseStore, {
				consolidation: {
					enabled: true,
					preserveMetadata: true,
				},
			});

			const memory1 = createMemory({
				text: 'Meeting with team at 2 PM',
				metadata: { priority: 'high', attendees: ['Alice', 'Bob'] },
			});
			const memory2 = createMemory({
				text: 'Team meeting scheduled for 2 PM',
				metadata: { priority: 'high', location: 'Conference Room A' },
			});

			await intelligentStore.upsert(memory1, namespace);
			await intelligentStore.upsert(memory2, namespace);

			const result = await intelligentStore.consolidateMemories({
				namespace,
				strategy: 'semantic',
			});

			const consolidated = result.consolidated[0];
			expect(consolidated.metadata.priority).toBe('high');
			expect(consolidated.metadata.attendees).toEqual(['Alice', 'Bob']);
			expect(consolidated.metadata.location).toBe('Conference Room A');
		});

		it('should handle incremental consolidation', async () => {
			intelligentStore = new IntelligentMemoryStore(baseStore, {
				consolidation: {
					enabled: true,
					autoConsolidate: true,
				},
			});

			// Create initial memories
			const initialMemories = [
				createMemory({ text: 'Node.js is a JavaScript runtime' }),
				createMemory({ text: 'Node.js uses V8 engine' }),
			];

			for (const memory of initialMemories) {
				await intelligentStore.upsert(memory, namespace);
			}

			// Add more similar memories
			const newMemories = [
				createMemory({ text: 'Node.js enables server-side JavaScript' }),
				createMemory({ text: 'V8 engine powers Node.js performance' }),
			];

			for (const memory of newMemories) {
				await intelligentStore.upsert(memory, namespace);
			}

			// Check if consolidation occurred
			const allMemories = await intelligentStore.list(namespace);
			expect(allMemories.length).toBeLessThan(6); // Should be consolidated
		});
	});

	describe('Key Point Extraction', () => {
		it('should extract key points from memory content', async () => {
			intelligentStore = new IntelligentMemoryStore(baseStore, {
				keyPointExtraction: {
					enabled: true,
					maxPoints: 5,
					importanceThreshold: 0.5,
				},
			});

			const memory = createMemory({
				text: 'The project requires: 1) Backend API development with Node.js, 2) Frontend with React, 3) Database design using PostgreSQL, 4) Deployment on AWS, 5) CI/CD pipeline setup. The budget is $100,000 and timeline is 3 months.',
			});

			await intelligentStore.upsert(memory, namespace);

			const keyPoints = await intelligentStore.extractKeyPoints(memory.id, namespace);

			expect(keyPoints.length).toBeGreaterThan(0);
			expect(keyPoints.some((p) => p.text.includes('Node.js'))).toBe(true);
			expect(keyPoints.some((p) => p.text.includes('React'))).toBe(true);
			expect(keyPoints.every((p) => p.importance >= 0.5)).toBe(true);
		});

		it('should prioritize key points by importance', async () => {
			intelligentStore = new IntelligentMemoryStore(baseStore, {
				keyPointExtraction: {
					enabled: true,
				},
			});

			const memory = createMemory({
				text: 'Critical: Server down at 10 AM. Important: Backup failed yesterday. Note: Team meeting at 2 PM. Reminder: Submit timesheet by Friday.',
			});

			await intelligentStore.upsert(memory, namespace);

			const keyPoints = await intelligentStore.extractKeyPoints(memory.id, namespace);

			// Should be sorted by importance
			expect(keyPoints[0].importance).toBeGreaterThanOrEqual(keyPoints[1].importance);
			expect(keyPoints[0].text).toContain('Server down');
		});

		it('should extract key points from multiple memories', async () => {
			intelligentStore = new IntelligentMemoryStore(baseStore, {
				keyPointExtraction: {
					enabled: true,
				},
			});

			const memories = [
				createMemory({ text: 'Bug fix: Authentication issue resolved' }),
				createMemory({ text: 'Feature: User profile page implemented' }),
				createMemory({ text: 'Issue: Database connection timeout' }),
			];

			const memoryIds = [];
			for (const memory of memories) {
				const result = await intelligentStore.upsert(memory, namespace);
				memoryIds.push(result.id);
			}

			const keyPoints = await intelligentStore.extractKeyPointsFromMultiple(memoryIds, namespace);

			expect(keyPoints.length).toBeGreaterThan(0);
			expect(keyPoints.length).toBeLessThanOrEqual(15); // Max 5 per memory
		});
	});

	describe('Intelligent Search', () => {
		it('should provide contextual search results', async () => {
			intelligentStore = new IntelligentMemoryStore(baseStore, {
				search: {
					enabled: true,
					includeSummaries: true,
					includeKeyPoints: true,
				},
			});

			const memories = [
				createMemory({
					text: 'Python machine learning libraries: scikit-learn, TensorFlow, PyTorch',
				}),
				createMemory({ text: 'JavaScript frameworks: React, Vue, Angular' }),
			];

			for (const memory of memories) {
				await intelligentStore.upsert(memory, namespace);
			}

			const results = await intelligentStore.intelligentSearch({
				query: 'machine learning',
				namespace,
				includeContext: true,
			});

			expect(results.items.length).toBeGreaterThan(0);
			expect(results.items[0].context.summary).toBeDefined();
			expect(results.items[0].context.keyPoints).toBeDefined();
		});

		it('should support semantic search beyond keywords', async () => {
			intelligentStore = new IntelligentMemoryStore(baseStore, {
				search: {
					enabled: true,
					useSemanticSearch: true,
				},
			});

			const memories = [
				createMemory({ text: 'The weather is sunny and warm today' }),
				createMemory({ text: 'Beautiful clear skies with bright sunshine' }),
			];

			for (const memory of memories) {
				await intelligentStore.upsert(memory, namespace);
			}

			// Search for semantically related term
			const results = await intelligentStore.intelligentSearch({
				query: 'nice weather',
				namespace,
				semanticThreshold: 0.7,
			});

			expect(results.items.length).toBeGreaterThan(0);
		});

		it('should provide answer synthesis from multiple memories', async () => {
			intelligentStore = new IntelligentMemoryStore(baseStore, {
				synthesis: {
					enabled: true,
				},
			});

			const memories = [
				createMemory({ text: 'The project deadline is March 31st' }),
				createMemory({ text: 'Project budget is $50,000' }),
				createMemory({ text: 'Project requires 3 developers' }),
			];

			for (const memory of memories) {
				await intelligentStore.upsert(memory, namespace);
			}

			const answer = await intelligentStore.synthesizeAnswer({
				question: 'What are the project requirements?',
				namespace,
			});

			expect(answer.answer).toContain('March 31st');
			expect(answer.answer).toContain('$50,000');
			expect(answer.answer).toContain('3 developers');
			expect(answer.sources).toHaveLength(3);
		});
	});

	describe('Memory Insights', () => {
		it('should generate memory analytics and insights', async () => {
			intelligentStore = new IntelligentMemoryStore(baseStore, {
				insights: {
					enabled: true,
				},
			});

			// Create memories with different patterns
			const baseTime = Date.now();
			for (let i = 0; i < 10; i++) {
				await intelligentStore.upsert(
					createMemory({
						text: `Daily standup meeting ${i}`,
						createdAt: new Date(baseTime - i * 86400000).toISOString(),
					}),
					namespace,
				);
			}

			const insights = await intelligentStore.generateInsights({
				namespace,
				timeRange: { start: new Date(baseTime - 10 * 86400000), end: new Date(baseTime) },
			});

			expect(insights.patterns).toBeDefined();
			expect(insights.trends).toBeDefined();
			expect(insights.suggestions.length).toBeGreaterThan(0);
		});

		it('should identify knowledge gaps', async () => {
			intelligentStore = new IntelligentMemoryStore(baseStore, {
				insights: {
					enabled: true,
					identifyGaps: true,
				},
			});

			// Create memories about frontend but not backend
			const memories = [
				createMemory({ text: 'React component structure' }),
				createMemory({ text: 'CSS Grid layout' }),
				createMemory({ text: 'JavaScript async patterns' }),
			];

			for (const memory of memories) {
				await intelligentStore.upsert(memory, namespace);
			}

			const gaps = await intelligentStore.identifyKnowledgeGaps({
				namespace,
				domains: ['frontend', 'backend', 'devops'],
			});

			expect(gaps).toContain('backend');
			expect(gaps).toContain('devops');
		});

		it('should suggest related topics', async () => {
			intelligentStore = new IntelligentMemoryStore(baseStore, {
				insights: {
					enabled: true,
				},
			});

			const memories = [
				createMemory({ text: 'Machine learning algorithms' }),
				createMemory({ text: 'Neural networks basics' }),
			];

			for (const memory of memories) {
				await intelligentStore.upsert(memory, namespace);
			}

			const suggestions = await intelligentStore.suggestRelatedTopics({
				topic: 'deep learning',
				namespace,
				maxSuggestions: 5,
			});

			expect(suggestions).toContain('neural networks');
			expect(suggestions).toContain('machine learning');
		});
	});

	describe('Configuration and Performance', () => {
		it('should respect configuration limits', async () => {
			intelligentStore = new IntelligentMemoryStore(baseStore, {
				summarization: {
					enabled: true,
					maxGroupSize: 2,
					minGroupSize: 2,
				},
			});

			// Create more memories than maxGroupSize
			const memories = [
				createMemory({ text: 'Memory 1' }),
				createMemory({ text: 'Memory 2' }),
				createMemory({ text: 'Memory 3' }),
			];

			for (const memory of memories) {
				await intelligentStore.upsert(memory, namespace);
			}

			const summary = await intelligentStore.generateSummary({
				query: 'test',
				namespace,
			});

			// Should only process maxGroupSize memories
			expect(summary.memoriesIncluded).toBeLessThanOrEqual(2);
		});

		it('should handle large memory sets efficiently', async () => {
			intelligentStore = new IntelligentMemoryStore(baseStore, {
				performance: {
					batchSize: 50,
					maxProcessingTime: 5000,
				},
			});

			// Create many memories
			const memories = [];
			for (let i = 0; i < 100; i++) {
				memories.push(createMemory({ text: `Memory ${i}` }));
			}

			const startTime = Date.now();
			for (const memory of memories) {
				await intelligentStore.upsert(memory, namespace);
			}
			const endTime = Date.now();

			expect(endTime - startTime).toBeLessThan(10000); // Should process quickly
		});

		it('should cache intelligent operations', async () => {
			intelligentStore = new IntelligentMemoryStore(baseStore, {
				cache: {
					enabled: true,
					ttl: 60000,
				},
			});

			const memory = createMemory({ text: 'Cacheable content' });
			await intelligentStore.upsert(memory, namespace);

			// First call - should cache
			const keyPoints1 = await intelligentStore.extractKeyPoints(memory.id, namespace);

			// Second call - should use cache
			const keyPoints2 = await intelligentStore.extractKeyPoints(memory.id, namespace);

			expect(keyPoints1).toEqual(keyPoints2);
		});
	});
});
