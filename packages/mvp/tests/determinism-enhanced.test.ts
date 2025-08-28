import { describe, it, expect } from 'vitest';
import { CortexKernel } from '../src/graph-simple.js';
import { createInitialPRPState } from '../src/state.js';

describe('Enhanced Determinism', () => {
  it('should produce identical results for identical inputs with deterministic mode', async () => {
    const mockOrchestrator = { getNeuronCount: () => 3 };
    const kernel = new CortexKernel(mockOrchestrator);

    const blueprint = {
      title: 'Determinism Test',
      description: 'Should be deterministic',
      requirements: ['Test determinism'],
    };

    // Run workflows with identical inputs and deterministic mode
    const result1 = await kernel.runPRPWorkflow(blueprint, {
      runId: 'deterministic-test',
      deterministic: true,
    });

    const result2 = await kernel.runPRPWorkflow(blueprint, {
      runId: 'deterministic-test',
      deterministic: true,
    });

    // Should produce identical results
    expect(result1).toEqual(result2);
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

    // Should have identical IDs and timestamps
    expect(state1.id).toBe(state2.id);
    expect(state1.runId).toBe(state2.runId);
    expect(state1.metadata.startTime).toBe(state2.metadata.startTime);
  });
});
