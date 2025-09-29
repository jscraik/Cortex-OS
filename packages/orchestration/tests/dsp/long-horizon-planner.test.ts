/**
 * Long-Horizon Planner Test Suite
 * Tests planning phases, adaptive depth, and context isolation
 * Validates brAInwav-enhanced DSP patterns for complex task coordination
 */

import type { SecurityIntegrationResult, SecurityIntegrationService } from '@cortex-os/cortex-sec';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	LongHorizonPlanner,
	type LongHorizonPlannerConfig,
	type LongHorizonTask,
	type PlanningResult,
} from '../../src/lib/long-horizon-planner.js';
import type { OrchestrationMetrics } from '../../src/observability/custom-metrics.js';
import type { PlanningContext } from '../../src/utils/dsp.js';
import { PlanningPhase } from '../../src/utils/dsp.js';

// Test-only private interface to safely access private internals without using `any`
type PlannerPrivate = {
	dsp: {
		initializePlanning: (id: string, complexity: number, priority: number) => PlanningContext;
	};
	persistPlanningEvent: (eventType: string, eventData: Record<string, unknown>) => Promise<void>;
	runPhase: (
		phase: PlanningPhase,
		context: PlanningContext,
		executor: (p: PlanningPhase, c: PlanningContext) => Promise<unknown>,
		task: LongHorizonTask,
	) => Promise<{ phaseDuration: number; result?: unknown; error?: string }>;
	applySecurityEvaluation: (
		task: LongHorizonTask,
		context: PlanningContext,
	) => SecurityIntegrationResult;
	executePhaseAndUpdateResult: (
		phase: PlanningPhase,
		context: PlanningContext,
		executor: (p: PlanningPhase, c: PlanningContext) => Promise<unknown>,
		task: LongHorizonTask,
		result: PlanningResult,
	) => Promise<boolean>;
	recommendComplexity: (task: LongHorizonTask) => string[];
	recommendFailures: (result: PlanningResult) => string[];
	recordPersistenceEvent: (eventType: string, eventData: Record<string, unknown>) => Promise<void>;
	metrics: OrchestrationMetrics;
};

describe('Long-Horizon Planner - Phase 11 DSP Integration', () => {
	let planner: LongHorizonPlanner;
	let mockTask: LongHorizonTask;
	let config: LongHorizonPlannerConfig;

	beforeEach(() => {
		config = {
			enableContextIsolation: true,
			maxPlanningTime: 10000,
			adaptiveDepthEnabled: true,
			persistenceEnabled: true,
			initialStep: 0,
			maxStep: 10,
			planningDepth: 3,
			contextIsolation: true,
		};

		planner = new LongHorizonPlanner(config);

		mockTask = {
			id: 'test-task-001',
			description: 'Complex multi-phase planning test',
			complexity: 7,
			priority: 8,
			estimatedDuration: 5000,
			dependencies: [],
			metadata: {
				testType: 'long-horizon',
				brainwavOrigin: 'test-suite',
			},
		};
	});

	describe('Planning Phases Validation', () => {
		it('should execute all planning phases in correct order', async () => {
			const mockExecutor = vi.fn();
			const expectedPhases = [
				PlanningPhase.INITIALIZATION,
				PlanningPhase.ANALYSIS,
				PlanningPhase.STRATEGY,
				PlanningPhase.EXECUTION,
				PlanningPhase.VALIDATION,
				PlanningPhase.COMPLETION,
			];

			// Mock executor to succeed for all phases
			mockExecutor.mockResolvedValue({ success: true });

			const result = await planner.planTask(mockTask, mockExecutor);

			expect(result.success).toBe(true);
			expect(result.phases).toHaveLength(6);

			expectedPhases.forEach((phase, index) => {
				expect(result.phases[index].phase).toBe(phase);
				expect(result.phases[index].error).toBeUndefined();
			});

			expect(result.brainwavMetadata.createdBy).toBe('brAInwav');
			expect(result.brainwavMetadata.timestamp).toBeInstanceOf(Date);
		});

		it('should handle phase failures gracefully with proper recovery', async () => {
			const mockExecutor = vi.fn();

			// Make STRATEGY phase fail
			mockExecutor.mockImplementation((phase: PlanningPhase) => {
				if (phase === PlanningPhase.STRATEGY) {
					return Promise.reject(new Error('brAInwav test: Strategy phase failed'));
				}
				return Promise.resolve({ success: true });
			});

			const result = await planner.planTask(mockTask, mockExecutor);

			// Should continue with other phases despite strategy failure
			expect(result.phases.some((p) => p.phase === PlanningPhase.STRATEGY && p.error)).toBe(true);
			expect(result.phases.some((p) => p.phase === PlanningPhase.EXECUTION)).toBe(true);
			expect(result.phases.some((p) => p.phase === PlanningPhase.VALIDATION)).toBe(true);

			// Overall result should reflect partial failure
			expect(result.success).toBe(false);
		});

		it('should stop on critical phase failures', async () => {
			const mockExecutor = vi.fn();

			// Make INITIALIZATION phase fail (critical phase)
			mockExecutor.mockImplementation((phase: PlanningPhase) => {
				if (phase === PlanningPhase.INITIALIZATION) {
					return Promise.reject(new Error('brAInwav test: Critical initialization failed'));
				}
				return Promise.resolve({ success: true });
			});

			const result = await planner.planTask(mockTask, mockExecutor);

			// Should stop after initialization failure
			expect(result.phases).toHaveLength(1);
			expect(result.phases[0].phase).toBe(PlanningPhase.INITIALIZATION);
			expect(result.phases[0].error).toContain('Critical initialization failed');
			expect(result.success).toBe(false);
		});

		it('should timeout phases that exceed time limits', async () => {
			const shortTimeoutConfig = { ...config, maxPlanningTime: 100 };
			const timeoutPlanner = new LongHorizonPlanner(shortTimeoutConfig);

			const mockExecutor = vi.fn();

			// Make executor hang for longer than timeout
			mockExecutor.mockImplementation(() => hangPromise(200));

			const result = await timeoutPlanner.planTask(mockTask, mockExecutor);

			expect(result.success).toBe(false);
			expect(result.phases[0].error).toContain('timed out');
		});
	});

	describe('Adaptive Depth Calculations', () => {
		it('should calculate adaptive depth based on task complexity', () => {
			const stats = planner.getStats();
			expect(stats.adaptiveDepth).toBeGreaterThan(0);

			// High complexity task should increase adaptive depth
			const highComplexityTask = { ...mockTask, complexity: 10, priority: 9 };
			planner.planTask(highComplexityTask, vi.fn().mockResolvedValue({}));

			const newStats = planner.getStats();
			expect(newStats.adaptiveDepth).toBeGreaterThanOrEqual(stats.adaptiveDepth);
		});

		it('should adapt depth based on priority and complexity', async () => {
			const lowComplexityTask = { ...mockTask, complexity: 2, priority: 3 };
			const highComplexityTask = { ...mockTask, complexity: 9, priority: 9 };

			const mockExecutor = vi.fn().mockResolvedValue({ success: true });

			// Plan both tasks and compare adaptive depths
			await planner.planTask(lowComplexityTask, mockExecutor);
			const lowDepthStats = planner.getStats();

			await planner.planTask(highComplexityTask, mockExecutor);
			const highDepthStats = planner.getStats();

			expect(highDepthStats.adaptiveDepth).toBeGreaterThan(lowDepthStats.adaptiveDepth);
		});

		it('should cap adaptive depth at reasonable limits', async () => {
			const extremeTask = { ...mockTask, complexity: 15, priority: 10 };
			const mockExecutor = vi.fn().mockResolvedValue({ success: true });

			await planner.planTask(extremeTask, mockExecutor);
			const stats = planner.getStats();

			// Should cap depth to prevent resource exhaustion
			expect(stats.adaptiveDepth).toBeLessThanOrEqual(15);
		});
	});

	describe('Context Isolation', () => {
		it('should isolate contexts when enabled', async () => {
			const firstTask = { ...mockTask, id: 'task-001' };
			const secondTask = { ...mockTask, id: 'task-002' };
			const mockExecutor = vi.fn().mockResolvedValue({ success: true });

			// Plan first task
			await planner.planTask(firstTask, mockExecutor);
			const firstContext = planner.getCurrentContext();

			// Plan second task - should create new isolated context
			await planner.planTask(secondTask, mockExecutor);
			const secondContext = planner.getCurrentContext();

			expect(firstContext?.id).toBe('task-001');
			expect(secondContext?.id).toBe('task-002');
			expect(firstContext?.id).not.toBe(secondContext?.id);
		});

		it('should clear context for proper isolation', () => {
			const mockExecutor = vi.fn().mockResolvedValue({ success: true });

			planner.planTask(mockTask, mockExecutor);
			expect(planner.getCurrentContext()).toBeDefined();

			planner.clearContext();
			expect(planner.getCurrentContext()).toBeUndefined();
		});

		it('should maintain context history within isolation boundaries', async () => {
			const mockExecutor = vi.fn().mockResolvedValue({ success: true });

			await planner.planTask(mockTask, mockExecutor);
			const context = planner.getCurrentContext();

			expect(context?.history).toBeDefined();
			expect(context?.history.length).toBeGreaterThan(0);
			expect(context?.metadata.createdBy).toBe('brAInwav');
		});
	});

	describe('Persistence Hooks Integration', () => {
		it('should track planning metadata for persistence', async () => {
			const mockExecutor = vi.fn().mockResolvedValue({ success: true });

			const result = await planner.planTask(mockTask, mockExecutor);

			expect(result.brainwavMetadata).toBeDefined();
			expect(result.brainwavMetadata.createdBy).toBe('brAInwav');
			expect(result.brainwavMetadata.version).toBeDefined();
			expect(result.brainwavMetadata.timestamp).toBeInstanceOf(Date);
		});

		it('should provide planning statistics for monitoring', () => {
			const stats = planner.getStats();

			expect(stats).toHaveProperty('hasActiveContext');
			expect(stats).toHaveProperty('currentStep');
			expect(stats).toHaveProperty('adaptiveDepth');
			expect(typeof stats.hasActiveContext).toBe('boolean');
			expect(typeof stats.currentStep).toBe('number');
			expect(typeof stats.adaptiveDepth).toBe('number');
		});

		it('should generate actionable recommendations', async () => {
			const complexTask = { ...mockTask, complexity: 9, priority: 9 };
			const mockExecutor = vi.fn().mockResolvedValue({ success: true });

			const result = await planner.planTask(complexTask, mockExecutor);

			expect(result.recommendations).toBeDefined();
			expect(result.recommendations.length).toBeGreaterThan(0);
			expect(result.recommendations.some((r) => r.includes('brAInwav') || r.length > 0)).toBe(true);
		});

		it('should emit planner persistence metric for planning start and completion', async () => {
			const persistSpy = vi
				.spyOn(planner as unknown as PlannerPrivate, 'persistPlanningEvent')
				.mockResolvedValue(undefined);
			const metricsSpy = vi.spyOn(
				(planner as unknown as PlannerPrivate).metrics as unknown as OrchestrationMetrics,
				'recordPlannerPersistenceEvent',
			);

			await planner.planTask(mockTask, vi.fn().mockResolvedValue({ success: true }));

			expect(metricsSpy).toHaveBeenCalledWith(
				'planning_started',
				'success',
				undefined,
				expect.any(Number),
			);
			expect(metricsSpy).toHaveBeenCalledWith(
				'planning_completed',
				'success',
				undefined,
				expect.any(Number),
			);

			persistSpy.mockRestore();
			metricsSpy.mockRestore();
		});

		it('should emit planner persistence metric with error on persistence failure', async () => {
			const err = new Error('persistence-down');
			const persistSpy = vi
				.spyOn(planner as unknown as PlannerPrivate, 'persistPlanningEvent')
				.mockRejectedValue(err);
			const metricsSpy = vi.spyOn(
				(planner as unknown as PlannerPrivate).metrics as unknown as OrchestrationMetrics,
				'recordPlannerPersistenceEvent',
			);

			await planner.planTask(mockTask, vi.fn().mockResolvedValue({ success: true }));

			expect(metricsSpy).toHaveBeenCalled();
			// At least one of the invocations should be an error recorded for a persistence failure
			expect(
				metricsSpy.mock.calls.some(
					(c) => c[1] === 'error' && String(c[2]).includes('persistence-down'),
				),
			).toBe(true);

			persistSpy.mockRestore();
			metricsSpy.mockRestore();
		});
	});

	describe('brAInwav Branding Integration', () => {
		it('should include brAInwav branding in all outputs', async () => {
			const mockExecutor = vi.fn().mockResolvedValue({ success: true });
			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

			await planner.planTask(mockTask, mockExecutor);

			// Check console outputs include brAInwav branding
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('brAInwav Long-Horizon Planner'),
			);

			consoleSpy.mockRestore();
		});

		it('should maintain brAInwav metadata throughout planning lifecycle', async () => {
			const mockExecutor = vi.fn().mockResolvedValue({ success: true });

			await planner.planTask(mockTask, mockExecutor);
			const context = planner.getCurrentContext();

			expect(context?.metadata.createdBy).toBe('brAInwav');
			expect(context?.metadata.updatedAt).toBeInstanceOf(Date);
		});
	});

	describe('runPhase Helper', () => {
		it('runPhase helper should execute a phase, record start and completion persistence events', async () => {
			const mockExecutor = vi.fn().mockResolvedValue({ success: true });
			const persistSpy = vi
				.spyOn(planner as unknown as PlannerPrivate, 'persistPlanningEvent')
				.mockResolvedValue(undefined);

			// Initialize a context via the private dsp for isolated helper testing
			const context = (planner as unknown as PlannerPrivate).dsp.initializePlanning(
				mockTask.id,
				mockTask.complexity,
				mockTask.priority,
			);

			const outcome = await (planner as unknown as PlannerPrivate).runPhase(
				PlanningPhase.INITIALIZATION,
				context,
				mockExecutor,
				mockTask,
			);

			expect(outcome.result).toBeDefined();
			expect(outcome.error).toBeUndefined();
			expect(outcome.phaseDuration).toBeGreaterThanOrEqual(0);
			expect(persistSpy).toHaveBeenCalledWith('phase_started', expect.any(Object));
			expect(persistSpy).toHaveBeenCalledWith('phase_completed', expect.any(Object));

			persistSpy.mockRestore();
		});

		it('runPhase helper should handle executor failures and record phase_failed', async () => {
			const mockExecutor = vi.fn().mockRejectedValue(new Error('simulated fail'));
			const persistSpy = vi
				.spyOn(planner as unknown as PlannerPrivate, 'persistPlanningEvent')
				.mockResolvedValue(undefined);

			const context = (planner as unknown as PlannerPrivate).dsp.initializePlanning(
				mockTask.id,
				mockTask.complexity,
				mockTask.priority,
			);

			const outcome = await (planner as unknown as PlannerPrivate).runPhase(
				PlanningPhase.STRATEGY,
				context,
				mockExecutor,
				mockTask,
			);

			expect(outcome.result).toBeUndefined();
			expect(outcome.error).toContain('simulated fail');
			expect(outcome.phaseDuration).toBeGreaterThanOrEqual(0);
			expect(persistSpy).toHaveBeenCalledWith('phase_started', expect.any(Object));
			expect(persistSpy).toHaveBeenCalledWith('phase_failed', expect.any(Object));

			persistSpy.mockRestore();
		});
	});

	describe('applySecurityEvaluation Helper', () => {
		it('applySecurityEvaluation sets compliance when security service returns data', () => {
			// Prepare a mock security service that returns a deterministic evaluation
			const fakeEval = {
				standards: ['ISO-9001'],
				lastCheckedAt: new Date(),
				aggregateRisk: 3,
				outstandingViolations: [],
				summary: 'All checks passed',
			} as unknown as SecurityIntegrationResult;

			const secureService = {
				evaluate: vi.fn().mockReturnValue(fakeEval),
			} as unknown as SecurityIntegrationService;
			const confWithSec: LongHorizonPlannerConfig = {
				...config,
				securityIntegrationService: secureService,
			};
			const localPlanner = new LongHorizonPlanner(confWithSec);

			const context = (localPlanner as unknown as PlannerPrivate).dsp.initializePlanning(
				mockTask.id,
				mockTask.complexity,
				mockTask.priority,
			);

			const res = (localPlanner as unknown as PlannerPrivate).applySecurityEvaluation(
				mockTask,
				context,
			);

			expect(res).toBeDefined();
			expect(res).toEqual(fakeEval);
			expect(context.compliance).toBeDefined();
			expect(
				context.preferences.notes.some((n: string) => n.includes('brAInwav security summary')),
			).toBe(true);
		});

		it('applySecurityEvaluation records failure and returns fallback when security service throws', () => {
			const failingService = {
				evaluate: vi.fn().mockImplementation(() => {
					throw new Error('connector-error');
				}),
			} as unknown as SecurityIntegrationService;
			const confWithFail: LongHorizonPlannerConfig = {
				...config,
				securityIntegrationService: failingService,
			};
			const localPlanner = new LongHorizonPlanner(confWithFail);

			const context = (localPlanner as unknown as PlannerPrivate).dsp.initializePlanning(
				mockTask.id,
				mockTask.complexity,
				mockTask.priority,
			);

			const res = (localPlanner as unknown as PlannerPrivate).applySecurityEvaluation(
				mockTask,
				context,
			);

			expect(res).toBeDefined();
			expect(res.summary).toContain('Security evaluation failed');
			expect(context.compliance).toBeDefined();
			expect(
				context.preferences.notes.some((n: string) => n.includes('security evaluation failed')),
			).toBe(true);
		});
	});

	describe('Phase Execution Orchestration helper', () => {
		it('executePhaseAndUpdateResult pushes a successful phase and updates DSP', async () => {
			const mockExecutor = vi.fn();
			const persistSpy = vi
				.spyOn(planner as unknown as PlannerPrivate, 'persistPlanningEvent')
				.mockResolvedValue(undefined);

			// Mock runPhase to return success
			vi.spyOn(planner as unknown as PlannerPrivate, 'runPhase').mockResolvedValue({
				phaseDuration: 12,
				result: { ok: true },
			});

			const context = (planner as unknown as PlannerPrivate).dsp.initializePlanning(
				mockTask.id,
				mockTask.complexity,
				mockTask.priority,
			);
			const result: PlanningResult = {
				taskId: mockTask.id,
				success: true,
				phases: [],
				totalDuration: 0,
				adaptiveDepth: 0,
				recommendations: [],
				brainwavMetadata: { createdBy: 'brAInwav', version: '1.0.0', timestamp: new Date() },
				security: {} as SecurityIntegrationResult,
			};

			const cont = await (planner as unknown as PlannerPrivate).executePhaseAndUpdateResult(
				PlanningPhase.EXECUTION,
				context,
				mockExecutor,
				mockTask,
				result,
			);
			expect(cont).toBe(true);
			expect(result.phases.length).toBe(1);
			expect(result.phases[0].phase).toBe(PlanningPhase.EXECUTION);
			expect((planner as unknown as PlannerPrivate).dsp).toBeDefined();
			persistSpy.mockRestore();
		});

		it('executePhaseAndUpdateResult records failure and stops on critical phase', async () => {
			const mockExecutor = vi.fn();
			// Mock runPhase to return error
			vi.spyOn(planner as unknown as PlannerPrivate, 'runPhase').mockResolvedValue({
				phaseDuration: 5,
				error: 'simulated fail',
			});

			const context = (planner as unknown as PlannerPrivate).dsp.initializePlanning(
				mockTask.id,
				mockTask.complexity,
				mockTask.priority,
			);
			const result: PlanningResult = {
				taskId: mockTask.id,
				success: true,
				phases: [],
				totalDuration: 0,
				adaptiveDepth: 0,
				recommendations: [],
				brainwavMetadata: { createdBy: 'brAInwav', version: '1.0.0', timestamp: new Date() },
				security: {} as SecurityIntegrationResult,
			};

			const cont = await (planner as unknown as PlannerPrivate).executePhaseAndUpdateResult(
				PlanningPhase.INITIALIZATION,
				context,
				mockExecutor,
				mockTask,
				result,
			);
			expect(cont).toBe(false);
			expect(result.success).toBe(false);
			expect(result.phases.length).toBe(1);
			expect(result.phases[0].error).toContain('simulated fail');
		});
	});

	describe('Recommendations helpers', () => {
		it('recommendComplexity returns recommendation for high complexity tasks', () => {
			const recs = (planner as unknown as PlannerPrivate).recommendComplexity({
				...mockTask,
				complexity: 9,
			});
			expect(recs.length).toBeGreaterThan(0);
			expect(recs[0]).toContain('smaller subtasks');
		});

		it('recommendFailures returns suggestions when phases have errors', () => {
			const fakeResult: PlanningResult = {
				taskId: mockTask.id,
				success: false,
				phases: [{ phase: PlanningPhase.ANALYSIS, duration: 10, error: 'err' }],
				totalDuration: 10,
				adaptiveDepth: 1,
				recommendations: [],
				brainwavMetadata: { createdBy: 'brAInwav', version: '1.0.0', timestamp: new Date() },
				security: {} as SecurityIntegrationResult,
			};

			const recs = (planner as unknown as PlannerPrivate).recommendFailures(fakeResult);
			expect(recs.length).toBeGreaterThan(0);
			expect(recs[0]).toContain('Review and retry failed phases');
		});
	});

	/**
	 * Test helper to simulate a long-running executor by returning a promise that resolves after a delay.
	 */
	function hangPromise(ms = 200) {
		return new Promise<void>((resolve) => setTimeout(resolve, ms));
	}
});
