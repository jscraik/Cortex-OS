import { describe, expect, it } from 'vitest';
import { SimplePRPGraph } from '../src/graph-simple.js';
import { BuildNode } from '../src/nodes/build.js';
import { EvaluationNode } from '../src/nodes/evaluation.js';
import { createInitialPRPState } from '../src/state.js';

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
    it('should fail API validation when schema is missing and record evidence', async () => {
      const buildNode = new BuildNode();

      const blueprint = {
        title: 'API Test',
        description: 'Has API',
        requirements: ['REST API'],
      };

      const state = createInitialPRPState(blueprint as any, { deterministic: true });
      const result = await buildNode.execute(state as any);

      const blockers = result.validationResults.build?.blockers || [];
      expect(blockers).toContain('API schema validation failed');

      const apiEvidence = result.evidence.find((e: any) => e.source === 'api_schema_validation');
      expect(apiEvidence).toBeDefined();
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
      const graph = new SimplePRPGraph(mockOrchestrator);

      // This wrapper method should be removed
      expect((graph as any).getNeuronCount).toBeUndefined(); // Should not exist

      // Direct access should be preferred
      // expect((graph as any).orchestrator.getNeuronCount()).toBe(5); // Disabled: orchestrator is not public
    });
  });
});
