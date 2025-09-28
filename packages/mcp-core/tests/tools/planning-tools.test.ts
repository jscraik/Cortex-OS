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
} from '../../src/tools/planning-tools.js';

describe('Planning Tools - Phase 12 DSP Integration', () => {
	let testSessionId: string;

	beforeEach(() => {
		// Clear any existing planning contexts
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

			// Verify session creation
			expect(result.context).toBeDefined();
			expect(result.context.id).toBe(result.sessionId);
			expect(result.context.workspaceId).toBe('test-workspace-001');
			expect(result.context.currentPhase).toBe(PlanningPhase.INITIALIZATION);
			expect(result.context.steps).toHaveLength(0);
			expect(result.context.history).toHaveLength(0);

			// Verify brAInwav metadata
			expect(result.context.metadata.createdBy).toBe('brAInwav');
			expect(result.context.metadata.complexity).toBe(7);
			expect(result.context.metadata.priority).toBe(8);
			expect(result.brainwavMetadata.createdBy).toBe('brAInwav');
			expect(result.brainwavMetadata.nOArchitecture).toBe(true);
			expect(result.brainwavMetadata.dspIntegrated).toBe(true);

			// Verify session ID format
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
				name: '', // Empty name should fail
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

			// Verify A2A event emission
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
			// Create a planning session for testing
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

				// Verify phase execution
				expect(result.sessionId).toBe(testSessionId);
				expect(result.phase).toBe(phase);
				expect(result.status).toBe('completed');
				expect(result.result).toBeDefined();
				expect(result.brainwavMetadata.executedBy).toBe('brAInwav');
				expect(result.brainwavMetadata.dspOptimized).toBe(true);

				// Verify next phase determination
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

		it('emits A2A events for phase completion', async () => {
			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			const input: ExecutePlanningPhaseInput = {
				sessionId: testSessionId,
				phase: PlanningPhase.ANALYSIS,
				action: 'A2A event test',
			};

			await executePlanningPhaseTool.execute(input);

			// Verify A2A event emission
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('brAInwav A2A: Emitting event planning.phase.completed'),
				expect.objectContaining({
					sessionId: testSessionId,
					phase: PlanningPhase.ANALYSIS,
					success: true,
					brainwavOrigin: true,
				}),
			);

			consoleSpy.mockRestore();
		});

		it('updates planning context with phase results', async () => {
			const input: ExecutePlanningPhaseInput = {
				sessionId: testSessionId,
				phase: PlanningPhase.ANALYSIS,
				action: 'Context update test',
				metadata: { testData: 'analysis-metadata' },
			};

			await executePlanningPhaseTool.execute(input);

			// Verify context was updated
			const statusResult = await getPlanningStatusTool.execute({
				sessionId: testSessionId,
				includeSteps: true,
			});

			expect(statusResult.context.currentPhase).toBe(PlanningPhase.ANALYSIS);
			expect(statusResult.context.steps).toHaveLength(1);
			expect(statusResult.context.steps[0]?.phase).toBe(PlanningPhase.ANALYSIS);
			expect(statusResult.context.steps[0]?.action).toBe('Context update test');
			expect(statusResult.context.steps[0]?.status).toBe('completed');
		});
	});

	describe('planning-get-status tool', () => {
		beforeEach(async () => {
			// Create and execute some phases for testing
			const session = await createPlanningSessionTool.execute({
				name: 'Status Test Session',
				complexity: 5,
				priority: 6,
			});
			testSessionId = session.sessionId;

			// Execute a few phases
			await executePlanningPhaseTool.execute({
				sessionId: testSessionId,
				phase: PlanningPhase.INITIALIZATION,
				action: 'Initialize for status testing',
			});

			await executePlanningPhaseTool.execute({
				sessionId: testSessionId,
				phase: PlanningPhase.ANALYSIS,
				action: 'Analyze for status testing',
			});
		});

		it('retrieves planning status with brAInwav telemetry', async () => {
			const input: GetPlanningStatusInput = {
				sessionId: testSessionId,
				includeHistory: false,
				includeSteps: true,
			};

			const result = await getPlanningStatusTool.execute(input);

			expect(result.sessionId).toBe(testSessionId);
			expect(result.context).toBeDefined();
			expect(result.status).toBe('active');
			expect(result.progress).toBeGreaterThan(0);
			expect(result.brainwavMetadata.queriedBy).toBe('brAInwav');
			expect(result.brainwavMetadata.dspManaged).toBe(true);

			// Verify context includes steps but not history
			expect(result.context.steps).toHaveLength(2);
			expect(result.context.history).toHaveLength(0);
		});

		it('calculates progress based on completed phases', async () => {
			const result = await getPlanningStatusTool.execute({
				sessionId: testSessionId,
			});

			// 2 completed phases out of 6 total phases = 2/6 ≈ 0.33
			const totalPhases = Object.values(PlanningPhase).length;
			const completedPhases = 2;
			const expectedProgress = completedPhases / totalPhases;

			expect(result.progress).toBeCloseTo(expectedProgress, 2);
			expect(result.status).toBe('active');
		});

		it('identifies completed sessions', async () => {
			// Execute all phases to completion
			const allPhases = [
				PlanningPhase.STRATEGY,
				PlanningPhase.EXECUTION,
				PlanningPhase.VALIDATION,
				PlanningPhase.COMPLETION,
			];

			for (const phase of allPhases) {
				await executePlanningPhaseTool.execute({
					sessionId: testSessionId,
					phase,
					action: `Complete ${phase} phase`,
				});
			}

			const result = await getPlanningStatusTool.execute({
				sessionId: testSessionId,
			});

			expect(result.status).toBe('completed');
			expect(result.progress).toBe(1.0);
			expect(result.context.currentPhase).toBe(PlanningPhase.COMPLETION);
		});

		it('respects includeHistory and includeSteps flags', async () => {
			// Test with no steps or history
			const minimalResult = await getPlanningStatusTool.execute({
				sessionId: testSessionId,
				includeHistory: false,
				includeSteps: false,
			});

			expect(minimalResult.context.steps).toHaveLength(0);
			expect(minimalResult.context.history).toHaveLength(0);

			// Test with both included
			const fullResult = await getPlanningStatusTool.execute({
				sessionId: testSessionId,
				includeHistory: true,
				includeSteps: true,
			});

			expect(fullResult.context.steps).toHaveLength(2);
			// History would be populated if we had decision/outcome data
		});

		it('fails when session does not exist', async () => {
			const input: GetPlanningStatusInput = {
				sessionId: 'non-existent-session',
			};

			await expect(getPlanningStatusTool.execute(input)).rejects.toThrow(
				/Session non-existent-session not found/,
			);
		});
	});

	describe('DSP integration and brAInwav branding', () => {
		it('maintains brAInwav branding across all planning operations', async () => {
			const session = await createPlanningSessionTool.execute({
				name: 'Branding Test Session',
			});

			// Verify create branding
			expect(session.context.metadata.createdBy).toBe('brAInwav');
			expect(session.brainwavMetadata.createdBy).toBe('brAInwav');

			// Execute phase and verify branding
			const phaseResult = await executePlanningPhaseTool.execute({
				sessionId: session.sessionId,
				phase: PlanningPhase.INITIALIZATION,
				action: 'Branding test execution',
			});

			expect(phaseResult.brainwavMetadata.executedBy).toBe('brAInwav');

			// Get status and verify branding
			const statusResult = await getPlanningStatusTool.execute({
				sessionId: session.sessionId,
			});

			expect(statusResult.brainwavMetadata.queriedBy).toBe('brAInwav');
		});

		it('includes nO architecture indicators in all responses', async () => {
			const session = await createPlanningSessionTool.execute({
				name: 'nO Architecture Test',
			});

			expect(session.brainwavMetadata.nOArchitecture).toBe(true);
			expect(session.brainwavMetadata.dspIntegrated).toBe(true);

			const phaseResult = await executePlanningPhaseTool.execute({
				sessionId: session.sessionId,
				phase: PlanningPhase.ANALYSIS,
				action: 'nO architecture test',
			});

			expect(phaseResult.brainwavMetadata.dspOptimized).toBe(true);

			const statusResult = await getPlanningStatusTool.execute({
				sessionId: session.sessionId,
			});

			expect(statusResult.brainwavMetadata.dspManaged).toBe(true);
		});

		it('validates DSP phase sequencing and context isolation', async () => {
			const session = await createPlanningSessionTool.execute({
				name: 'DSP Sequencing Test',
				workspaceId: 'isolated-workspace-001',
			});

			// Execute phases in sequence
			const phases = [PlanningPhase.INITIALIZATION, PlanningPhase.ANALYSIS, PlanningPhase.STRATEGY];

			for (const [index, phase] of phases.entries()) {
				const _result = await executePlanningPhaseTool.execute({
					sessionId: session.sessionId,
					phase,
					action: `DSP sequence step ${index + 1}`,
				});

				// Verify context isolation (workspace ID preserved)
				const statusResult = await getPlanningStatusTool.execute({
					sessionId: session.sessionId,
				});

				expect(statusResult.context.workspaceId).toBe('isolated-workspace-001');
				expect(statusResult.context.currentPhase).toBe(phase);
			}
		});

		it('logs brAInwav operations for observability', async () => {
			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			const session = await createPlanningSessionTool.execute({
				name: 'Observability Test',
			});

			await executePlanningPhaseTool.execute({
				sessionId: session.sessionId,
				phase: PlanningPhase.INITIALIZATION,
				action: 'Observability test execution',
			});

			await getPlanningStatusTool.execute({
				sessionId: session.sessionId,
			});

			// Verify brAInwav branding in console outputs
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('brAInwav Planning: Created DSP planning session'),
			);
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('brAInwav Planning: Executed DSP phase'),
			);
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('brAInwav Planning: Retrieved status for DSP session'),
			);

			consoleSpy.mockRestore();
		});

		it('handles session context sharing between tools', async () => {
			const session = await createPlanningSessionTool.execute({
				name: 'Context Sharing Test',
				complexity: 8,
			});

			// Execute phase through one tool
			await executePlanningPhaseTool.execute({
				sessionId: session.sessionId,
				phase: PlanningPhase.INITIALIZATION,
				action: 'Context sharing test',
			});

			// Verify context is accessible through status tool
			const statusResult = await getPlanningStatusTool.execute({
				sessionId: session.sessionId,
				includeSteps: true,
			});

			expect(statusResult.context.metadata.complexity).toBe(8);
			expect(statusResult.context.steps).toHaveLength(1);
			expect(statusResult.context.steps[0]?.action).toBe('Context sharing test');
		});
	});
});
