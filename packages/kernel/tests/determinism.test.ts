/**
 * @file tests/determinism.test.ts
 * @description Determinism tests for Cortex Kernel - Ensures reproducible execution
 * @author Cortex-OS Team
 * @version 1.0.0
 * @status TDD-CRITICAL
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createKernel } from '../src/graph-simple.js';
import type { PRPState } from '../src/state.js';

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
