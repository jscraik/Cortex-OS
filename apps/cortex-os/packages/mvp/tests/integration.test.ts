/**
 * @file integration.test.ts
 * @description Integration tests for Cortex Kernel with PRP runner
 * @author Cortex-OS Team
 * @version 1.0.0
 * @status TDD-CRITICAL
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CortexKernel } from '../src/graph-simple.js';

describe('Cortex Kernel Integration', () => {
  let kernel: CortexKernel;
  let mockOrchestrator: { getNeuronCount: () => number };

  beforeEach(() => {
    mockOrchestrator = {
      getNeuronCount: () => 5,
    };
    kernel = new CortexKernel(mockOrchestrator);
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

    it('should maintain execution history', async () => {
      const blueprint = {
        title: 'History Test',
        description: 'Test execution history tracking',
        requirements: ['Track phases'],
      };

      const result = await kernel.runPRPWorkflow(blueprint, {
        runId: 'history-test-001',
      });

      const history = kernel.getExecutionHistory('history-test-001');
      
      // Should have tracked all phase transitions
      expect(history.length).toBeGreaterThan(1);
      
      // Check phase progression
      const phases = history.map(state => state.phase);
      expect(phases).toContain('strategy');
      expect(phases[phases.length - 1]).toBe('completed');
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
      
      const errorKernel = new CortexKernel(errorOrchestrator);
      
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

      const result = await kernel.runPRPWorkflow(blueprint, {
        runId: 'phase-test-001',
      });

      const history = kernel.getExecutionHistory('phase-test-001');
      const phases = history.map(state => state.phase);

      // Should include the main workflow phases
      expect(phases).toContain('strategy');
      expect(phases.some(p => p === 'build')).toBe(true);
      expect(phases.some(p => p === 'evaluation')).toBe(true);
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
      
      // All validation results should be present for completed workflows
      if (result.phase === 'completed') {
        expect(result.validationResults.strategy).toBeDefined();
        expect(result.validationResults.build).toBeDefined();
        expect(result.validationResults.evaluation).toBeDefined();
      }
    });
  });
});