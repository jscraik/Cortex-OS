/**
 * REF‑RAG Expansion Planner Tests
 *
 * Tests for chunk allocation across Bands A/B/C
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ExpansionPlanner } from '../expansion-planner.js';
import { RiskClass } from '../types.js';
import type { QueryGuardResult, RelevanceScore, BudgetUsage } from '../types.js';

describe('ExpansionPlanner', () => {
	let expansionPlanner: ExpansionPlanner;
	let mockQueryGuard: QueryGuardResult;
	let mockRelevanceScores: RelevanceScore[];

	beforeEach(() => {
		expansionPlanner = new ExpansionPlanner();

		mockQueryGuard = {
			riskClass: RiskClass.LOW,
			detectedDomains: [],
			extractedEntities: {
				companies: [],
				people: [],
				locations: [],
				dates: [],
				topics: []
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

		// Create mock relevance scores
		mockRelevanceScores = [
			{
				chunkId: 'chunk-1',
				totalScore: 0.95,
				recommendedBand: 'A',
				breakdown: {
					similarity: 0.9,
					quality: 0.95,
					freshness: 0.8,
					diversityPenalty: 0,
					duplicationPenalty: 0,
					domainBonus: 0,
					factDensity: 0.8
				}
			},
			{
				chunkId: 'chunk-2',
				totalScore: 0.88,
				recommendedBand: 'A',
				breakdown: {
					similarity: 0.85,
					quality: 0.9,
					freshness: 0.75,
					diversityPenalty: 0.05,
					duplicationPenalty: 0,
					domainBonus: 0,
					factDensity: 0.7
				}
			},
			{
				chunkId: 'chunk-3',
				totalScore: 0.82,
				recommendedBand: 'B',
				breakdown: {
					similarity: 0.8,
					quality: 0.85,
					freshness: 0.7,
					diversityPenalty: 0.1,
					duplicationPenalty: 0,
					domainBonus: 0,
					factDensity: 0.6
				}
			},
			{
				chunkId: 'chunk-4',
				totalScore: 0.75,
				recommendedBand: 'C',
				breakdown: {
					similarity: 0.7,
					quality: 0.8,
					freshness: 0.65,
					diversityPenalty: 0.15,
					duplicationPenalty: 0,
					domainBonus: 0,
					factDensity: 0.9
				}
			},
			{
				chunkId: 'chunk-5',
				totalScore: 0.68,
				recommendedBand: 'C',
				breakdown: {
					similarity: 0.65,
					quality: 0.75,
					freshness: 0.6,
					diversityPenalty: 0.2,
					duplicationPenalty: 0,
					domainBonus: 0,
					factDensity: 0.85
				}
			}
		];
	});

	describe('planExpansion', () => {
		it('should allocate chunks to bands based on risk class', () => {
			const plan = expansionPlanner.planExpansion(mockRelevanceScores, mockQueryGuard);

			expect(plan.bandA).toBeDefined();
			expect(plan.bandB).toBeDefined();
			expect(plan.bandC).toBeDefined();
			expect(plan.budgetUsage).toBeDefined();
			expect(plan.allocationStrategy).toBeDefined();
		});

		it('should allocate more budget for higher risk queries', () => {
			const lowRiskPlan = expansionPlanner.planExpansion(mockRelevanceScores, {
				...mockQueryGuard,
				riskClass: RiskClass.LOW
			});

			const highRiskPlan = expansionPlanner.planExpansion(mockRelevanceScores, {
				...mockQueryGuard,
				riskClass: RiskClass.HIGH
			});

			// High risk should get more total budget
			const lowRiskTotal = lowRiskPlan.budgetUsage.bandA.used +
								lowRiskPlan.budgetUsage.bandB.used +
								lowRiskPlan.budgetUsage.bandC.used;
			const highRiskTotal = highRiskPlan.budgetUsage.bandA.used +
								 highRiskPlan.budgetUsage.bandB.used +
								 highRiskPlan.budgetUsage.bandC.used;

			expect(highRiskTotal).toBeGreaterThan(lowRiskTotal);
		});

		it('should prioritize Band A for low risk queries', () => {
			const plan = expansionPlanner.planExpansion(mockRelevanceScores, {
				...mockQueryGuard,
				riskClass: RiskClass.LOW
			});

			// Low risk should prioritize Band A (full text)
			expect(plan.bandA.length).toBeGreaterThanOrEqual(plan.bandB.length);
			expect(plan.bandA.length).toBeGreaterThanOrEqual(plan.bandC.length);
		});

		it('should balance all bands for medium risk queries', () => {
			const plan = expansionPlanner.planExpansion(mockRelevanceScores, {
				...mockQueryGuard,
				riskClass: RiskClass.MEDIUM
			});

			// Medium risk should have balanced allocation
			expect(plan.bandA.length).toBeGreaterThan(0);
			expect(plan.bandB.length).toBeGreaterThan(0);
			expect(plan.bandC.length).toBeGreaterThan(0);
		});

		it('should emphasize Bands B and C for high risk queries', () => {
			const plan = expansionPlanner.planExpansion(mockRelevanceScores, {
				...mockQueryGuard,
				riskClass: RiskClass.HIGH
			});

			// High risk should emphasize compressed and structured data
			const totalBandBC = plan.bandB.length + plan.bandC.length;
			const totalBandA = plan.bandA.length;

			expect(totalBandBC).toBeGreaterThanOrEqual(totalBandA);
		});

		it('should respect budget constraints', () => {
			const plan = expansionPlanner.planExpansion(mockRelevanceScores, mockQueryGuard);

			// Should not exceed budget limits
			expect(plan.budgetUsage.bandA.used).toBeLessThanOrEqual(plan.budgetUsage.bandA.limit);
			expect(plan.budgetUsage.bandB.used).toBeLessThanOrEqual(plan.budgetUsage.bandB.limit);
			expect(plan.budgetUsage.bandC.used).toBeLessThanOrEqual(plan.budgetUsage.bandC.limit);
		});

		it('should handle mandatory expansion requirements', () => {
			const plan = expansionPlanner.planExpansion(mockRelevanceScores, {
				...mockQueryGuard,
				expansionHints: {
					...mockQueryGuard.expansionHints,
					mandatoryExpansion: true
				}
			});

			// Mandatory expansion should use more budget
			const totalUsed = plan.budgetUsage.bandA.used +
							plan.budgetUsage.bandB.used +
							plan.budgetUsage.bandC.used;
			expect(totalUsed).toBeGreaterThan(0);
		});

		it('should prefer recent data when required', () => {
			// Create scores with freshness information
			const scoresWithFreshness = mockRelevanceScores.map((score, index) => ({
				...score,
				breakdown: {
					...score.breakdown,
					freshness: 0.9 - (index * 0.1) // Decreasing freshness
				}
			}));

			const plan = expansionPlanner.planExpansion(scoresWithFreshness, {
				...mockQueryGuard,
				expansionHints: {
					...mockQueryGuard.expansionHints,
					requireRecentData: true
				}
			});

			// Should prioritize fresher content
			const fresherChunks = plan.bandA.slice(0, 2);
			expect(fresherChunks.length).toBeGreaterThan(0);
		});

		it('should handle authoritative source preference', () => {
			const plan = expansionPlanner.planExpansion(mockRelevanceScores, {
				...mockQueryGuard,
				expansionHints: {
					...mockQueryGuard.expansionHints,
					preferAuthoritativeSources: true
				}
			});

			// Should have a strategy that considers source authority
			expect(plan.allocationStrategy.authoritativeSources).toBe(true);
		});

		it('should adapt allocation based on query depth', () => {
			const basicPlan = expansionPlanner.planExpansion(mockRelevanceScores, {
				...mockQueryGuard,
				expansionHints: {
					...mockQueryGuard.expansionHints,
					depth: 'basic'
				}
			});

			const comprehensivePlan = expansionPlanner.planExpansion(mockRelevanceScores, {
				...mockQueryGuard,
				expansionHints: {
					...mockQueryGuard.expansionHints,
					depth: 'comprehensive'
				}
			});

			// Comprehensive should use more budget
			const basicTotal = basicPlan.budgetUsage.bandA.used +
							 basicPlan.budgetUsage.bandB.used +
							 basicPlan.budgetUsage.bandC.used;
			const comprehensiveTotal = comprehensivePlan.budgetUsage.bandA.used +
										comprehensivePlan.budgetUsage.bandB.used +
										comprehensivePlan.budgetUsage.bandC.used;

			expect(comprehensiveTotal).toBeGreaterThan(basicTotal);
		});

		it('should handle comparative queries appropriately', () => {
			const plan = expansionPlanner.planExpansion(mockRelevanceScores, {
				...mockQueryGuard,
				expansionHints: {
					...mockQueryGuard.expansionHints,
					preferComparative: true
				}
			});

			// Comparative queries should get diverse chunks
			expect(plan.allocationStrategy.diversity).toBe(true);
			expect(plan.bandA.length + plan.bandB.length + plan.bandC.length).toBeGreaterThan(2);
		});

		it('should handle empty relevance scores', () => {
			const plan = expansionPlanner.planExpansion([], mockQueryGuard);

			expect(plan.bandA).toEqual([]);
			expect(plan.bandB).toEqual([]);
			expect(plan.bandC).toEqual([]);
			expect(plan.budgetUsage.bandA.used).toBe(0);
			expect(plan.budgetUsage.bandB.used).toBe(0);
			expect(plan.budgetUsage.bandC.used).toBe(0);
		});

		it('should handle critical risk queries with maximum allocation', () => {
			const plan = expansionPlanner.planExpansion(mockRelevanceScores, {
				...mockQueryGuard,
				riskClass: RiskClass.CRITICAL,
				hardRequirements: {
					factVerification: true,
					structuredOutput: true,
					escalationPath: true
				}
			});

			// Critical risk should use maximum available budget
			const totalBudget = plan.budgetUsage.bandA.limit +
							 plan.budgetUsage.bandB.limit +
							 plan.budgetUsage.bandC.limit;
			const totalUsed = plan.budgetUsage.bandA.used +
							plan.budgetUsage.bandB.used +
							plan.budgetUsage.bandC.used;

			expect(totalUsed / totalBudget).toBeGreaterThan(0.7); // Should use at least 70% of budget
		});
	});

	describe('budget allocation', () => {
		it('should calculate character budgets correctly', () => {
			const plan = expansionPlanner.planExpansion(mockRelevanceScores, mockQueryGuard);

			// Budget limits should be reasonable
			expect(plan.budgetUsage.bandA.limit).toBeGreaterThan(0);
			expect(plan.budgetUsage.bandB.limit).toBeGreaterThan(0);
			expect(plan.budgetUsage.bandC.limit).toBeGreaterThan(0);

			// Band B budget should be larger (virtual tokens are smaller)
			expect(plan.budgetUsage.bandB.limit).toBeGreaterThan(plan.budgetUsage.bandA.limit);
		});

		it('should track budget usage accurately', () => {
			const plan = expansionPlanner.planExpansion(mockRelevanceScores, mockQueryGuard);

			// Usage should be calculated based on allocated chunks
			const expectedBandAUsage = plan.bandA.length * 1000; // Estimate 1000 chars per chunk
			const expectedBandBUsage = plan.bandB.length * 100; // Estimate 100 virtual tokens per chunk
			const expectedBandCUsage = plan.bandC.length * 50; // Estimate 50 facts per chunk

			expect(Math.abs(plan.budgetUsage.bandA.used - expectedBandAUsage)).toBeLessThan(100);
			expect(Math.abs(plan.budgetUsage.bandB.used - expectedBandBUsage)).toBeLessThan(50);
			expect(Math.abs(plan.budgetUsage.bandC.used - expectedBandCUsage)).toBeLessThan(25);
		});

		it('should provide budget efficiency metrics', () => {
			const plan = expansionPlanner.planExpansion(mockRelevanceScores, mockQueryGuard);

			expect(plan.budgetUsage.efficiency).toBeDefined();
			expect(plan.budgetUsage.efficiency).toBeGreaterThanOrEqual(0);
			expect(plan.budgetUsage.efficiency).toBeLessThanOrEqual(1);
		});
	});

	describe('allocation strategy', () => {
		it('should provide detailed strategy information', () => {
			const plan = expansionPlanner.planExpansion(mockRelevanceScores, mockQueryGuard);

			expect(plan.allocationStrategy.riskClass).toBe(mockQueryGuard.riskClass);
			expect(plan.allocationStrategy.priorities).toBeDefined();
			expect(plan.allocationStrategy.constraints).toBeDefined();
		});

		it('should adjust priorities based on risk class', () => {
			const lowRiskPlan = expansionPlanner.planExpansion(mockRelevanceScores, {
				...mockQueryGuard,
				riskClass: RiskClass.LOW
			});

			const highRiskPlan = expansionPlanner.planExpansion(mockRelevanceScores, {
				...mockQueryGuard,
				riskClass: RiskClass.HIGH
			});

			expect(lowRiskPlan.allocationStrategy.priorities).toContain('quality');
			expect(highRiskPlan.allocationStrategy.priorities).toContain('verification');
		});

		it('should document constraints appropriately', () => {
			const plan = expansionPlanner.planExpansion(mockRelevanceScores, {
				...mockQueryGuard,
				expansionHints: {
					...mockQueryGuard.expansionHints,
					requireRecentData: true,
					mandatoryExpansion: true
				}
			});

			expect(plan.allocationStrategy.constraints).toContain('freshness');
			expect(plan.allocationStrategy.constraints).toContain('mandatory');
		});
	});

	describe('edge cases', () => {
		it('should handle all chunks recommending same band', () => {
			const sameBandScores = mockRelevanceScores.map(score => ({
				...score,
				recommendedBand: 'A' as const
			}));

			const plan = expansionPlanner.planExpansion(sameBandScores, mockQueryGuard);

			// Should still allocate to other bands if beneficial
			expect(plan.bandA.length).toBeGreaterThan(0);
		});

		it('should handle very low relevance scores', () => {
			const lowRelevanceScores = mockRelevanceScores.map(score => ({
				...score,
				totalScore: 0.1,
				recommendedBand: 'C' as const
			}));

			const plan = expansionPlanner.planExpansion(lowRelevanceScores, mockQueryGuard);

			// Should be conservative with low relevance content
			const totalAllocated = plan.bandA.length + plan.bandB.length + plan.bandC.length;
			expect(totalAllocated).toBeLessThanOrEqual(mockRelevanceScores.length);
		});

		it('should handle duplicate chunk IDs', () => {
			const duplicateScores = [
				...mockRelevanceScores,
				{ ...mockRelevanceScores[0], chunkId: 'duplicate' }
			];

			const plan = expansionPlanner.planExpansion(duplicateScores, mockQueryGuard);

			// Should handle duplicates gracefully
			expect(plan.bandA.length + plan.bandB.length + plan.bandC.length).toBeLessThanOrEqual(duplicateScores.length);
		});
	});

	describe('performance', () => {
		it('should plan expansion efficiently', () => {
			const startTime = Date.now();

			for (let i = 0; i < 100; i++) {
				expansionPlanner.planExpansion(mockRelevanceScores, mockQueryGuard);
			}

			const endTime = Date.now();
			const averageTime = (endTime - startTime) / 100;

			expect(averageTime).toBeLessThan(10); // Should complete in under 10ms
		});

		it('should handle large relevance score sets', () => {
			const largeScoreSet = Array(1000).fill(null).map((_, index) => ({
				chunkId: `chunk-${index}`,
				totalScore: Math.random(),
				recommendedBand: ['A', 'B', 'C'][index % 3] as 'A' | 'B' | 'C',
				breakdown: {
					similarity: Math.random(),
					quality: Math.random(),
					freshness: Math.random(),
					diversityPenalty: Math.random() * 0.2,
					duplicationPenalty: 0,
					domainBonus: Math.random() * 0.1,
					factDensity: Math.random()
				}
			}));

			const startTime = Date.now();
			const plan = expansionPlanner.planExpansion(largeScoreSet, mockQueryGuard);
			const endTime = Date.now();

			expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
			expect(plan.bandA.length + plan.bandB.length + plan.bandC.length).toBeGreaterThan(0);
		});
	});
});