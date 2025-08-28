import { describe, it, expect } from 'vitest';
import { CortexKernel } from '../src/graph-simple.js';
import { createInitialPRPState } from '../src/state.js';
import { BuildNode } from '../src/nodes/build.js';
import { EvaluationNode } from '../src/nodes/evaluation.js';

describe('MVP Fixes Verification', () => {
  describe('Deterministic Execution', () => {
    it('should generate deterministic IDs when deterministic mode enabled', () => {
      const blueprint = {
        title: 'Test',
        description: 'Test',
        requirements: [],
      };

      const state1 = createInitialPRPState(blueprint, {
        id: 'fixed-id',
        runId: 'fixed-run-id',
        deterministic: true,
      });

      const state2 = createInitialPRPState(blueprint, {
        id: 'fixed-id',
        runId: 'fixed-run-id',
        deterministic: true,
      });

      // Should have identical IDs and timestamps
      expect(state1.id).toBe(state2.id);
      expect(state1.runId).toBe(state2.runId);
      expect(state1.metadata.startTime).toBe(state2.metadata.startTime);
    });
  });

  describe('API Validation Logic', () => {
    it('should fail API validation when schema is missing', async () => {
      const buildNode = new BuildNode();

      // Mock state with API but no schema
      const mockState: any = {
        blueprint: {
          title: 'API Test',
          description: 'Has API',
          requirements: ['REST API'],
        },
        outputs: {},
      };

      const result = await (buildNode as any).validateAPISchema(mockState);

      // Should properly fail when schema is missing
      expect(result.passed).toBe(false);
      expect(result.details.validation).toBe('failed');
    });
  });

  describe('Cerebrum Decision Logic', () => {
    it('should require ALL phases to pass for cerebrum promotion', async () => {
      const evaluationNode = new EvaluationNode();

      // Mock state with mixed validation results
      const mockState: any = {
        evidence: [], // Add evidence array
        validationResults: {
          strategy: { passed: true, blockers: [] },
          build: { passed: false, blockers: ['API schema missing'] }, // Failed!
          evaluation: { passed: true, blockers: [] },
        },
      };

      const result = await (evaluationNode as any).preCerebrumValidation(mockState);

      // Should be false when any phase fails
      expect(result.readyForCerebrum).toBe(false);
    });
  });

  describe('Orchestrator Access', () => {
    it('should directly access orchestrator without wrapper methods', () => {
      const mockOrchestrator = { getNeuronCount: () => 5 };
      const kernel = new CortexKernel(mockOrchestrator);

      // This wrapper method should be removed
      expect((kernel as any).getNeuronCount).toBeUndefined(); // Should not exist

      // Direct access should be preferred
      expect(kernel.orchestrator.getNeuronCount()).toBe(5);
    });
  });
});
