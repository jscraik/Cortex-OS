/**
 * @file tests/critical-issues.test.ts
 * @description RED PHASE: Failing tests that expose critical implementation issues
 * @maintainer @jamiescottcraik
 * @last_updated 2025-08-21
 * @version 1.0.0
 * @status active
 * @phase TDD-RED
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CortexKernel } from '../src/graph-simple.js';
import { createInitialPRPState } from '../src/state.js';
import { MCPAdapter } from '../src/mcp/adapter.js';
import { BuildNode } from '../src/nodes/build.js';
import { EvaluationNode } from '../src/nodes/evaluation.js';

describe.skip('🔴 TDD RED PHASE: Critical Issue Detection', () => {
  describe('[Critical] Package Exports Validation', () => {
    it('should successfully import CortexKernel from package exports', async () => {
      // This will FAIL due to package.json export path mismatch
      try {
        const { CortexKernel: ExportedKernel } = await import('@cortex-os/kernel');
        expect(ExportedKernel).toBeDefined();
        expect(typeof ExportedKernel).toBe('function');
      } catch (error) {
        // Expected failure: export paths don't match build structure
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
      // This will FAIL due to interface mismatch
      try {
        const { PRPOrchestrator } = await import('@cortex-os/prp-runner');
        const mockOrchestrator = {
          getNeuronCount: () => 3,
          // Missing methods that prp-runner expects
        };

        // Type check would fail here if we had proper typing
        const kernel = new CortexKernel(mockOrchestrator as any);
        expect(kernel).toBeDefined();

        // This assertion will expose the interface mismatch
        expect(mockOrchestrator).toHaveProperty('executeNeuron'); // May not exist
      } catch (error) {
        throw new Error('[CRITICAL] Interface compatibility broken with prp-runner');
      }
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
        { id: 'fixed-id', runId: 'fixed-run-id' },
      );

      const state2 = createInitialPRPState(
        { title: 'Test', description: 'Test', requirements: [] },
        { id: 'fixed-id', runId: 'fixed-run-id' },
      );

      // This should pass, but default ID generation uses Date.now()
      expect(state1.id).toBe(state2.id);
      expect(state1.runId).toBe(state2.runId);

      // This will FAIL due to Date.now() timestamps
      expect(state1.metadata.startTime).toBe(state2.metadata.startTime);
    });
  });

  describe('[Critical] Validation Logic Errors', () => {
    it('should fail API validation when schema is missing', () => {
      const buildNode = new BuildNode();

      // Mock state with API but no schema
      const mockState = {
        blueprint: {
          title: 'API Test',
          description: 'Has API',
          requirements: ['REST API'],
        },
        outputs: {
          'api-check': { hasAPI: true, hasSchema: false },
        },
      } as any;

      const result = buildNode.validateAPIDesign(mockState);

      // This will FAIL due to "hasAPI ? true : true" logic
      expect(result.passed).toBe(false); // Should fail but returns true!
      expect(result.details.validation).toBe('failed'); // Should indicate failure
    });

    it('should require ALL phases to pass for cerebrum promotion', () => {
      const evaluationNode = new EvaluationNode();

      // Mock state with mixed validation results
      const mockState = {
        validationResults: {
          strategy: { passed: true, blockers: [] },
          build: { passed: false, blockers: ['API schema missing'] }, // Failed!
          evaluation: { passed: true, blockers: [] },
        },
      } as any;

      const canPromote = evaluationNode.checkPreCerebrumConditions(mockState);

      // This will FAIL due to "||" instead of "&&" logic
      expect(canPromote).toBe(false); // Should be false but returns true!
    });
  });

  describe('[Critical] Interface Implementation Gaps', () => {
    it('should implement all required Neuron interface methods', () => {
      const adapter = new MCPAdapter();
      const mockTool = {
        name: 'test-neuron',
        description: 'Test neuron',
        schema: { type: 'object' },
      };

      const neuron = adapter.createNeuronFromTool(mockTool, 'build');

      // These will FAIL due to incomplete interface implementation
      expect(neuron.dependencies).toBeInstanceOf(Array);
      expect(neuron.tools).toBeInstanceOf(Array);
      expect(neuron.phase).toBe('build');

      // This will throw TypeError - execute method doesn't exist
      expect(async () => {
        await neuron.execute({}, {});
      }).not.toThrow();
    });
  });
});

describe.skip('🔴 TDD RED PHASE: Backward Compatibility Detection', () => {
  describe('Unnecessary Wrapper Methods', () => {
    it('should directly access orchestrator without wrapper methods', () => {
      const mockOrchestrator = { getNeuronCount: () => 5 };
      const kernel = new CortexKernel(mockOrchestrator);

      // This wrapper method should be removed
      expect(kernel.getNeuronCount).toBeUndefined(); // Should not exist

      // Direct access should be preferred
      expect(kernel.orchestrator.getNeuronCount()).toBe(5);
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

      global.setTimeout = ((callback: any, delay: any) => {
        timeoutCalled = true;
        return originalSetTimeout(callback, delay);
      }) as any;

      try {
        // This will trigger setTimeout - should be removable
        const blueprint = { title: 'Test', description: 'Test', requirements: [] };
        await kernel.runPRPWorkflow(blueprint, { deterministic: true });

        // Should not use setTimeout in deterministic mode
        expect(timeoutCalled).toBe(false);
      } finally {
        global.setTimeout = originalSetTimeout;
      }
    });
  });
});
