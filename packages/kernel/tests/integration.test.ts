/**
 * @file integration.test.ts
 * @description Integration tests for Cortex Kernel with PRP runner
 * @author Cortex-OS Team
 * @version 1.0.0
 * @status TDD-CRITICAL
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { createKernel } from '../src/graph-simple.js';

describe('Cortex Kernel Integration', () => {
	let kernel: ReturnType<typeof createKernel>;
	let mockOrchestrator: { getNeuronCount: () => number };

	beforeEach(() => {
		mockOrchestrator = {
			getNeuronCount: () => 5,
		};
		kernel = createKernel(mockOrchestrator);
	});

	describe('Basic Integration', () => {
		it('should successfully run a complete PRP workflow', async () => {
			const blueprint = {
				title: 'Integration Test Project',
				description: 'A test project to validate kernel integration',
				requirements: [
					'Feature A',
					'Feature B',
					'Testing',
					'Security authentication',
					'User interface design',
					'Architecture design',
					'Accessibility compliance'
				],
			};

			const result = await kernel.runPRPWorkflow(blueprint, {
				runId: 'integration-test-001',
			});

			// Verify final state
			expect(result.phase).toBe('completed');
			expect(result.runId).toBe('integration-test-001');
			expect(result.blueprint.title).toBe('Integration Test Project');

			// Verify metadata
			expect(result.metadata.startTime).toBeDefined();
			expect(result.metadata.endTime).toBeDefined();

			// Verify validation gates
			expect(result.gates.G0?.status).toBe('passed');
			expect(result.gates.G2?.status).toBe('passed');
			expect(result.gates.G5?.status).toBe('passed');

			// Verify cerebrum decision
			expect(result.cerebrum?.decision).toBe('promote');
			expect(result.cerebrum?.confidence).toBeGreaterThan(0.9);
		});

		it('should handle orchestrator integration correctly', async () => {
			const blueprint = {
				title: 'Orchestrator Integration',
				description: 'Test orchestrator method calls',
				requirements: ['Integration validation'],
			};

			const result = await kernel.runPRPWorkflow(blueprint);

			// Should successfully get neuron count from orchestrator directly
			expect(kernel.getOrchestrator().getNeuronCount()).toBe(5);

			// Workflow should complete successfully
			expect(result.phase).toBe('completed');
		});
	});

	describe('Error Handling', () => {
		it('should gracefully handle workflow errors', async () => {
			// Create a kernel that will simulate an error
			const errorOrchestrator = {
				getNeuronCount: () => {
					throw new Error('Simulated orchestrator error');
				},
			};

			const errorKernel = createKernel(errorOrchestrator);

			const blueprint = {
				title: 'Error Test',
				description: 'Test error handling',
				requirements: ['Error simulation'],
			};

			// This should not throw but should handle the error gracefully
			const result = await errorKernel.runPRPWorkflow(blueprint);

			// Should complete but may recycle due to error
			expect(['completed', 'recycled']).toContain(result.phase);
		});
	});

	describe('Workflow Phases', () => {
		it('should execute all three main phases', async () => {
			const blueprint = {
				title: 'Phase Test',
				description: 'Test all workflow phases',
				requirements: ['Phase validation'],
			};

			const _result = await kernel.runPRPWorkflow(blueprint, {
				runId: 'phase-test-001',
			});

			const history = kernel.getExecutionHistory('phase-test-001');
			const phases = history.map((state) => state.phase);

			// Should include the main workflow phases
			expect(phases).toContain('strategy');
			expect(phases.some((p) => p === 'build')).toBe(true);
			expect(phases.some((p) => p === 'evaluation')).toBe(true);
			expect(phases[phases.length - 1]).toBe('completed');
		});

		it('should validate state transitions correctly', async () => {
			const blueprint = {
				title: 'Transition Test',
				description: 'Test state transition validation',
				requirements: ['State machine validation'],
			};

			const result = await kernel.runPRPWorkflow(blueprint);

			// Final state should be valid
			expect(['completed', 'recycled']).toContain(result.phase);

			// All gates should be present for completed workflows
			if (result.phase === 'completed') {
				expect(result.gates.G0).toBeDefined();
				expect(result.gates.G2).toBeDefined();
				expect(result.gates.G5).toBeDefined();
			}
		});
	});

	describe('Behavior Extensions', () => {
		it('should capture incremental state updates', async () => {
			const { ExampleCaptureSystem, BehaviorExtensionManager, createInitialPRPState } =
				await import('../src/index.js');

			const captureSystem = new ExampleCaptureSystem();
			const manager = new BehaviorExtensionManager(captureSystem);
			// Remove default extensions for a controlled test environment
			manager.clearExtensions();

			manager.registerExtension({
				id: 'ext1',
				name: 'Extension One',
				description: 'Adds validation adjustment',
				trigger: () => true,
				modify: async () => ({
					modified: true,
					changes: [
						{
							type: 'validation_adjustment',
							description: 'step one',
							impact: 'low',
							parameters: { step: 'one' },
						},
					],
					reasoning: 'first',
				}),
				confidence: 1,
				basedOnPatterns: [],
			});

			manager.registerExtension({
				id: 'ext2',
				name: 'Extension Two',
				description: 'Adds gate modification',
				trigger: () => true,
				modify: async () => ({
					modified: true,
					changes: [
						{
							type: 'gate_modification',
							description: 'step two',
							impact: 'low',
							parameters: { step: 'two' },
						},
					],
					reasoning: 'second',
				}),
				confidence: 1,
				basedOnPatterns: [],
			});

			const blueprint = {
				title: 'Incremental Test',
				description: 'Verifies state updates',
				requirements: [],
			};
			const initialState = createInitialPRPState(blueprint, {
				id: 'state-1',
				runId: 'run-1',
			});

			await manager.applyExtensions(initialState);

			const examples = captureSystem.getExamples();
			expect(examples).toHaveLength(2);
			expect(examples[0].context.inputState.metadata?.validationAdjustments).toBeUndefined();
			expect(examples[0].outcome.resultingState.metadata.validationAdjustments).toEqual({
				step: 'one',
			});
			expect(examples[1].context.inputState.metadata.validationAdjustments).toEqual({
				step: 'one',
			});
			expect(examples[1].outcome.resultingState.metadata.gateModifications).toEqual({
				step: 'two',
			});
		});
	});
});
