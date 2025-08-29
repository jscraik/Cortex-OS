/**
 * @file tests/cerebrum-readiness.test.ts
 * @description Ensures phases with majors but no blockers fail cerebrum readiness
 * @version 1.0.0
 * @status active
 */

import { describe, it, expect } from 'vitest';
import { EvaluationNode } from '../src/nodes/evaluation.js';

// Verify readiness logic when majors exist without blockers

describe('Cerebrum readiness validation', () => {
  it('should be false when a phase has majors but no blockers', async () => {
    const evaluationNode = new EvaluationNode();

    const mockState: any = {
      evidence: Array.from({ length: 5 }, (_, idx) => ({ id: `e${idx}` })),
      validationResults: {
        strategy: { passed: true, blockers: [], majors: [] },
        build: { passed: false, blockers: [], majors: ['missing docs'] },
        evaluation: { passed: true, blockers: [], majors: [] },
      },
    };

    const result = await (evaluationNode as any).preCerebrumValidation(mockState);

    expect(result.readyForCerebrum).toBe(false);
  });
});
