import { describe, it, expect, afterEach } from 'vitest';
import {
  validateWorkflow,
  clearValidationCache,
  MAX_WORKFLOW_DEPTH,
  WorkflowStep,
} from '../src/lib/workflow-validation';

const baseWorkflow = {
  id: '00000000-0000-0000-0000-000000000000',
  name: 'sample',
  version: '1',
  entry: 'start',
  steps: {
    start: { id: 'start', name: 'start', kind: 'agent', next: 'end' },
    end: { id: 'end', name: 'end', kind: 'agent' },
  },
};

describe('workflow validation', () => {
  afterEach(() => {
    clearValidationCache();
  });

  it('accepts acyclic workflows', () => {
    expect(() => validateWorkflow(baseWorkflow)).not.toThrow();
  });

  it('rejects cyclic workflows', () => {
    const cyclic = {
      ...baseWorkflow,
      steps: {
        start: { id: 'start', name: 'start', kind: 'agent', next: 'end' },
        end: { id: 'end', name: 'end', kind: 'agent', next: 'start' },
      },
    };
    expect(() => validateWorkflow(cyclic)).toThrow(/Cycle detected/);
  });

  it('reports unreachable steps', () => {
    const wf = {
      ...baseWorkflow,
      steps: {
        ...baseWorkflow.steps,
        ghost: { id: 'ghost', name: 'ghost', kind: 'agent' },
      },
    };
    const result = validateWorkflow(wf);
    expect(result.stats.unreachableSteps).toEqual(['ghost']);
  });

  it('rejects workflows exceeding max depth', () => {
    const steps: Record<string, WorkflowStep> = {};
    for (let i = 0; i <= MAX_WORKFLOW_DEPTH; i++) {
      const id = `s${i}`;
      steps[id] = { id, name: id, kind: 'agent' };
      if (i < MAX_WORKFLOW_DEPTH) {
        steps[id].next = `s${i + 1}`;
      }
    }
    const wf = {
      id: 'depth',
      name: 'deep',
      version: '1',
      entry: 's0',
      steps,
    };
    expect(() => validateWorkflow(wf)).toThrow(/depth exceeds limit/);
  });

  it('rejects branch to missing step', () => {
    const wf = {
      ...baseWorkflow,
      steps: {
        start: {
          id: 'start',
          name: 'start',
          kind: 'branch',
          branches: [{ when: 'always', to: 'missing' }],
        },
      },
    };
    expect(() => validateWorkflow(wf)).toThrow(/branch to non-existent step/);
  });
});

