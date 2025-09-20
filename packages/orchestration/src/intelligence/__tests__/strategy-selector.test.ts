/**
 * Phase 1.2: Enhanced StrategySelector TDD Test Suite
 *
 * Test-driven development for nO Intelligence & Scheduler Core
 * Following the TDD plan: Red-Green-Refactor cycle
 *
 * Co-authored-by: brAInwav Development Team
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { StrategySelector, type TaskProfile } from '../strategy-selector.js';

describe('Phase 1.2: Enhanced StrategySelector (nO Architecture)', () => {
    let selector: StrategySelector;

    beforeEach(() => {
        selector = new StrategySelector();
    });

    describe('Basic Strategy Selection', () => {
        it('should select sequential strategy for simple tasks', () => {
            const profile: TaskProfile = {
                description: 'Simple sequential task',
                complexity: 0.2,
                canParallelize: false,
                estimatedBranches: 1,
                dataSize: 1000,
            };

            const strategy = selector.selectStrategy(profile);
            expect(strategy).toBe('sequential-safe');
        });

        it('should select parallel-coordinated for high complexity parallelizable tasks', () => {
            const profile: TaskProfile = {
                description: 'Complex parallel task',
                complexity: 0.9,
                canParallelize: true,
                estimatedBranches: 5,
                dataSize: 10000,
            };

            const strategy = selector.selectStrategy(profile);
            expect(strategy).toBe('parallel-coordinated');
        });

        it('should select hybrid for moderate complexity with some branching', () => {
            const profile: TaskProfile = {
                description: 'Moderate complexity task',
                complexity: 0.6,
                canParallelize: true,
                estimatedBranches: 2,
                dataSize: 5000,
            };

            const strategy = selector.selectStrategy(profile);
            expect(strategy).toBe('hybrid');
        });
    });

    describe('Multi-Objective Optimization', () => {
        it('should optimize for multiple objectives (performance vs reliability)', async () => {
            const objectives = [
                { type: 'performance', weight: 0.7, target: 'minimize_duration' },
                { type: 'reliability', weight: 0.3, target: 'maximize_success_rate' },
            ];

            const profile: TaskProfile = {
                description: 'Multi-objective task',
                complexity: 0.8,
                canParallelize: true,
                estimatedBranches: 3,
                dataSize: 15000,
            };

            // This will fail until multi-objective optimization is implemented
            const result = await selector.optimizeMultiObjective(profile, objectives);

            expect(result.score).toBeGreaterThanOrEqual(0);
            expect(result.score).toBeLessThanOrEqual(1);
            expect(result.recommendedStrategy).toMatch(/sequential-safe|parallel-coordinated|hybrid/);
            expect(result.tradeoffs).toBeDefined();
            expect(Array.isArray(result.tradeoffs)).toBe(true);
        });

        it('should handle conflicting objectives and find balanced solution', async () => {
            const objectives = [
                { type: 'speed', weight: 0.8, target: 'minimize_duration' },
                { type: 'resource_efficiency', weight: 0.6, target: 'minimize_resource_usage' },
                { type: 'fault_tolerance', weight: 0.4, target: 'maximize_redundancy' },
            ];

            const profile: TaskProfile = {
                description: 'Conflicting objectives task',
                complexity: 0.7,
                canParallelize: true,
                estimatedBranches: 4,
                dataSize: 25000,
            };

            // This will fail until advanced objective balancing is implemented
            const result = await selector.optimizeMultiObjective(profile, objectives);

            expect(result.score).toBeGreaterThan(0.3); // Should find reasonable balance
            expect(result.tradeoffs.length).toBeGreaterThan(0);
            expect(result.notes).toBeDefined();
            expect(Array.isArray(result.notes)).toBe(true);
        });
    });

    describe('Performance Prediction', () => {
        it('should predict performance for different strategies', async () => {
            const profile: TaskProfile = {
                description: 'Performance prediction task',
                complexity: 0.6,
                canParallelize: true,
                estimatedBranches: 3,
                dataSize: 8000,
            };

            // This will fail until performance prediction is implemented
            const prediction = await selector.predictPerformance(profile);

            expect(prediction.strategies).toBeDefined();
            expect(Array.isArray(prediction.strategies)).toBe(true);
            expect(prediction.strategies.length).toBeGreaterThanOrEqual(2);

            // Each strategy should have performance metrics
            prediction.strategies.forEach((strategy) => {
                expect(strategy.name).toMatch(/sequential-safe|parallel-coordinated|hybrid/);
                expect(strategy.predictedDurationMs).toBeGreaterThan(0);
                expect(strategy.successProbability).toBeGreaterThanOrEqual(0);
                expect(strategy.successProbability).toBeLessThanOrEqual(1);
                expect(strategy.resourceEstimate).toBeDefined();
            });
        });

        it('should predict resource requirements accurately', async () => {
            const profile: TaskProfile = {
                description: 'Resource prediction task',
                complexity: 0.8,
                canParallelize: true,
                estimatedBranches: 5,
                dataSize: 50000,
            };

            // This will fail until resource prediction is implemented
            const prediction = await selector.predictPerformance(profile);

            const parallelStrategy = prediction.strategies.find((s) => s.name === 'parallel-coordinated');
            const sequentialStrategy = prediction.strategies.find((s) => s.name === 'sequential-safe');

            expect(parallelStrategy).toBeDefined();
            expect(sequentialStrategy).toBeDefined();

            // Parallel should be faster but use more resources
            expect(parallelStrategy!.predictedDurationMs).toBeLessThan(
                sequentialStrategy!.predictedDurationMs,
            );
            expect(parallelStrategy!.resourceEstimate.concurrentAgents).toBeGreaterThan(
                sequentialStrategy!.resourceEstimate.concurrentAgents,
            );
        });
    });

    describe('Dynamic Strategy Adaptation', () => {
        it('should adapt strategy based on runtime conditions', async () => {
            const profile: TaskProfile = {
                description: 'Adaptive strategy task',
                complexity: 0.7,
                canParallelize: true,
                estimatedBranches: 3,
                dataSize: 12000,
            };

            const runtimeConditions = {
                availableAgents: 2, // Limited agents
                systemLoad: 0.8, // High system load
                networkLatency: 150, // Moderate latency
                errorRate: 0.1, // Some errors occurring
            };

            // This will fail until dynamic adaptation is implemented
            const adaptedStrategy = await selector.adaptToConditions(profile, runtimeConditions);

            expect(adaptedStrategy.strategy).toMatch(/sequential-safe|parallel-coordinated|hybrid/);
            expect(adaptedStrategy.reasoning).toBeDefined();
            expect(adaptedStrategy.confidence).toBeGreaterThanOrEqual(0);
            expect(adaptedStrategy.confidence).toBeLessThanOrEqual(1);
            expect(adaptedStrategy.adjustments).toBeDefined();
            expect(Array.isArray(adaptedStrategy.adjustments)).toBe(true);
        });

        it('should prefer sequential when resources are constrained', async () => {
            const profile: TaskProfile = {
                description: 'Resource constrained task',
                complexity: 0.9, // High complexity but limited resources
                canParallelize: true,
                estimatedBranches: 4,
                dataSize: 30000,
            };

            const constrainedConditions = {
                availableAgents: 1, // Only one agent available
                systemLoad: 0.95, // Very high system load
                networkLatency: 300, // High latency
                errorRate: 0.2, // High error rate
            };

            // This will fail until constraint handling is implemented
            const adaptedStrategy = await selector.adaptToConditions(profile, constrainedConditions);

            // Should choose sequential despite high complexity due to constraints
            expect(adaptedStrategy.strategy).toBe('sequential-safe');
            expect(adaptedStrategy.reasoning).toContain('constrained');
            expect(adaptedStrategy.adjustments).toContain('reduce_parallelism');
        });
    });

    describe('Learning and Improvement', () => {
        it('should learn from execution outcomes to improve future selections', async () => {
            const outcomes = [
                {
                    profile: {
                        description: 'Learning test 1',
                        complexity: 0.6,
                        canParallelize: true,
                        estimatedBranches: 2,
                        dataSize: 5000,
                    },
                    selectedStrategy: 'hybrid',
                    actualDurationMs: 8000,
                    predictedDurationMs: 6000,
                    successRate: 0.8,
                    resourceUsage: { memoryMB: 512, cpuPercent: 60 },
                },
                {
                    profile: {
                        description: 'Learning test 2',
                        complexity: 0.7,
                        canParallelize: true,
                        estimatedBranches: 3,
                        dataSize: 8000,
                    },
                    selectedStrategy: 'parallel-coordinated',
                    actualDurationMs: 4000,
                    predictedDurationMs: 5000,
                    successRate: 0.95,
                    resourceUsage: { memoryMB: 1024, cpuPercent: 80 },
                },
            ];

            // This will fail until learning capability is implemented
            const learningUpdate = await selector.learnFromOutcomes(outcomes);

            expect(learningUpdate.updatedHeuristics).toBeDefined();
            expect(Array.isArray(learningUpdate.updatedHeuristics)).toBe(true);
            expect(learningUpdate.confidenceImprovement).toBeGreaterThanOrEqual(0);
            expect(learningUpdate.recommendations).toBeDefined();
            expect(Array.isArray(learningUpdate.recommendations)).toBe(true);
        });

        it('should adjust complexity thresholds based on historical performance', async () => {
            const historicalData = [
                { complexity: 0.5, strategy: 'sequential-safe', performance: 0.9 },
                { complexity: 0.6, strategy: 'hybrid', performance: 0.7 },
                { complexity: 0.7, strategy: 'parallel-coordinated', performance: 0.85 },
                { complexity: 0.8, strategy: 'parallel-coordinated', performance: 0.6 },
            ];

            // This will fail until threshold adaptation is implemented
            const thresholdUpdate = await selector.updateThresholds(historicalData);

            expect(thresholdUpdate.newThresholds).toBeDefined();
            expect(thresholdUpdate.newThresholds.complexity).toBeDefined();
            expect(thresholdUpdate.newThresholds.branches).toBeDefined();
            expect(thresholdUpdate.newThresholds.dataSize).toBeDefined();
            expect(thresholdUpdate.rationale).toBeDefined();
        });
    });

    describe('Advanced Strategy Features', () => {
        it('should handle custom strategy configurations', () => {
            const customConfig = {
                parallelThreshold: 0.6,
                branchThreshold: 4,
                dataSizeThreshold: 20000,
                riskTolerance: 0.3,
            };

            selector.updateConfiguration(customConfig);

            const profile: TaskProfile = {
                description: 'Custom config task',
                complexity: 0.65,
                canParallelize: true,
                estimatedBranches: 4,
                dataSize: 25000,
            };

            // This will fail until custom configuration is implemented
            const strategy = selector.selectStrategy(profile);

            // With custom config, this should select parallel-coordinated
            expect(strategy).toBe('parallel-coordinated');
        });

        it('should provide detailed reasoning for strategy decisions', () => {
            const profile: TaskProfile = {
                description: 'Reasoning test task',
                complexity: 0.75,
                canParallelize: true,
                estimatedBranches: 3,
                dataSize: 15000,
            };

            // This will fail until reasoning capability is implemented
            const decision = selector.selectStrategyWithReasoning(profile);

            expect(decision.strategy).toMatch(/sequential-safe|parallel-coordinated|hybrid/);
            expect(decision.reasoning).toBeDefined();
            expect(decision.reasoning.factors).toBeDefined();
            expect(Array.isArray(decision.reasoning.factors)).toBe(true);
            expect(decision.reasoning.confidence).toBeGreaterThanOrEqual(0);
            expect(decision.reasoning.confidence).toBeLessThanOrEqual(1);
            expect(decision.reasoning.alternatives).toBeDefined();
        });
    });
});
