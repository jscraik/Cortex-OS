import { describe, it, expect } from 'vitest';
import { createInitialPRPState } from '../src/state.js';
import { runStrategyNode, runBuildNode, runEvaluationNode } from '../src/nodes/index.js';
import { createEvidence } from '../src/lib/phase-utils.js';

describe('PRP nodes', () => {
  it('runs strategy, build and evaluation phases', async () => {
    const blueprint = { title: 'Test', description: 'desc', requirements: ['security', 'backend'] };
    let state = createInitialPRPState(blueprint, { deterministic: true });

    state = await runStrategyNode(state);
    expect(state.validationResults.strategy?.passed).toBe(true);

    state = await runBuildNode(state);
    state.evidence.push(createEvidence(state, 'extra', 'test', 'extra', {}, 'build'));
    expect(state.validationResults.build?.passed).toBe(true);

    state = await runEvaluationNode(state);
    expect(state.validationResults.evaluation?.passed).toBe(true);
  });
});
