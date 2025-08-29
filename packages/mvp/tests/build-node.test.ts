import { describe, it, expect } from 'vitest';
import { BuildNode } from '../src/nodes/build.js';
import { createInitialPRPState } from '../src/state.js';

describe('BuildNode API schema validation', () => {
  it('fails when API requirement lacks schema', async () => {
    const blueprint = {
      title: 'API Project',
      description: 'Test missing schema',
      requirements: ['Expose API'],
    };
    const state = createInitialPRPState(blueprint);
    const node = new BuildNode();
    const result = await node.execute(state);
    expect(result.validationResults.build?.blockers).toContain('API schema validation failed');
  });

  it('passes when valid API schema provided', async () => {
    const blueprint = {
      title: 'API Project',
      description: 'Test with schema',
      requirements: ['Expose API'],
      metadata: {
        apiSchema: JSON.stringify({ openapi: '3.0.0', info: { title: 'API', version: '1.0.0' } }),
      },
    };
    const state = createInitialPRPState(blueprint);
    const node = new BuildNode();
    const result = await node.execute(state);
    expect(result.validationResults.build?.blockers).not.toContain('API schema validation failed');
  });

  it('fails when backend resources are absent', async () => {
    const blueprint = {
      title: 'Frontend Project',
      description: 'No backend present',
      requirements: ['UI'],
    };
    const state = createInitialPRPState(blueprint);
    const node = new BuildNode();
    const result = await node.execute(state);
    expect(result.validationResults.build?.blockers).toContain(
      'Backend compilation or tests failed',
    );
  });
});
