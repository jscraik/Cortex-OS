/**
 * @file tests/determinism.test.ts
 * @description Determinism tests for Cortex Kernel - Ensures reproducible execution
 * @author Cortex-OS Team
 * @version 1.0.0
 * @status TDD-CRITICAL
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { SimplePRPGraph } from '../src/graph-simple.js';
import { createInitialPRPState, type PRPState } from '../src/state.js';

describe('Cortex Kernel Determinism', () => {
  let graph: SimplePRPGraph;
  let mockOrchestrator: { getNeuronCount: () => number };

  beforeEach(() => {
    mockOrchestrator = {
      getNeuronCount: () => 3, // Mock orchestrator with 3 neurons
    };
    graph = new SimplePRPGraph(mockOrchestrator);
  });

  describe('Reproducible Execution', () => {
    it('should produce identical results for identical inputs', async () => {
      const blueprint = {
        title: 'Test Project',
        description: 'A test project for determinism validation',
        requirements: ['Feature A', 'Feature B', 'Testing'],
      };

      const run1 = await graph.runPRPWorkflow(blueprint, { runId: 'test-run-1' });
      const run2 = await graph.runPRPWorkflow(blueprint, { runId: 'test-run-2' });

      // Results should be structurally identical (excluding timestamps and run IDs)
      expect(normalizeForComparison(run1)).toEqual(normalizeForComparison(run2));
    });

    it('should maintain consistent state transitions', async () => {
      const blueprint = {
        title: 'State Transition Test',
        description: 'Testing state machine determinism',
        requirements: ['Requirement 1'],
      };

      const result = await graph.runPRPWorkflow(blueprint, { runId: 'transition-test' });
      const history = graph.getExecutionHistory('transition-test');

      // Verify state transitions follow expected pattern
      expect(history.length).toBeGreaterThan(0);

      // Check phase progression
      const phases = history.map((state) => state.phase);
      expect(phases).toContain('strategy');
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
