/**
 * REF‑RAG Pipeline Tests
 *
 * Tests for end-to-end REF‑RAG controller
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RefRagPipeline } from '../pipeline.js';
import { RiskClass } from '../types.js';
import type { Chunk, RefRagProcessOptions } from '../types.js';

// Mock dependencies
vi.mock('../query-guard.js');
vi.mock('../relevance-policy.js');
vi.mock('../expansion-planner.js');
vi.mock('../pack-builder.js');
vi.mock('../verification.js');
vi.mock('../../generation/multi-model.js');

describe('RefRagPipeline', () => {
	let pipeline: RefRagPipeline;
	let mockChunks: Chunk[];
	let mockGenerator: any;

	beforeEach(() => {
		pipeline = new RefRagPipeline();

		// Create mock chunks
		mockChunks = [
			{
				id: 'chunk-1',
				content: 'Paris is the capital city of France, known for the Eiffel Tower.',
				embedding: new Array(1536).fill(0.1),
				metadata: {
					source: 'wikipedia',
					title: 'Paris',
					url: 'https://example.com/paris',
					published: new Date('2023-01-01').toISOString(),
					author: 'Wikipedia Editors',
					tags: ['geography', 'cities'],
					chunkIndex: 0,
					totalChunks: 1
				},
				refRagMetadata: {
					facts: [
						{
							type: 'location',
							value: 'Paris',
							context: 'capital of France',
							confidence: 0.95
						}
					],
					compression: {
						virtualTokens: new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5]),
						projectionRatio: 0.8,
						confidence: 0.9
					},
					quality: {
						readabilityScore: 0.85,
						factualDensity: 0.9,
						sourceAuthority: 0.95
					}
				}
			},
			{
				id: 'chunk-2',
				content: 'The Eiffel Tower was constructed in 1889 and stands 330 meters tall.',
				embedding: new Array(1536).fill(0.15),
				metadata: {
					source: 'historical-docs',
					title: 'Eiffel Tower',
					url: 'https://example.com/eiffel-tower',
					published: new Date('2022-12-01').toISOString(),
					author: 'History Channel',
					tags: ['history', 'architecture'],
					chunkIndex: 1,
					totalChunks: 3
				},
				refRagMetadata: {
					facts: [
						{
							type: 'number',
							value: 1889,
							context: 'Eiffel Tower construction year',
							confidence: 0.99
						},
						{
							type: 'number',
							value: 330,
							context: 'Eiffel Tower height in meters',
							confidence: 0.97
						}
					],
					compression: {
						virtualTokens: new Float32Array([0.2, 0.3, 0.4, 0.5, 0.6]),
						projectionRatio: 0.85,
						confidence: 0.88
					},
					quality: {
						readabilityScore: 0.88,
						factualDensity: 0.92,
						sourceAuthority: 0.85
					}
				}
			}
		];

		// Mock generator
		mockGenerator = {
			generateWithBands: vi.fn().mockResolvedValue({
				content: 'Paris is the capital of France, famous for the Eiffel Tower which was built in 1889.',
				provider: 'mlx',
				usage: {
					promptTokens: 150,
					completionTokens: 25,
					totalTokens: 175
				},
				bandUsage: {
					bandAChars: 200,
					bandBVirtualTokens: 15,
					bandCFacts: 2
				},
				contextMetadata: {
					riskClass: 'low',
					totalChunks: 2,
					expansionRatio: 0.8
				}
			})
		};
	});

	describe('process', () => {
		it('should process a simple query successfully', async () => {
			const query = 'What is the capital of France?';
			const options: RefRagProcessOptions = {
				generator: mockGenerator
			};

			// Mock the search and retrieval
			const mockSearchAndRetrieve = vi.fn().mockResolvedValue(mockChunks);
			(pipeline as any).searchAndRetrieve = mockSearchAndRetrieve;

			const result = await pipeline.process(query, options);

			expect(result).toBeDefined();
			expect(result.answer).toBeDefined();
			expect(result.contextPack).toBeDefined();
			expect(result.verification).toBeDefined();
			expect(result.trace).toBeDefined();

			expect(typeof result.answer).toBe('string');
			expect(result.answer.length).toBeGreaterThan(0);
		});

		it('should handle different risk classes appropriately', async () => {
			const queries = [
				{ query: 'What is the capital of France?', expectedRisk: RiskClass.LOW },
				{ query: 'What are the symptoms of flu?', expectedRisk: RiskClass.MEDIUM },
				{ query: 'How to treat a heart attack?', expectedRisk: RiskClass.HIGH }
			];

			const mockSearchAndRetrieve = vi.fn().mockResolvedValue(mockChunks);
			(pipeline as any).searchAndRetrieve = mockSearchAndRetrieve;

			for (const { query, expectedRisk } of queries) {
				const result = await pipeline.process(query, { generator: mockGenerator });

				expect(result.contextPack.queryGuard.riskClass).toBe(expectedRisk);
				expect(result.contextPack.metadata.riskClass).toBe(expectedRisk);
			}
		});

		it('should perform verification for high-risk queries', async () => {
			const query = 'What are the symptoms of heart attack?';
			const options: RefRagProcessOptions = {
				generator: mockGenerator,
				enableVerification: true
			};

			const mockSearchAndRetrieve = vi.fn().mockResolvedValue(mockChunks);
			(pipeline as any).searchAndRetrieve = mockSearchAndRetrieve;

			const result = await pipeline.process(query, options);

			expect(result.verification.performed).toBe(true);
			expect(result.verification.issues).toBeDefined();
			expect(result.verification.escalationRequired).toBeDefined();
		});

		it('should handle empty search results gracefully', async () => {
			const query = 'What is the capital of Antarctica?';
			const options: RefRagProcessOptions = {
				generator: mockGenerator
			};

			const mockSearchAndRetrieve = vi.fn().mockResolvedValue([]);
			(pipeline as any).searchAndRetrieve = mockSearchAndRetrieve;

			const result = await pipeline.process(query, options);

			expect(result.answer).toBeDefined();
			expect(result.contextPack.bandA).toEqual([]);
			expect(result.contextPack.bandB).toEqual([]);
			expect(result.contextPack.bandC).toEqual([]);
		});

		it('should use tri-band context when available', async () => {
			const query = 'Tell me about Paris and the Eiffel Tower';
			const options: RefRagProcessOptions = {
				generator: mockGenerator,
				useTriBandContext: true
			};

			const mockSearchAndRetrieve = vi.fn().mockResolvedValue(mockChunks);
			(pipeline as any).searchAndRetrieve = mockSearchAndRetrieve;

			const result = await pipeline.process(query, options);

			expect(mockGenerator.generateWithBands).toHaveBeenCalledWith(
				expect.stringContaining('Paris'),
				expect.objectContaining({
					bandA: expect.any(String),
					bandB: expect.any(Array),
					bandC: expect.any(Array)
				})
			);
		});

		it('should fall back to standard generation when tri-band fails', async () => {
			const query = 'What is the capital of France?';

			// Mock generator that fails for tri-band
			const failingGenerator = {
				generateWithBands: vi.fn().mockRejectedValue(new Error('Tri-band failed')),
				generate: vi.fn().mockResolvedValue({
					content: 'Paris is the capital of France.',
					provider: 'mlx',
					usage: { promptTokens: 10, completionTokens: 8, totalTokens: 18 }
				})
			};

			const options: RefRagProcessOptions = {
				generator: failingGenerator,
				useTriBandContext: true
			};

			const mockSearchAndRetrieve = vi.fn().mockResolvedValue(mockChunks);
			(pipeline as any).searchAndRetrieve = mockSearchAndRetrieve;

			const result = await pipeline.process(query, options);

			expect(result.answer).toBe('Paris is the capital of France.');
			expect(failingGenerator.generateWithBands).toHaveBeenCalled();
		});

		it('should respect custom budget overrides', async () => {
			const query = 'What is the capital of France?';
			const customBudgets = {
				[RiskClass.LOW]: {
					bandA: 1000,
					bandB: 2000,
					bandC: 50,
					overrides: {
						maxBandAChunks: 5,
						maxBandBChunks: 10,
						maxBandCFacts: 25
					}
				}
			};

			const options: RefRagProcessOptions = {
				generator: mockGenerator,
				budgetOverrides: customBudgets
			};

			const mockSearchAndRetrieve = vi.fn().mockResolvedValue(mockChunks);
			(pipeline as any).searchAndRetrieve = mockSearchAndRetrieve;

			const result = await pipeline.process(query, options);

			// Should respect custom budget limits
			expect(result.contextPack.budgetUsage.bandA.limit).toBe(1000);
			expect(result.contextPack.budgetUsage.bandB.limit).toBe(2000);
			expect(result.contextPack.budgetUsage.bandC.limit).toBe(50);
		});

		it('should track processing metrics', async () => {
			const query = 'What is the capital of France?';
			const options: RefRagProcessOptions = {
				generator: mockGenerator,
				trackMetrics: true
			};

			const mockSearchAndRetrieve = vi.fn().mockResolvedValue(mockChunks);
			(pipeline as any).searchAndRetrieve = mockSearchAndRetrieve;

			const startTime = Date.now();
			const result = await pipeline.process(query, options);
			const endTime = Date.now();

			expect(result.trace).toBeDefined();
			expect(result.trace.startTime).toBeDefined();
			expect(result.trace.endTime).toBeDefined();
			expect(result.trace.duration).toBeDefined();
			expect(result.trace.stages).toBeDefined();
			expect(result.trace.metrics).toBeDefined();

			expect(result.trace.duration).toBeGreaterThanOrEqual(0);
			expect(result.trace.duration).toBeLessThanOrEqual(endTime - startTime + 100); // Allow some margin
		});

		it('should handle generator errors gracefully', async () => {
			const query = 'What is the capital of France?';
			const failingGenerator = {
				generateWithBands: vi.fn().mockRejectedValue(new Error('Generator failed')),
				generate: vi.fn().mockRejectedValue(new Error('Generator failed'))
			};

			const options: RefRagProcessOptions = {
				generator: failingGenerator
			};

			const mockSearchAndRetrieve = vi.fn().mockResolvedValue(mockChunks);
			(pipeline as any).searchAndRetrieve = mockSearchAndRetrieve;

			await expect(pipeline.process(query, options)).rejects.toThrow('Generator failed');
		});

		it('should implement escalation for critical queries', async () => {
			const query = 'How to perform emergency surgery?';
			const options: RefRagProcessOptions = {
				generator: mockGenerator,
				enableEscalation: true
			};

			const mockSearchAndRetrieve = vi.fn().mockResolvedValue(mockChunks);
			(pipeline as any).searchAndRetrieve = mockSearchAndRetrieve;

			const result = await pipeline.process(query, options);

			expect(result.verification.escalationRequired).toBe(true);
			expect(result.trace.escalationTriggered).toBe(true);
		});

		it('should provide detailed trace information', async () => {
			const query = 'What is the capital of France?';
			const options: RefRagProcessOptions = {
				generator: mockGenerator,
				enableTrace: true
			};

			const mockSearchAndRetrieve = vi.fn().mockResolvedValue(mockChunks);
			(pipeline as any).searchAndRetrieve = mockSearchAndRetrieve;

			const result = await pipeline.process(query, options);

			expect(result.trace.stages).toHaveLength(5); // query-guard, retrieval, scoring, expansion, generation
			expect(result.trace.stages[0].name).toBe('query-guard');
			expect(result.trace.stages[1].name).toBe('retrieval');
			expect(result.trace.stages[2].name).toBe('scoring');
			expect(result.trace.stages[3].name).toBe('expansion');
			expect(result.trace.stages[4].name).toBe('generation');

			result.trace.stages.forEach(stage => {
				expect(stage.startTime).toBeDefined();
				expect(stage.endTime).toBeDefined();
				expect(stage.duration).toBeGreaterThanOrEqual(0);
			});
		});
	});

	describe('context pack construction', () => {
		it('should build complete context pack', async () => {
			const query = 'What is the capital of France?';
			const options: RefRagProcessOptions = {
				generator: mockGenerator
			};

			const mockSearchAndRetrieve = vi.fn().mockResolvedValue(mockChunks);
			(pipeline as any).searchAndRetrieve = mockSearchAndRetrieve;

			const result = await pipeline.process(query, options);

			expect(result.contextPack).toMatchObject({
				queryGuard: expect.any(Object),
				bandA: expect.any(Array),
				bandB: expect.any(Array),
				bandC: expect.any(Array),
				budgetUsage: expect.any(Object),
				metadata: expect.objectContaining({
					packId: expect.any(String),
					created: expect.any(Number),
					totalChunks: expect.any(Number),
					expansionRatio: expect.any(Number),
					riskClass: expect.any(String)
				})
			});
		});

		it('should include proper citations in context pack', async () => {
			const query = 'What is the capital of France?';
			const options: RefRagProcessOptions = {
				generator: mockGenerator,
				includeCitations: true
			};

			const mockSearchAndRetrieve = vi.fn().mockResolvedValue(mockChunks);
			(pipeline as any).searchAndRetrieve = mockSearchAndRetrieve;

			const result = await pipeline.process(query, options);

			// Should include citation information
			expect(result.contextPack.bandA.length + result.contextPack.bandB.length + result.contextPack.bandC.length).toBeGreaterThan(0);
		});

		it('should calculate context pack metrics correctly', async () => {
			const query = 'What is the capital of France?';
			const options: RefRagProcessOptions = {
				generator: mockGenerator
			};

			const mockSearchAndRetrieve = vi.fn().mockResolvedValue(mockChunks);
			(pipeline as any).searchAndRetrieve = mockSearchAndRetrieve;

			const result = await pipeline.process(query, options);

			const totalChunks = result.contextPack.bandA.length + result.contextPack.bandB.length + result.contextPack.bandC.length;
			expect(result.contextPack.metadata.totalChunks).toBe(totalChunks);

			const totalBudgetUsed = result.contextPack.budgetUsage.bandA.used +
									result.contextPack.budgetUsage.bandB.used +
									result.contextPack.budgetUsage.bandC.used;
			expect(result.contextPack.budgetUsage.total.used).toBe(totalBudgetUsed);
		});
	});

	describe('verification and quality assurance', () => {
		it('should perform fact verification for medium to high risk queries', async () => {
			const query = 'What are the symptoms of diabetes?';
			const options: RefRagProcessOptions = {
				generator: mockGenerator,
				enableVerification: true
			};

			const mockSearchAndRetrieve = vi.fn().mockResolvedValue(mockChunks);
			(pipeline as any).searchAndRetrieve = mockSearchAndRetrieve;

			const result = await pipeline.process(query, options);

			expect(result.verification.performed).toBe(true);
			expect(result.verification.factChecks).toBeDefined();
			expect(result.verification.confidence).toBeDefined();
			expect(result.verification.confidence).toBeGreaterThanOrEqual(0);
			expect(result.verification.confidence).toBeLessThanOrEqual(1);
		});

		it('should detect potential issues in generated content', async () => {
			// Mock generator that returns problematic content
			const problematicGenerator = {
				generateWithBands: vi.fn().mockResolvedValue({
					content: 'Paris is definitely 100% the capital of France with absolute certainty.',
					provider: 'mlx',
					usage: { promptTokens: 10, completionTokens: 15, totalTokens: 25 }
				})
			};

			const query = 'What is the capital of France?';
			const options: RefRagProcessOptions = {
				generator: problematicGenerator,
				enableVerification: true
			};

			const mockSearchAndRetrieve = vi.fn().mockResolvedValue(mockChunks);
			(pipeline as any).searchAndRetrieve = mockSearchAndRetrieve;

			const result = await pipeline.process(query, options);

			expect(result.verification.issues.length).toBeGreaterThan(0);
			expect(result.verification.issues[0].type).toBeDefined();
			expect(result.verification.issues[0].severity).toBeDefined();
		});
	});

	describe('error handling and edge cases', () => {
		it('should handle malformed chunk data', async () => {
			const malformedChunks = [
				{
					id: 'chunk-1',
					content: '',
					embedding: new Array(1536).fill(0),
					metadata: {
						source: 'test',
						title: 'Test',
						url: '',
						published: new Date().toISOString(),
						author: '',
						tags: [],
						chunkIndex: 0,
						totalChunks: 1
					}
				}
			];

			const query = 'Test query';
			const options: RefRagProcessOptions = {
				generator: mockGenerator
			};

			const mockSearchAndRetrieve = vi.fn().mockResolvedValue(malformedChunks);
			(pipeline as any).searchAndRetrieve = mockSearchAndRetrieve;

			const result = await pipeline.process(query, options);

			expect(result.answer).toBeDefined();
			expect(result.contextPack).toBeDefined();
		});

		it('should handle network timeouts gracefully', async () => {
			const query = 'What is the capital of France?';
			const timeoutGenerator = {
				generateWithBands: vi.fn().mockImplementation(() =>
					new Promise((_, reject) =>
						setTimeout(() => reject(new Error('Timeout')), 100)
					)
				)
			};

			const options: RefRagProcessOptions = {
				generator: timeoutGenerator,
				timeout: 50 // Short timeout
			};

			const mockSearchAndRetrieve = vi.fn().mockResolvedValue(mockChunks);
			(pipeline as any).searchAndRetrieve = mockSearchAndRetrieve;

			await expect(pipeline.process(query, options)).rejects.toThrow();
		});
	});

	describe('performance', () => {
		it('should process queries within reasonable time', async () => {
			const query = 'What is the capital of France?';
			const options: RefRagProcessOptions = {
				generator: mockGenerator
			};

			const mockSearchAndRetrieve = vi.fn().mockResolvedValue(mockChunks);
			(pipeline as any).searchAndRetrieve = mockSearchAndRetrieve;

			const startTime = Date.now();
			const result = await pipeline.process(query, options);
			const endTime = Date.now();

			expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
			expect(result.trace.duration).toBeLessThan(5000);
		});

		it('should handle concurrent requests efficiently', async () => {
			const query = 'What is the capital of France?';
			const options: RefRagProcessOptions = {
				generator: mockGenerator
			};

			const mockSearchAndRetrieve = vi.fn().mockResolvedValue(mockChunks);
			(pipeline as any).searchAndRetrieve = mockSearchAndRetrieve;

			const concurrentRequests = Array(10).fill(null).map(() => pipeline.process(query, options));

			const startTime = Date.now();
			const results = await Promise.all(concurrentRequests);
			const endTime = Date.now();

			expect(results).toHaveLength(10);
			results.forEach(result => {
				expect(result.answer).toBeDefined();
				expect(result.contextPack).toBeDefined();
			});

			// Concurrent processing should be efficient
			expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds
		});
	});
});