/**
 * @file tests/determinism.test.ts
 * @description Determinism tests for Cortex Kernel - Ensures reproducible execution
 * @author Cortex-OS Team
 * @version 1.0.0
 * @status TDD-CRITICAL
 */

import { describe, it, expect, beforeEach } from 'vitest';

import { CortexKernel } from '../src/graph-simple.js';
import { createInitialPRPState, PRPState } from '../src/state.js';
import { fixedTimestamp } from '../src/lib/determinism.js';


describe('Cortex Kernel Determinism', () => {
  let kernel: ReturnType<typeof createKernel>;
  let mockOrchestrator: { getNeuronCount: () => number };

  beforeEach(() => {
    mockOrchestrator = {
      getNeuronCount: () => 3, // Mock orchestrator with 3 neurons
    };
    kernel = createKernel(mockOrchestrator);
  });

  describe('Reproducible Execution', () => {
    it('should produce identical results for identical inputs', async () => {
      const blueprint = {
        title: 'Test Project',
        description: 'A test project for determinism validation',
        requirements: ['Feature A', 'Feature B', 'Testing'],
      };

      const run1 = await kernel.runPRPWorkflow(blueprint, { runId: 'test-run-1' });
      const run2 = await kernel.runPRPWorkflow(blueprint, { runId: 'test-run-2' });

      // Results should be structurally identical (excluding timestamps and run IDs)
      expect(normalizeForComparison(run1)).toEqual(normalizeForComparison(run2));
    });


    it('should maintain consistent state transitions', async () => {
      const blueprint = {
        title: 'State Transition Test',
        description: 'Testing state machine determinism',
        requirements: ['Requirement 1'],
      };

      const result = await kernel.runPRPWorkflow(blueprint, { runId: 'transition-test' });
      const history = kernel.getExecutionHistory('transition-test');

      // Verify state transitions follow expected pattern
      expect(history.length).toBeGreaterThan(0);

      // Check phase progression
      const phases = history.map((state) => state.phase);
      expect(phases).toContain('strategy');
    });


    it('should generate identical IDs across deterministic runs', async () => {
      const blueprint = {
        title: 'Deterministic ID Test',
        description: 'Ensures run and state IDs are deterministic',
        requirements: ['Deterministic'],
      };

      const run1 = await kernel.runPRPWorkflow(blueprint, { deterministic: true });
      const run2 = await kernel.runPRPWorkflow(blueprint, { deterministic: true });

      expect(run1.runId).toBe(run2.runId);
      expect(run1.id).toBe(run2.id);
    });

  });
});

// Helper functions
function normalizeForComparison(state: PRPState): any {
  return {
    ...state,
    id: 'NORMALIZED',
    runId: 'NORMALIZED',
    metadata: {
      ...state.metadata,
      startTime: 'NORMALIZED',
      endTime: 'NORMALIZED',
    },
    evidence: state.evidence.map((e) => ({
      ...e,
      id: 'NORMALIZED',
      timestamp: 'NORMALIZED',
    })),
    validationResults: {
      strategy: state.validationResults.strategy
        ? {
            ...state.validationResults.strategy,
            timestamp: 'NORMALIZED',
          }
        : undefined,
      build: state.validationResults.build
        ? {
            ...state.validationResults.build,
            timestamp: 'NORMALIZED',
          }
        : undefined,
      evaluation: state.validationResults.evaluation
        ? {
            ...state.validationResults.evaluation,
            timestamp: 'NORMALIZED',
          }
        : undefined,
    },
    cerebrum: state.cerebrum
      ? {
          ...state.cerebrum,
          timestamp: 'NORMALIZED',
        }
      : undefined,
  };
}
