/**
 * Planning Tools Test Suite
 * Tests DSP-integrated planning capabilities with brAInwav architecture
 * Validates planning toolchain integration with orchestration DSP patterns
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	type CreatePlanningSessionInput,
	createPlanningSessionTool,
	type ExecutePlanningPhaseInput,
	executePlanningPhaseTool,
	type GetPlanningStatusInput,
	getPlanningStatusTool,
	PlanningPhase,
	planningSessionManager,
} from '../../src/tools/planning-tools.js';

describe('Planning Tools - Phase 12 DSP Integration', () => {
	let testSessionId: string;

	beforeEach(() => {
		planningSessionManager.reset();
		vi.clearAllMocks();
	});

	describe('planning-create-session tool', () => {
		it('creates DSP planning session with brAInwav metadata', async () => {
			const input: CreatePlanningSessionInput = {
				name: 'brAInwav nO Planning Session',
				description: 'Integration test for DSP planning with nO architecture',
				workspaceId: 'test-workspace-001',
				agentId: 'test-agent-001',
				sessionId: 'test-session-001',
				complexity: 7,
				priority: 8,
				maxPlanningTime: 45000,
				adaptiveDepthEnabled: true,
			};

			const result = await createPlanningSessionTool.execute(input);

			expect(result.context).toBeDefined();
			expect(result.context.id).toBe(result.sessionId);
			expect(result.context.workspaceId).toBe('test-workspace-001');
			expect(result.context.currentPhase).toBe(PlanningPhase.INITIALIZATION);
			expect(result.context.steps).toHaveLength(0);
			expect(result.context.history).toHaveLength(0);

			expect(result.context.metadata.createdBy).toBe('brAInwav');
			expect(result.context.metadata.complexity).toBe(7);
			expect(result.context.metadata.priority).toBe(8);
			expect(result.brainwavMetadata.createdBy).toBe('brAInwav');
			expect(result.brainwavMetadata.nOArchitecture).toBe(true);
			expect(result.brainwavMetadata.dspIntegrated).toBe(true);

			expect(result.sessionId).toMatch(/^planning-\d+-[a-z0-9]+$/);

			testSessionId = result.sessionId;
		});

		it('creates session with default values for optional fields', async () => {
			const input: CreatePlanningSessionInput = {
				name: 'Default Planning Session',
			};

			const result = await createPlanningSessionTool.execute(input);

			expect(result.context.metadata.complexity).toBe(5);
			expect(result.context.metadata.priority).toBe(5);
			expect(result.brainwavMetadata.nOArchitecture).toBe(true);
		});

		it('validates required input fields', async () => {
			const input = {
				name: '',
			} as CreatePlanningSessionInput;

			await expect(createPlanningSessionTool.execute(input)).rejects.toThrow();
		});

		it('emits A2A events for session creation', async () => {
			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			const input: CreatePlanningSessionInput = {
				name: 'A2A Test Session',
				agentId: 'agent-a2a-test',
			};

			await createPlanningSessionTool.execute(input);

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('brAInwav A2A: Emitting event planning.session.created'),
				expect.objectContaining({
					agentId: 'agent-a2a-test',
					brainwavOrigin: true,
				}),
			);

			consoleSpy.mockRestore();
		});
	});

	describe('planning-execute-phase tool', () => {
		beforeEach(async () => {
			const session = await createPlanningSessionTool.execute({
				name: 'Phase Execution Test Session',
				complexity: 6,
				priority: 7,
			});
			testSessionId = session.sessionId;
		});

		it('executes DSP planning phases with brAInwav optimization', async () => {
			const phases = [
				PlanningPhase.INITIALIZATION,
				PlanningPhase.ANALYSIS,
				PlanningPhase.STRATEGY,
				PlanningPhase.EXECUTION,
				PlanningPhase.VALIDATION,
				PlanningPhase.COMPLETION,
			];

			for (const phase of phases) {
				const input: ExecutePlanningPhaseInput = {
					sessionId: testSessionId,
					phase,
					action: `Execute ${phase} phase with brAInwav DSP optimization`,
					metadata: { testPhase: phase },
				};

				const result = await executePlanningPhaseTool.execute(input);

				expect(result.sessionId).toBe(testSessionId);
				expect(result.phase).toBe(phase);
				expect(result.status).toBe('completed');
				expect(result.result).toBeDefined();
				expect(result.brainwavMetadata.executedBy).toBe('brAInwav');
				expect(result.brainwavMetadata.dspOptimized).toBe(true);

				if (phase !== PlanningPhase.COMPLETION) {
					expect(result.nextPhase).toBeDefined();
					const nextPhaseIndex = phases.indexOf(phase) + 1;
					expect(result.nextPhase).toBe(phases[nextPhaseIndex]);
				} else {
					expect(result.nextPhase).toBeUndefined();
				}
			}
		});

		it('handles phase-specific DSP execution logic', async () => {
			const testCases = [
				{
					phase: PlanningPhase.INITIALIZATION,
					expectedResult: { initialized: true, contextId: testSessionId },
				},
				{
					phase: PlanningPhase.ANALYSIS,
					expectedResult: { analyzed: true, complexity: 6 },
				},
				{
					phase: PlanningPhase.STRATEGY,
					expectedResult: { strategy: 'adaptive', planningDepth: 3 },
				},
				{
					phase: PlanningPhase.VALIDATION,
					expectedResult: { validated: true, quality: 0.85 },
				},
			];

			for (const testCase of testCases) {
				const input: ExecutePlanningPhaseInput = {
					sessionId: testSessionId,
					phase: testCase.phase,
					action: `Test ${testCase.phase} DSP logic`,
				};

				const result = await executePlanningPhaseTool.execute(input);

				expect(result.status).toBe('completed');
				expect(result.result).toEqual(expect.objectContaining(testCase.expectedResult));
			}
		});

		it('fails when session does not exist', async () => {
			const input: ExecutePlanningPhaseInput = {
				sessionId: 'non-existent-session',
				phase: PlanningPhase.INITIALIZATION,
				action: 'Should fail',
			};

			await expect(executePlanningPhaseTool.execute(input)).rejects.toThrow(
				/Session non-existent-session not found/,
			);
		});
	});

	describe('planning-get-status tool', () => {
		beforeEach(async () => {
			const session = await createPlanningSessionTool.execute({
				name: 'Status Retrieval Test Session',
				complexity: 4,
				priority: 6,
			});
			testSessionId = session.sessionId;

			const phasesToComplete = [
				PlanningPhase.INITIALIZATION,
				PlanningPhase.ANALYSIS,
				PlanningPhase.STRATEGY,
			];

			for (const phase of phasesToComplete) {
				const input: ExecutePlanningPhaseInput = {
					sessionId: testSessionId,
					phase,
					action: `Complete ${phase} phase`,
				};
				await executePlanningPhaseTool.execute(input);
			}
		});

		it('retrieves planning status with filtered context', async () => {
			const input: GetPlanningStatusInput = {
				sessionId: testSessionId,
				includeHistory: false,
				includeSteps: true,
			};

			const result = await getPlanningStatusTool.execute(input);

			expect(result.sessionId).toBe(testSessionId);
			expect(result.context.steps).not.toHaveLength(0);
			expect(result.context.history).toHaveLength(0);
			expect(result.status).toBe('active');
			expect(result.progress).toBeGreaterThan(0);
			expect(result.brainwavMetadata.queriedBy).toBe('brAInwav');
			expect(result.brainwavMetadata.dspManaged).toBe(true);
		});

		it('returns completed status after finishing phases', async () => {
			const completionInput: ExecutePlanningPhaseInput = {
				sessionId: testSessionId,
				phase: PlanningPhase.EXECUTION,
				action: 'Complete execution phase',
			};
			await executePlanningPhaseTool.execute(completionInput);

			await executePlanningPhaseTool.execute({
				sessionId: testSessionId,
				phase: PlanningPhase.VALIDATION,
				action: 'Complete validation phase',
			});

			await executePlanningPhaseTool.execute({
				sessionId: testSessionId,
				phase: PlanningPhase.COMPLETION,
				action: 'Complete completion phase',
			});

			const statusResult = await getPlanningStatusTool.execute({
				sessionId: testSessionId,
				includeHistory: true,
				includeSteps: true,
			});

			expect(statusResult.status).toBe('completed');
			expect(statusResult.progress).toBeGreaterThan(0.8);
			expect(statusResult.context.history.length).toBeGreaterThanOrEqual(0);
		});

		it('fails when session does not exist', async () => {
			const input: GetPlanningStatusInput = {
				sessionId: 'non-existent-session',
				includeHistory: true,
			};

			await expect(getPlanningStatusTool.execute(input)).rejects.toThrow(
				/Session non-existent-session not found/,
			);
		});
	});
});
