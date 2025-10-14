/**
 * REF‑RAG Relevance Policy Tests
 *
 * Tests for hybrid scoring with heuristic fallbacks
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RelevancePolicy } from '../relevance-policy.js';
import { RiskClass } from '../types.js';
import type { Chunk, QueryGuardResult } from '../types.js';

describe('RelevancePolicy', () => {
	let relevancePolicy: RelevancePolicy;
	let mockChunks: Chunk[];
	let mockQueryGuard: QueryGuardResult;

	beforeEach(() => {
		relevancePolicy = new RelevancePolicy();

		// Create mock chunks for testing
		mockChunks = [
			{
				id: 'chunk-1',
				content: 'The capital of France is Paris, a beautiful city known for the Eiffel Tower.',
				embedding: new Array(1536).fill(0.1), // Mock embedding
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
				// REF‑RAG metadata
				refRagMetadata: {
					facts: [
						{
							type: 'location',
							value: 'Paris',
							context: 'capital of France',
							confidence: 0.95
						},
						{
							type: 'landmark',
							value: 'Eiffel Tower',
							context: 'in Paris',
							confidence: 0.98
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
				content: 'Paris has a population of approximately 2.2 million people in the city proper.',
				embedding: new Array(1536).fill(0.2), // Mock embedding
				metadata: {
					source: 'statista',
					title: 'Paris Population',
					url: 'https://example.com/paris-population',
					published: new Date('2023-06-01').toISOString(),
					author: 'Statista Research',
					tags: ['demographics', 'statistics'],
					chunkIndex: 0,
					totalChunks: 1
				},
				refRagMetadata: {
					facts: [
						{
							type: 'number',
							value: 2200000,
							context: 'population of Paris',
							confidence: 0.92
						}
					],
					compression: {
						virtualTokens: new Float32Array([0.2, 0.3, 0.4, 0.5, 0.6]),
						projectionRatio: 0.85,
						confidence: 0.88
					},
					quality: {
						readabilityScore: 0.8,
						factualDensity: 0.95,
						sourceAuthority: 0.9
					}
				}
			},
			{
				id: 'chunk-3',
				content: 'The Eiffel Tower was built in 1889 and stands 330 meters tall.',
				embedding: new Array(1536).fill(0.15), // Mock embedding
				metadata: {
					source: 'historical-docs',
					title: 'Eiffel Tower History',
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
							context: 'Eiffel Tower built',
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
						virtualTokens: new Float32Array([0.3, 0.4, 0.5, 0.6, 0.7]),
						projectionRatio: 0.82,
						confidence: 0.91
					},
					quality: {
						readabilityScore: 0.88,
						factualDensity: 0.92,
						sourceAuthority: 0.85
					}
				}
			},
			{
				id: 'chunk-4',
				content: 'Paris is famous for its cuisine, including croissants and baguettes.',
				embedding: new Array(1536).fill(0.05), // Mock embedding (less relevant)
				metadata: {
					source: 'food-blog',
					title: 'Parisian Cuisine',
					url: 'https://example.com/paris-food',
					published: new Date('2021-05-01').toISOString(), // Older content
					author: 'Food Blogger',
					tags: ['food', 'cuisine'],
					chunkIndex: 0,
					totalChunks: 1
				},
				refRagMetadata: {
					facts: [
						{
							type: 'food',
							value: 'croissants',
							context: 'Parisian cuisine',
							confidence: 0.8
						}
					],
					compression: {
						virtualTokens: new Float32Array([0.1, 0.1, 0.1, 0.1, 0.1]),
						projectionRatio: 0.7,
						confidence: 0.75
					},
					quality: {
						readabilityScore: 0.75,
						factualDensity: 0.6,
						sourceAuthority: 0.7
					}
				}
			}
		];

		mockQueryGuard = {
			riskClass: RiskClass.LOW,
			detectedDomains: [],
			extractedEntities: {
				companies: [],
				people: [],
				locations: ['paris'],
				dates: [],
				topics: ['capital']
			},
			expansionHints: {
				mandatoryExpansion: false,
				requireRecentData: false,
				preferAuthoritativeSources: false,
				contextTimeframe: 'current',
				expectedAnswerLength: 'medium',
				depth: 'basic',
				preferComparative: false
			},
			hardRequirements: {
				factVerification: false,
				structuredOutput: false,
				escalationPath: false
			}
		};
	});

	describe('scoreChunks', () => {
		it('should score chunks based on similarity and quality', async () => {
			const queryEmbedding = new Array(1536).fill(0.12);
			const scores = relevancePolicy.scoreChunks(mockChunks, queryEmbedding, mockQueryGuard);

			expect(scores).toHaveLength(4);
			scores.forEach(score => {
				expect(score.chunkId).toBeDefined();
				expect(score.totalScore).toBeGreaterThanOrEqual(0);
				expect(score.totalScore).toBeLessThanOrEqual(1);
				expect(score.breakdown).toBeDefined();
				expect(score.recommendedBand).toBeDefined();
			});
		});

		it('should recommend Band A for high-quality, relevant chunks', async () => {
			const queryEmbedding = new Array(1536).fill(0.12);
			const scores = relevancePolicy.scoreChunks(mockChunks, queryEmbedding, mockQueryGuard);

			// Most relevant chunks should be recommended for Band A
			const bandAChunks = scores.filter(s => s.recommendedBand === 'A');
			expect(bandAChunks.length).toBeGreaterThan(0);

			// Should have high similarity and quality scores
			bandAChunks.forEach(score => {
				expect(score.breakdown.similarity).toBeGreaterThan(0.5);
				expect(score.breakdown.quality).toBeGreaterThan(0.7);
			});
		});

		it('should recommend Band B for chunks with good compression', async () => {
			const queryEmbedding = new Array(1536).fill(0.12);
			const scores = relevancePolicy.scoreChunks(mockChunks, queryEmbedding, mockQueryGuard);

			const bandBChunks = scores.filter(s => s.recommendedBand === 'B');
			if (bandBChunks.length > 0) {
				bandBChunks.forEach(score => {
					const chunk = mockChunks.find(c => c.id === score.chunkId);
					if (chunk?.refRagMetadata?.compression) {
						expect(chunk.refRagMetadata.compression.confidence).toBeGreaterThan(0.8);
					}
				});
			}
		});

		it('should recommend Band C for chunks with structured facts', async () => {
			const queryEmbedding = new Array(1536).fill(0.12);
			const scores = relevancePolicy.scoreChunks(mockChunks, queryEmbedding, mockQueryGuard);

			const bandCChunks = scores.filter(s => s.recommendedBand === 'C');
			expect(bandCChunks.length).toBeGreaterThan(0);

			bandCChunks.forEach(score => {
				const chunk = mockChunks.find(c => c.id === score.chunkId);
				expect(chunk?.refRagMetadata?.facts).toBeDefined();
				expect(chunk.refRagMetadata.facts.length).toBeGreaterThan(0);
			});
		});

		it('should apply duplication penalties correctly', async () => {
			// Create duplicate chunks
			const duplicateChunks = [
				...mockChunks,
				{
					...mockChunks[0],
					id: 'chunk-1-duplicate'
				}
			];

			const queryEmbedding = new Array(1536).fill(0.12);
			const scores = relevancePolicy.scoreChunks(duplicateChunks, queryEmbedding, mockQueryGuard);

			const originalScore = scores.find(s => s.chunkId === 'chunk-1');
			const duplicateScore = scores.find(s => s.chunkId === 'chunk-1-duplicate');

			expect(originalScore).toBeDefined();
			expect(duplicateScore).toBeDefined();
			expect(duplicateScore!.totalScore).toBeLessThan(originalScore!.totalScore);
			expect(duplicateScore!.breakdown.duplicationPenalty).toBeGreaterThan(0);
		});

		it('should apply freshness bonuses for recent data when required', async () => {
			const recentQueryGuard = {
				...mockQueryGuard,
				expansionHints: {
					...mockQueryGuard.expansionHints,
					requireRecentData: true
				}
			};

			const queryEmbedding = new Array(1536).fill(0.12);
			const scores = relevancePolicy.scoreChunks(mockChunks, queryEmbedding, recentQueryGuard);

			const recentChunk = scores.find(s => s.chunkId === 'chunk-2'); // June 2023
			const olderChunk = scores.find(s => s.chunkId === 'chunk-4'); // May 2021

			if (recentChunk && olderChunk) {
				expect(recentChunk.breakdown.freshness).toBeGreaterThan(olderChunk.breakdown.freshness);
			}
		});

		it('should apply domain bonuses for relevant domains', async () => {
			const financialQueryGuard = {
				...mockQueryGuard,
				detectedDomains: ['financial'],
				extractedEntities: {
					...mockQueryGuard.extractedEntities,
					topics: ['investment']
				}
			};

			// Add a financial chunk
			const financialChunks = [
				...mockChunks,
				{
					id: 'chunk-financial',
					content: 'Stock market investments require careful analysis and risk management.',
					embedding: new Array(1536).fill(0.3),
					metadata: {
						source: 'financial-times',
						title: 'Investment Guide',
						url: 'https://example.com/investments',
						published: new Date('2023-07-01').toISOString(),
						author: 'Financial Times',
						tags: ['finance', 'investment'],
						chunkIndex: 0,
						totalChunks: 1
					},
					refRagMetadata: {
						facts: [],
						compression: {
							virtualTokens: new Float32Array([0.4, 0.5, 0.6, 0.7, 0.8]),
							projectionRatio: 0.9,
							confidence: 0.95
						},
						quality: {
							readabilityScore: 0.9,
							factualDensity: 0.85,
							sourceAuthority: 0.95
						}
					}
				}
			];

			const queryEmbedding = new Array(1536).fill(0.25);
			const scores = relevancePolicy.scoreChunks(financialChunks, queryEmbedding, financialQueryGuard);

			const financialScore = scores.find(s => s.chunkId === 'chunk-financial');
			expect(financialScore?.breakdown.domainBonus).toBeGreaterThan(0);
		});

		it('should handle edge cases gracefully', async () => {
			// Empty chunks array
			const emptyScores = relevancePolicy.scoreChunks([], new Array(1536).fill(0), mockQueryGuard);
			expect(emptyScores).toEqual([]);

			// Chunk without REF‑RAG metadata
			const chunksWithoutMetadata = [
				{
					id: 'chunk-no-metadata',
					content: 'Simple content without metadata.',
					embedding: new Array(1536).fill(0.1),
					metadata: {
						source: 'test',
						title: 'Test',
						url: 'https://example.com',
						published: new Date().toISOString(),
						author: 'Test Author',
						tags: [],
						chunkIndex: 0,
						totalChunks: 1
					}
				}
			];

			const scores = relevancePolicy.scoreChunks(chunksWithoutMetadata, new Array(1536).fill(0.1), mockQueryGuard);
			expect(scores).toHaveLength(1);
			expect(scores[0].totalScore).toBeGreaterThan(0);
		});

		it('should apply risk-appropriate scoring weights', async () => {
			const highRiskQueryGuard = {
				...mockQueryGuard,
				riskClass: RiskClass.HIGH,
				hardRequirements: {
					factVerification: true,
					structuredOutput: true,
					escalationPath: false
				}
			};

			const lowRiskQueryGuard = {
				...mockQueryGuard,
				riskClass: RiskClass.LOW
			};

			const queryEmbedding = new Array(1536).fill(0.12);
			const highRiskScores = relevancePolicy.scoreChunks(mockChunks, queryEmbedding, highRiskQueryGuard);
			const lowRiskScores = relevancePolicy.scoreChunks(mockChunks, queryEmbedding, lowRiskQueryGuard);

			// High risk queries should prioritize chunks with more facts
			const highRiskFactChunk = highRiskScores.find(s => {
				const chunk = mockChunks.find(c => c.id === s.chunkId);
				return chunk?.refRagMetadata?.facts && chunk.refRagMetadata.facts.length > 1;
			});

			expect(highRiskFactChunk?.breakdown.factDensity).toBeGreaterThan(0.5);
		});
	});

	describe('scoring components', () => {
		it('should calculate similarity scores correctly', async () => {
			// Create query embedding similar to first chunk
			const queryEmbedding = new Array(1536).fill(0.11);
			const scores = relevancePolicy.scoreChunks(mockChunks, queryEmbedding, mockQueryGuard);

			const mostSimilarScore = scores.reduce((max, score) =>
				score.totalScore > max.totalScore ? score : max
			);

			expect(mostSimilarScore.chunkId).toBe('chunk-1');
			expect(mostSimilarScore.breakdown.similarity).toBeGreaterThan(0.8);
		});

		it('should calculate quality scores based on metadata', async () => {
			const queryEmbedding = new Array(1536).fill(0.1);
			const scores = relevancePolicy.scoreChunks(mockChunks, queryEmbedding, mockQueryGuard);

			const highQualityChunk = scores.find(s => s.chunkId === 'chunk-1');
			const lowQualityChunk = scores.find(s => s.chunkId === 'chunk-4');

			expect(highQualityChunk?.breakdown.quality).toBeGreaterThan(lowQualityChunk?.breakdown.quality || 0);
		});

		it('should apply diversity penalties for similar content', async () => {
			// Create similar chunks
			const similarChunks = [
				mockChunks[0],
				{
					...mockChunks[0],
					id: 'chunk-similar',
					content: 'The capital of France is Paris, famous for the Eiffel Tower and beautiful architecture.'
				}
			];

			const queryEmbedding = new Array(1536).fill(0.12);
			const scores = relevancePolicy.scoreChunks(similarChunks, queryEmbedding, mockQueryGuard);

			const originalScore = scores.find(s => s.chunkId === 'chunk-1');
			const similarScore = scores.find(s => s.chunkId === 'chunk-similar');

			expect(similarScore?.breakdown.diversityPenalty).toBeGreaterThan(0);
		});
	});

	describe('performance', () => {
		it('should score chunks efficiently', async () => {
			const queryEmbedding = new Array(1536).fill(0.1);
			const startTime = Date.now();

			for (let i = 0; i < 100; i++) {
				relevancePolicy.scoreChunks(mockChunks, queryEmbedding, mockQueryGuard);
			}

			const endTime = Date.now();
			const averageTime = (endTime - startTime) / 100;

			expect(averageTime).toBeLessThan(50); // Should process in under 50ms
		});

		it('should handle large chunk sets efficiently', async () => {
			const largeChunkSet = Array(1000).fill(null).map((_, index) => ({
				...mockChunks[0],
				id: `chunk-${index}`,
				embedding: new Array(1536).fill(Math.random())
			}));

			const queryEmbedding = new Array(1536).fill(0.1);
			const startTime = Date.now();

			const scores = relevancePolicy.scoreChunks(largeChunkSet, queryEmbedding, mockQueryGuard);

			const endTime = Date.now();

			expect(scores).toHaveLength(1000);
			expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
		});
	});
});