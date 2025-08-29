/**
 * @file integration.test.ts
 * @description Integration tests for Cortex Kernel with PRP runner
 * @author Cortex-OS Team
 * @version 1.0.0
 * @status TDD-CRITICAL
 */

import { describe, it, expect, beforeEach } from 'vitest';
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
        requirements: ['Feature A', 'Feature B', 'Testing'],
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
      expect(result.validationResults.strategy?.passed).toBe(true);
      expect(result.validationResults.build?.passed).toBe(true);
      expect(result.validationResults.evaluation?.passed).toBe(true);

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

      // Should successfully get neuron count from orchestrator
      expect(kernel.getNeuronCount()).toBe(5);

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
});
