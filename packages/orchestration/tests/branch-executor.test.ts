import { describe, expect, it } from 'vitest';
import type { RunState, Step } from '../src/domain/types.js';
import { executeBranch } from '../src/service/branch-executor.js';

function createState(context: Record<string, unknown>): RunState {
  return {
    wf: {
      id: 'wf',
      name: 'wf',
      version: '1',
      entry: 'start',
      steps: {},
    },
    runId: 'run',
    status: 'running',
    cursor: 'start',
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    context,
  };
}

describe('executeBranch', () => {
  it('routes to matching branch', () => {
    const step: Step = {
      id: 'start',
      name: 'start',
      kind: 'branch',
      branches: [
        { when: 'useA', to: 'a' },
        { when: 'useB', to: 'b' },
      ],
      next: 'end',
    };
    const rs = createState({ useA: true });
    const next = executeBranch(rs, step);
    expect(next.cursor).toBe('a');
  });

  it('falls back to next when no branch matches', () => {
    const step: Step = {
      id: 'start',
      name: 'start',
      kind: 'branch',
      branches: [
        { when: 'useA', to: 'a' },
        { when: 'useB', to: 'b' },
      ],
      next: 'end',
    };
    const rs = createState({});
    const next = executeBranch(rs, step);
    expect(next.cursor).toBe('end');
  });

  it('throws when no branch matches and no next provided', () => {
    const step: Step = {
      id: 'start',
      name: 'start',
      kind: 'branch',
      branches: [{ when: 'useA', to: 'a' }],
    };
    const rs = createState({});
    expect(() => executeBranch(rs, step)).toThrow();
  });
});
