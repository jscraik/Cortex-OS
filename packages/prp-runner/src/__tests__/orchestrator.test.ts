/**
 * @file orchestrator.test.ts
 * @description TDD Tests for PRP Orchestrator - Following Red-Green-Refactor cycle
 * @author Cortex-OS Team
 * @version 1.0.0
 *
 * Test Philosophy:
 * - Each test drives implementation
 * - Tests define behavior before code exists
 * - No test should pass without proper implementation
 * - 85% coverage minimum enforced
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
	createPRPOrchestrator,
	type PRPOrchestrator,
} from '../orchestrator.js';

describe('PRPOrchestrator - TDD Implementation', () => {
	let orchestrator: PRPOrchestrator;

	beforeEach(() => {
		orchestrator = createPRPOrchestrator();
	});

	describe('Basic Construction and Registration', () => {
		it('should create an orchestrator instance', () => {
			expect(orchestrator).toBeDefined();
			expect(typeof orchestrator.getNeuronCount).toBe('function');
		});

		it('should start with zero neurons registered', () => {
			// RED: This should fail - no getNeuronCount method
			expect(orchestrator.getNeuronCount()).toBe(0);
		});

		it('should fail to execute without any neurons', async () => {
			// RED: This should fail - no executePRPCycle method
			await expect(orchestrator.executePRPCycle({} as any)).rejects.toThrow(
				'No neurons registered',
			);
		});
	});

	describe('PRP Execution - Core Functionality', () => {
		it('should execute PRP cycle with registered neurons', async () => {
			// Arrange
			const mockNeuron = createMockNeuron('strategy-neuron', 'strategy');
			orchestrator.registerNeuron(mockNeuron);

			const blueprint = {
				title: 'Test Blueprint',
				description: 'Test project',
				requirements: ['Build something awesome'],
			};

			// Act
			const result = await orchestrator.executePRPCycle(blueprint);

			// Assert
			expect(result).toBeDefined();
			expect(result.id).toMatch(/^prp-\d+$/);
			expect(result.phase).toBe('strategy');
			expect(result.blueprint).toEqual(blueprint);
			expect(result.outputs).toBeDefined();
			expect(result.status).toBe('completed');
		});

		it('should generate a product requirements prompt', async () => {
			const mockNeuron = createMockNeuron('strategy-neuron', 'strategy');
			orchestrator.registerNeuron(mockNeuron);

			const blueprint = {
				title: 'Prompt Blueprint',
				description: 'Generate product requirements prompt',
				requirements: ['collect SME feedback'],
			};

			const prompt =
				await orchestrator.generateProductRequirementsPrompt(blueprint);
			expect(prompt).toContain('Product Requirements for');
			expect(prompt).toContain('strategy-neuron');
		});

		it('should validate blueprint structure', async () => {
			const mockNeuron = createMockNeuron('strategy-neuron', 'strategy');
			orchestrator.registerNeuron(mockNeuron);

			await expect(
				orchestrator.generateProductRequirementsPrompt({} as any),
			).rejects.toThrow();
		});
	});

	describe('Neuron Registration - Core Functionality', () => {
		it('should register a single neuron', () => {
			// RED: This should fail - no registerNeuron method
			const mockNeuron = {
				id: 'test-neuron',
				role: 'tester',
				phase: 'strategy' as const,
				dependencies: [],
				tools: [],
				execute: async (_state: unknown, _context: unknown) => ({
					output: {},
					evidence: [],
					nextSteps: [],
					artifacts: [],
					metrics: {
						startTime: new Date().toISOString(),
						endTime: new Date().toISOString(),
						duration: 0,
						toolsUsed: [],
						filesCreated: 0,
						filesModified: 0,
						commandsExecuted: 0,
					},
				}),
			};

			orchestrator.registerNeuron(mockNeuron);
			expect(orchestrator.getNeuronCount()).toBe(1);
		});

		it('should register multiple neurons', () => {
			// RED: This should fail initially
			const neuron1 = createMockNeuron('neuron-1', 'strategy');
			const neuron2 = createMockNeuron('neuron-2', 'build');

			orchestrator.registerNeuron(neuron1);
			orchestrator.registerNeuron(neuron2);

			expect(orchestrator.getNeuronCount()).toBe(2);
		});

		it('should prevent duplicate neuron IDs', () => {
			// RED: This should fail - no duplicate detection
			const neuron1 = createMockNeuron('duplicate-id', 'strategy');
			const neuron2 = createMockNeuron('duplicate-id', 'build');

			orchestrator.registerNeuron(neuron1);

			expect(() => orchestrator.registerNeuron(neuron2)).toThrow(
				'Neuron with ID duplicate-id already registered',
			);
		});

		it('should list registered neurons by phase', () => {
			// RED: This should fail - no getNeuronsByPhase method
			const strategyNeuron = createMockNeuron('strategy-1', 'strategy');
			const buildNeuron = createMockNeuron('build-1', 'build');

			orchestrator.registerNeuron(strategyNeuron);
			orchestrator.registerNeuron(buildNeuron);

			const strategyNeurons = orchestrator.getNeuronsByPhase('strategy');
			const buildNeurons = orchestrator.getNeuronsByPhase('build');

			expect(strategyNeurons).toHaveLength(1);
			expect(buildNeurons).toHaveLength(1);
			expect(strategyNeurons[0].id).toBe('strategy-1');
			expect(buildNeurons[0].id).toBe('build-1');
		});
	});
});

// Helper function to create mock neurons for testing
function createMockNeuron(
	id: string,
	phase: 'strategy' | 'build' | 'evaluation',
) {
	return {
		id,
		role: `test-${phase}`,
		phase,
		dependencies: [],
		tools: [],
		execute: async (_state: unknown, _context: unknown) => ({
			output: { [`${id}-result`]: true },
			evidence: [],
			nextSteps: [],
			artifacts: [],
			metrics: {
				startTime: new Date().toISOString(),
				endTime: new Date().toISOString(),
				duration: 100,
				toolsUsed: [],
				filesCreated: 0,
				filesModified: 0,
				commandsExecuted: 0,
			},
		}),
	};
}
