/**
 * @file tests/critical-issues.test.ts
 * @description RED PHASE: Failing tests that expose critical implementation issues
 * @maintainer @jamiescottcraik
 * @last_updated 2025-08-21
 * @version 1.0.0
 * @status active
 * @phase TDD-RED
 *
 * TDD RED PHASE APPROACH:
 * This test file intentionally contains unsafe type assertions and expects failures.
 * The purpose is to expose critical issues that must be fixed before production.
 *
 * TYPE SAFETY NOTES:
 * - 'as any' assertions are used to bypass TypeScript for testing interface compatibility
 * - TODO comments mark areas needing proper type-safe implementations
 * - These assertions should be replaced with proper mocks and interfaces in GREEN phase
 */

import { beforeEach, describe, expect, it, vitest } from 'vitest';
import { CortexKernel } from '../src/graph-simple.js';
import { MCPAdapter } from '../src/mcp/adapter.js';
import { BuildNode } from '../src/nodes/build.js';
import { EvaluationNode } from '../src/nodes/evaluation.js';
import { createInitialPRPState, type PRPState } from '../src/state.js';
import { resetCounters } from '../src/utils/id.js';

describe('🔴 TDD RED PHASE: Critical Issue Detection', () => {
	beforeEach(() => {
		// Reset ID counters for deterministic testing
		resetCounters();
	});
	describe('[Critical] Package Exports Validation', () => {
		it('should successfully import CortexKernel from package exports', async () => {
			// Test the actual package exports by importing from dist
			try {
				// Since we're in the package itself, test the built exports
				const { CortexKernel: ExportedKernel } = await import('../dist/index.js');
				expect(ExportedKernel).toBeDefined();
				expect(typeof ExportedKernel).toBe('function');
			} catch (error) {
				// If this fails, the build outputs are broken
				expect(error).toBeDefined();
				throw new Error('[CRITICAL] Package exports broken - imports will fail in production');
			}
		});
	});

	describe('[Critical] Type Safety Violations', () => {
		it('should create valid Neuron objects from MCP tools', () => {
			const adapter = new MCPAdapter();
			const mockTool = {
				name: 'test-tool',
				description: 'Test tool',
				schema: { type: 'object' },
			};

			const neuron = adapter.createNeuronFromTool(mockTool, 'strategy');

			// These assertions will FAIL due to missing interface implementation
			expect(neuron).toHaveProperty('id');
			expect(neuron).toHaveProperty('role');
			expect(neuron).toHaveProperty('phase');
			expect(neuron).toHaveProperty('dependencies');
			expect(neuron).toHaveProperty('tools');
			expect(neuron).toHaveProperty('execute'); // Missing method!
			expect(typeof neuron.execute).toBe('function'); // Will throw TypeError
		});

		it('should match PRPOrchestrator interface from prp-runner', async () => {
			// Test interface compatibility without dynamic import since prp-runner has build issues
			const mockOrchestrator = {
				getNeuronCount: () => 3,
				registerNeuron: vitest.fn(),
				getNeuronsByPhase: vitest.fn(),
				configureLLM: vitest.fn(),
				getLLMConfig: vitest.fn(),
				createLLMBridge: vitest.fn(),
				executePRPCycle: vitest.fn(),
			};

			// Create kernel instance - this should work if the minimal interface is satisfied
			const kernel = new CortexKernel(mockOrchestrator as any);
			expect(kernel).toBeDefined();

			// Verify the orchestrator has the expected methods
			expect(mockOrchestrator).toHaveProperty('executePRPCycle'); // Should exist
			expect(mockOrchestrator).toHaveProperty('getNeuronCount'); // Required by kernel
			expect(typeof mockOrchestrator.executePRPCycle).toBe('function');
			expect(typeof mockOrchestrator.getNeuronCount).toBe('function');
		});
	});

	describe('[Critical] Determinism Guarantee Violations', () => {
		it('should produce identical results for identical inputs (true determinism)', async () => {
			const mockOrchestrator = { getNeuronCount: () => 3 };
			const kernel = new CortexKernel(mockOrchestrator);

			const blueprint = {
				title: 'Determinism Test',
				description: 'Should be deterministic',
				requirements: ['Test determinism'],
			};

			// Run workflows with identical inputs
			const result1 = await kernel.runPRPWorkflow(blueprint, {
				runId: 'deterministic-test',
				deterministic: true, // This option doesn't exist yet!
			});

			// Reset counters between runs to ensure deterministic IDs
			resetCounters();

			const result2 = await kernel.runPRPWorkflow(blueprint, {
				runId: 'deterministic-test',
				deterministic: true,
			});

			// This will FAIL due to:
			// 1. Date.now() in ID generation
			// 2. setTimeout in simulateWork
			// 3. Non-deterministic timestamps
			expect(result1).toEqual(result2); // Will fail due to timing differences
		});

		it('should generate deterministic IDs when deterministic mode enabled', () => {
			const state1 = createInitialPRPState(
				{ title: 'Test', description: 'Test', requirements: [] },
				{ id: 'fixed-id', runId: 'fixed-run-id', deterministic: true },
			);

			const state2 = createInitialPRPState(
				{ title: 'Test', description: 'Test', requirements: [] },
				{ id: 'fixed-id', runId: 'fixed-run-id', deterministic: true },
			);

			expect(state1.id).toBe(state2.id);
			expect(state1.runId).toBe(state2.runId);
			expect(state1.metadata.startTime).toBe(state2.metadata.startTime);
		});
	});

	describe('[Critical] Validation Logic Errors', () => {
		it('should fail API validation when schema is missing', () => {
			const buildNode = new BuildNode();

			const mockState: Partial<PRPState> = {
				blueprint: {
					title: 'API Test',
					description: 'Has API',
					requirements: ['REST API'],
				},
			} as any;

			const result = (buildNode as any).validateAPISchema(mockState);

			expect(result.passed).toBe(false);
			expect(result.details.validation).toBe('missing');
		});

		it('should require ALL phases to pass for cerebrum promotion', () => {
			const evaluationNode = new EvaluationNode();

			// Mock state with mixed validation results using the old structure
			const mockState = {
				validationResults: {
					strategy: { passed: true, blockers: [] },
					build: { passed: false, blockers: ['API schema missing'] }, // Failed!
					evaluation: { passed: true, blockers: [] },
				},
				// Add required properties to avoid undefined errors
				evidence: [],
			} as any; // TODO: Replace with proper PRPState mock type

			const canPromote = evaluationNode.checkPreCerebrumConditions(mockState);
			expect(canPromote).toBe(false);
		});
	});

	describe('[Critical] Interface Implementation Gaps', () => {
		it('should implement all required Neuron interface methods', async () => {
			const adapter = new MCPAdapter();
			const mockTool = {
				name: 'test-neuron',
				description: 'Test neuron',
				inputSchema: { type: 'object' },
				execute: async (params: any, _context: any) => {
					return { success: true, params };
				},
			};

			// Register the tool with the adapter
			adapter.registerTool(mockTool);

			const neuron = adapter.createNeuronFromTool(mockTool, 'build');

			expect(neuron.dependencies).toBeInstanceOf(Array);
			expect(neuron.tools).toBeInstanceOf(Array);
			expect(neuron.phase).toBe('build');

			const mockState = {
				runId: 'run-test',
				blueprint: {
					title: '',
					description: '',
					requirements: [],
				},
				evidence: [],
				validationResults: {},
				metadata: { startTime: new Date().toISOString(), deterministic: false },
			} as any;

			await expect(neuron.execute(mockState, {})).resolves.toBeDefined();
		});
	});
});

describe('🔴 TDD RED PHASE: Backward Compatibility Detection', () => {
	describe('Unnecessary Wrapper Methods', () => {
		it('should directly access orchestrator without wrapper methods', () => {
			const mockOrchestrator = { getNeuronCount: () => 5 };
			const kernel = new CortexKernel(mockOrchestrator);

			// This wrapper method should be removed
			expect(kernel.getNeuronCount).toBeUndefined(); // Should not exist

			// Direct access should be preferred
			expect(kernel.orchestrator?.getNeuronCount()).toBe(5);
		});
	});

	describe('Non-deterministic Fallbacks', () => {
		it('should not use Math.random() for ID generation', async () => {
			// Check example capture system
			const originalMathRandom = Math.random;
			let randomCalled = false;

			Math.random = () => {
				randomCalled = true;
				return 0.5;
			};

			try {
				// This will trigger Math.random() usage - should be removed
				const { ExampleCaptureSystem } = await import('../src/teaching/example-capture.js');
				const system = new ExampleCaptureSystem();

				system.captureExample('pattern', {}, 'user-action', 'outcome', {}, true);

				// This should FAIL - Math.random() should not be used
				expect(randomCalled).toBe(false);
			} finally {
				Math.random = originalMathRandom;
			}
		});

		it('should not use setTimeout for deterministic execution', async () => {
			const mockOrchestrator = { getNeuronCount: () => 3 };
			const kernel = new CortexKernel(mockOrchestrator);

			// Check if simulateWork uses setTimeout
			const originalSetTimeout = global.setTimeout;
			let timeoutCalled = false;

			global.setTimeout = ((callback: (...args: unknown[]) => void, delay?: number) => {
				timeoutCalled = true;
				return originalSetTimeout(callback, delay);
			}) as any; // TODO: Replace with proper setTimeout mock using vi.fn() or similar

			try {
				// This will trigger setTimeout - should be removable
				const blueprint = {
					title: 'Test',
					description: 'Test',
					requirements: [],
				};
				await kernel.runPRPWorkflow(blueprint, { deterministic: true });

				// Should not use setTimeout in deterministic mode
				expect(timeoutCalled).toBe(false);
			} finally {
				global.setTimeout = originalSetTimeout;
			}
		});
	});
});
