import { describe, expect, it, beforeEach } from 'vitest';
import { AdaptiveDecisionEngine } from '../adaptive-decision-engine.js';
import type { ExecutionPlan, ExecutionFeedback } from '../../contracts/no-architecture-contracts.js';

/**
 * Phase 1.5: Enhanced AdaptiveDecisionEngine Test Suite
 * 
 * Features tested:
 * - Advanced learning capabilities with pattern recognition
 * - Environment adaptation and contextual decision making
 * - Multi-objective strategy optimization
 * - Performance prediction and confidence scoring
 * - Historical data analysis and trend detection
 * - Real-time feedback integration
 * - nO architecture compliance and telemetry
 * 
 * Co-authored-by: brAInwav Development Team
 */
describe('Phase 1.5: Enhanced AdaptiveDecisionEngine (nO Architecture)', () => {
	let engine: AdaptiveDecisionEngine;

	beforeEach(() => {
		engine = new AdaptiveDecisionEngine();
	});

	describe('Advanced Learning Capabilities', () => {
		it('should learn from historical execution patterns', async () => {
			const historicalData = [
				{
					planId: 'plan-001',
					strategy: 'parallel',
					successRate: 0.9,
					duration: 5000,
					resourceUsage: { memoryMB: 512, cpuPercent: 70 },
					contextFactors: { complexity: 0.6, parallelizable: true },
				},
				{
					planId: 'plan-002',
					strategy: 'sequential',
					successRate: 0.95,
					duration: 8000,
					resourceUsage: { memoryMB: 256, cpuPercent: 40 },
					contextFactors: { complexity: 0.8, parallelizable: false },
				},
				{
					planId: 'plan-003',
					strategy: 'hierarchical',
					successRate: 0.85,
					duration: 6000,
					resourceUsage: { memoryMB: 768, cpuPercent: 60 },
					contextFactors: { complexity: 0.7, parallelizable: true },
				},
			];

			// This will fail until learning patterns are implemented
			const learningResult = await engine.learnFromHistory(historicalData);
			
			expect(learningResult.patternsIdentified).toBeDefined();
			expect(learningResult.patternsIdentified.length).toBeGreaterThan(0);
			expect(learningResult.strategyRecommendations).toBeDefined();
			expect(learningResult.confidence).toBeGreaterThan(0.6);
			expect(learningResult.learningMetrics.totalSamples).toBe(3);
			expect(learningResult.learningMetrics.patternStrength).toBeGreaterThan(0);
		});

		it('should adapt strategy based on real-time performance patterns', async () => {
			const realtimeFeedback = {
				currentExecution: {
					planId: 'plan-realtime-001',
					strategy: 'parallel',
					runningDuration: 3000,
					expectedDuration: 5000,
					currentSuccessRate: 0.7,
					resourceUtilization: { memoryMB: 600, cpuPercent: 85 },
				},
				performanceMetrics: {
					throughput: 0.8,
					latency: 2500,
					errorRate: 0.1,
					resourceEfficiency: 0.75,
				},
				environmentContext: {
					systemLoad: 0.6,
					availableMemory: 2048,
					networkLatency: 50,
					concurrentExecutions: 3,
				},
			};

			// This will fail until real-time adaptation is implemented
			const adaptation = await engine.adaptToRealTimePerformance(realtimeFeedback);
			
			expect(adaptation.recommendedStrategy).toBeDefined();
			expect(adaptation.adaptationReason).toBeDefined();
			expect(adaptation.confidence).toBeGreaterThan(0.5);
			expect(adaptation.expectedImprovement).toBeDefined();
			expect(adaptation.adjustments).toBeDefined();
			expect(adaptation.adjustments.length).toBeGreaterThan(0);
		});

		it('should perform multi-objective optimization for strategy selection', async () => {
			const objectives = [
				{ name: 'performance', weight: 0.4, target: 'maximize' },
				{ name: 'reliability', weight: 0.3, target: 'maximize' },
				{ name: 'cost', weight: 0.2, target: 'minimize' },
				{ name: 'resource_efficiency', weight: 0.1, target: 'maximize' },
			];

			const currentContext = {
				availableStrategies: ['sequential', 'parallel', 'hierarchical', 'adaptive'],
				constraints: {
					maxDuration: 10000,
					maxMemoryMB: 1024,
					maxCpuPercent: 80,
					budget: 100,
				},
				workloadCharacteristics: {
					complexity: 0.7,
					parallelizable: true,
					resourceIntensive: false,
					timeConstraint: 'moderate',
				},
			};

			// This will fail until multi-objective optimization is implemented
			const optimization = await engine.optimizeMultiObjective(objectives, currentContext);
			
			expect(optimization.selectedStrategy).toBeDefined();
			expect(optimization.objectiveScores).toBeDefined();
			expect(optimization.overallScore).toBeGreaterThan(0);
			expect(optimization.tradeoffs).toBeDefined();
			expect(optimization.reasoning).toBeDefined();
			expect(optimization.confidence).toBeGreaterThan(0.6);
		});
	});

	describe('Environment Adaptation', () => {
		it('should adapt to changing system conditions', async () => {
			const environmentChanges = [
				{
					type: 'resource_availability',
					change: 'decreased',
					details: { memoryMB: 512, cpuPercent: 30 },
					severity: 'moderate',
					timestamp: new Date().toISOString(),
				},
				{
					type: 'network_conditions',
					change: 'degraded',
					details: { latency: 200, bandwidth: '50mbps' },
					severity: 'high',
					timestamp: new Date().toISOString(),
				},
				{
					type: 'concurrent_load',
					change: 'increased',
					details: { activeExecutions: 8, queueDepth: 15 },
					severity: 'low',
					timestamp: new Date().toISOString(),
				},
			];

			// This will fail until environment adaptation is implemented
			const adaptationPlan = await engine.adaptToEnvironmentChanges(environmentChanges);
			
			expect(adaptationPlan.actions).toBeDefined();
			expect(adaptationPlan.actions.length).toBeGreaterThan(0);
			expect(adaptationPlan.prioritizedChanges).toBeDefined();
			expect(adaptationPlan.mitigationStrategies).toBeDefined();
			expect(adaptationPlan.estimatedImpact).toBeDefined();
			expect(adaptationPlan.recommendedStrategy).toBeDefined();
		});

		it('should handle context-aware decision making', async () => {
			const contextualFactors = {
				timeOfDay: '14:30',
				systemLoad: 0.75,
				userPriority: 'high',
				operationalMode: 'production',
				historicalPatterns: {
					peakHours: ['09:00-11:00', '14:00-16:00'],
					optimalStrategies: { morning: 'parallel', afternoon: 'hierarchical' },
					averagePerformance: { sequential: 0.85, parallel: 0.78, hierarchical: 0.90 },
				},
				businessConstraints: {
					costSensitive: false,
					performanceCritical: true,
					complianceRequired: true,
				},
			};

			const executionRequest = {
				complexity: 0.6,
				estimatedDuration: 7000,
				resourceRequirements: { memoryMB: 768, cpuPercent: 65 },
				priority: 'high',
			};

			// This will fail until contextual decision making is implemented
			const contextualDecision = await engine.makeContextualDecision(
				contextualFactors,
				executionRequest
			);
			
			expect(contextualDecision.selectedStrategy).toBeDefined();
			expect(contextualDecision.contextualFactors).toBeDefined();
			expect(contextualDecision.reasoning).toContain('context');
			expect(contextualDecision.confidence).toBeGreaterThan(0.7);
			expect(contextualDecision.alternativeOptions).toBeDefined();
			expect(contextualDecision.alternativeOptions.length).toBeGreaterThan(0);
		});
	});

	describe('Performance Prediction and Analysis', () => {
		it('should predict execution outcomes with confidence intervals', async () => {
			const executionPlan: Partial<ExecutionPlan> = {
				id: 'prediction-plan-001',
				strategy: 'hierarchical',
				estimatedDuration: 8000,
				steps: [
					{
						id: 'step-1',
						type: 'analysis',
						agentRequirements: ['analyst'],
						dependencies: [],
						estimatedDuration: 3000,
						parameters: {},
					},
					{
						id: 'step-2',
						type: 'execution',
						agentRequirements: ['executor'],
						dependencies: ['step-1'],
						estimatedDuration: 4000,
						parameters: {},
					},
					{
						id: 'step-3',
						type: 'validation',
						agentRequirements: ['validator'],
						dependencies: ['step-2'],
						estimatedDuration: 1000,
						parameters: {},
					},
				],
				resourceAllocation: {
					memoryMB: 512,
					cpuPercent: 70,
					timeoutMs: 10000,
				},
			};

			const historicalContext = {
				similarPlans: 15,
				averageAccuracy: 0.87,
				performanceVariability: 0.15,
			};

			// This will fail until prediction capabilities are implemented
			const prediction = await engine.predictExecutionOutcome(
				executionPlan as ExecutionPlan,
				historicalContext
			);
			
			expect(prediction.predictedDuration).toBeDefined();
			expect(prediction.confidenceInterval).toBeDefined();
			expect(prediction.confidenceInterval.lower).toBeLessThan(prediction.predictedDuration);
			expect(prediction.confidenceInterval.upper).toBeGreaterThan(prediction.predictedDuration);
			expect(prediction.successProbability).toBeGreaterThan(0.5);
			expect(prediction.successProbability).toBeLessThanOrEqual(1.0);
			expect(prediction.riskFactors).toBeDefined();
			expect(prediction.qualityScore).toBeGreaterThan(0.6);
		});

		it('should analyze trend patterns and provide insights', async () => {
			const performanceHistory = Array.from({ length: 20 }, (_, i) => ({
				timestamp: new Date(Date.now() - (20 - i) * 24 * 60 * 60 * 1000).toISOString(),
				strategy: ['sequential', 'parallel', 'hierarchical'][i % 3],
				successRate: 0.8 + Math.random() * 0.2,
				duration: 5000 + Math.random() * 3000,
				resourceEfficiency: 0.7 + Math.random() * 0.3,
				complexity: 0.5 + Math.random() * 0.5,
			}));

			// This will fail until trend analysis is implemented
			const trendAnalysis = await engine.analyzeTrends(performanceHistory);
			
			expect(trendAnalysis.trends).toBeDefined();
			expect(trendAnalysis.trends.length).toBeGreaterThan(0);
			expect(trendAnalysis.insights).toBeDefined();
			expect(trendAnalysis.predictions).toBeDefined();
			expect(trendAnalysis.recommendations).toBeDefined();
			expect(trendAnalysis.dataQuality).toBeDefined();
			expect(trendAnalysis.dataQuality.completeness).toBeGreaterThan(0.8);
		});
	});

	describe('Dynamic Learning and Adaptation', () => {
		it('should implement reinforcement learning for strategy improvement', async () => {
			const learningScenarios = [
				{
					state: { complexity: 0.5, resources: 'high', load: 'low' },
					action: 'parallel',
					reward: 0.9,
					nextState: { complexity: 0.5, resources: 'medium', load: 'medium' },
				},
				{
					state: { complexity: 0.8, resources: 'medium', load: 'high' },
					action: 'sequential',
					reward: 0.85,
					nextState: { complexity: 0.8, resources: 'low', load: 'high' },
				},
				{
					state: { complexity: 0.7, resources: 'low', load: 'medium' },
					action: 'hierarchical',
					reward: 0.78,
					nextState: { complexity: 0.7, resources: 'medium', load: 'low' },
				},
			];

			// This will fail until reinforcement learning is implemented
			const learningUpdate = await engine.updateReinforcementModel(learningScenarios);
			
			expect(learningUpdate.modelVersion).toBeDefined();
			expect(learningUpdate.improvementScore).toBeGreaterThan(0);
			expect(learningUpdate.learningRate).toBeGreaterThan(0);
			expect(learningUpdate.policyChanges).toBeDefined();
			expect(learningUpdate.convergenceMetrics).toBeDefined();
			expect(learningUpdate.nextRecommendations).toBeDefined();
		});

		it('should adapt learning parameters based on performance feedback', async () => {
			const performanceFeedback: Partial<ExecutionFeedback> = {
				planId: 'adaptive-learning-001',
				successRate: 0.75,
				averageDuration: 6500,
				resourceUtilization: {
					memoryUsage: 0.8,
					cpuUsage: 0.65,
				},
				errors: [
					{ step: 'step-2', error: 'timeout', severity: 'medium' },
					{ step: 'step-3', error: 'resource_exhaustion', severity: 'high' },
				],
				optimizationSuggestions: [
					'increase_memory_allocation',
					'consider_sequential_execution',
					'add_retry_logic',
				],
			};

			// This will fail until adaptive learning is implemented
			const adaptiveLearning = await engine.adaptLearningParameters(
				performanceFeedback as ExecutionFeedback
			);
			
			expect(adaptiveLearning.learningRateAdjustment).toBeDefined();
			expect(adaptiveLearning.explorationFactor).toBeDefined();
			expect(adaptiveLearning.parameterUpdates).toBeDefined();
			expect(adaptiveLearning.adaptationReason).toBeDefined();
			expect(adaptiveLearning.expectedImprovement).toBeGreaterThan(0);
		});
	});

	describe('Integration with nO Architecture', () => {
		it('should integrate with nO telemetry and observability', async () => {
			const telemetryEvents: any[] = [];
			const mockTelemetryCallback = (event: any) => {
				telemetryEvents.push(event);
			};

			const decisionContext = {
				planId: 'nO-integration-001',
				complexity: 0.6,
				constraints: { timeoutMs: 8000, memoryMB: 512 },
				historicalPerformance: { averageSuccess: 0.85, variance: 0.1 },
			};

			// This will fail until nO integration is implemented
			const nODecision = await engine.makeDecisionWithTelemetry(
				decisionContext,
				{ onEvent: mockTelemetryCallback }
			);
			
			expect(nODecision.strategy).toBeDefined();
			expect(nODecision.reasoning).toBeDefined();
			expect(nODecision.confidence).toBeGreaterThan(0.6);
			expect(nODecision.telemetryData).toBeDefined();
			
			// Verify telemetry events were emitted
			expect(telemetryEvents.length).toBeGreaterThan(0);
			expect(telemetryEvents.some(e => e.type === 'decision_analysis_started')).toBeTruthy();
			expect(telemetryEvents.some(e => e.type === 'decision_analysis_completed')).toBeTruthy();
		});

		it('should provide comprehensive decision audit trails', async () => {
			const auditContext = {
				requestId: 'audit-request-001',
				userId: 'user-123',
				planId: 'audit-plan-001',
				businessContext: {
					department: 'engineering',
					priority: 'high',
					complianceRequired: true,
				},
			};

			const decisionInput = {
				strategies: ['sequential', 'parallel', 'hierarchical'],
				constraints: { budget: 500, timeLimit: 10000, qualityThreshold: 0.9 },
				context: { complexity: 0.7, criticality: 'high' },
			};

			// This will fail until audit trail implementation is complete
			const auditableDecision = await engine.makeAuditableDecision(
				decisionInput,
				auditContext
			);
			
			expect(auditableDecision.decision).toBeDefined();
			expect(auditableDecision.auditTrail).toBeDefined();
			expect(auditableDecision.auditTrail.decisionId).toBeDefined();
			expect(auditableDecision.auditTrail.timestamp).toBeDefined();
			expect(auditableDecision.auditTrail.factors).toBeDefined();
			expect(auditableDecision.auditTrail.alternativesConsidered).toBeDefined();
			expect(auditableDecision.auditTrail.complianceChecks).toBeDefined();
			expect(auditableDecision.auditTrail.riskAssessment).toBeDefined();
		});
	});

	describe('Legacy Compatibility', () => {
		it('should maintain backward compatibility with basic adaptStrategy method', () => {
			const basicFeedback = {
				planId: 'legacy-plan-001',
				successRate: 0.6,
				averageDuration: 5000,
				resourceUtilization: {
					memoryUsage: 0.7,
					cpuUsage: 0.5,
				},
				errors: [],
				optimizationSuggestions: [],
			};

			// This should continue to work with existing interface
			const adjustment = engine.adaptStrategy(basicFeedback);
			
			expect(adjustment.newStrategy).toBeDefined();
			expect(adjustment.reasoning).toBeDefined();
			expect(adjustment.confidence).toBeGreaterThan(0);
			expect(adjustment.expectedImprovement).toBeGreaterThan(0);
		});
	});
});