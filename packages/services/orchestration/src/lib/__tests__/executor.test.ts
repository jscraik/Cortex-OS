import { describe, expect, it } from 'vitest';
import { run, type Workflow } from '../executor';

function makeStep(log: string[], name: string, failTimes = 0) {
  let count = 0;
  return async () => {
    if (count < failTimes) {
      count++;
      throw new Error(`${name} failed`);
    }
    log.push(name);
  };
}

describe('executor', () => {
  it('runs steps in topological order', async () => {
    const order: string[] = [];
    const wf: Workflow = {
      graph: {
        a: ['b', 'c'],
        b: ['d'],
        c: ['d'],
        d: [],
      },
      steps: {
        a: makeStep(order, 'a'),
        b: makeStep(order, 'b'),
        c: makeStep(order, 'c'),
        d: makeStep(order, 'd'),
      },
    };
    const executed = await run(wf);
    // Validate precedence without enforcing a specific interleaving between b/c
    expect(order[0]).toBe('a');
    expect(order[order.length - 1]).toBe('d');
    expect(order.indexOf('a')).toBeLessThan(order.indexOf('b'));
    expect(order.indexOf('a')).toBeLessThan(order.indexOf('c'));
    expect(order.indexOf('b')).toBeLessThan(order.indexOf('d'));
    expect(order.indexOf('c')).toBeLessThan(order.indexOf('d'));
    expect(executed).toEqual(order);
  });

  it('retries failing steps according to policy', async () => {
    const order: string[] = [];
    const wf: Workflow = {
      graph: { a: ['b'], b: [] },
      steps: {
        a: makeStep(order, 'a'),
        b: makeStep(order, 'b', 1), // fail once
      },
    };
    const executed = await run(wf, {
      retry: { b: { maxRetries: 2, backoffMs: 0 } },
    });
    expect(executed).toEqual(['a', 'b']);
  });

  it('supports branching predicates to skip unreachable paths', async () => {
    const order: string[] = [];
    const wf: Workflow = {
      graph: {
        start: ['branch'],
        branch: ['pathA', 'pathB'],
        pathA: ['join'],
        pathB: ['join'],
        join: [],
      },
      steps: {
        start: makeStep(order, 'start'),
        branch: makeStep(order, 'branch'),
        pathA: makeStep(order, 'pathA'),
        // pathB intentionally has a step; should be skipped when predicate true
        pathB: makeStep(order, 'pathB'),
        join: makeStep(order, 'join'),
      },
      branches: {
        branch: {
          predicate: async () => true, // choose trueTargets => pathA
          trueTargets: ['pathA'],
          falseTargets: ['pathB'],
        },
      },
    };

    const executed = await run(wf);

    expect(executed).toContain('start');
    expect(executed).toContain('branch');
    expect(executed).toContain('pathA');
    expect(executed).toContain('join');
    expect(executed).not.toContain('pathB');
    // precedence checks
    expect(order.indexOf('start')).toBeLessThan(order.indexOf('branch'));
    expect(order.indexOf('branch')).toBeLessThan(order.indexOf('pathA'));
    expect(order.indexOf('pathA')).toBeLessThan(order.indexOf('join'));
  });

  it('supports loop/map semantics over items', async () => {
    const order: string[] = [];
    const items = [1, 2, 3];
    const seen: number[] = [];
    const wf: Workflow = {
      graph: {
        loopNode: ['done'],
        done: [],
      },
      steps: {
        // no explicit step for loopNode (structural); loop handles body
        done: makeStep(order, 'done'),
      },
      loops: {
        loopNode: {
          items: async () => items,
          body: async (n) => {
            // body called for each item
            // ensure types are numbers
            seen.push(n as number);
          },
        },
      },
    };

    const executed = await run(wf);
    // loop records node per iteration
    expect(executed.filter((n) => n === 'loopNode').length).toBe(items.length);
    expect(seen).toEqual(items);
    expect(executed[executed.length - 1]).toBe('done');
  });

  it('propagates branch skips to nested downstream nodes but still executes reachable joins', async () => {
    const order: string[] = [];
    const wf: Workflow = {
      graph: {
        start: ['branch'],
        branch: ['pathA', 'pathB'],
        pathA: ['join'],
        pathB: ['midB'],
        midB: ['leafB'],
        leafB: ['join'],
        join: [],
      },
      steps: {
        start: makeStep(order, 'start'),
        branch: makeStep(order, 'branch'),
        pathA: makeStep(order, 'pathA'),
        pathB: makeStep(order, 'pathB'), // should be skipped
        midB: makeStep(order, 'midB'),   // should be skipped
        leafB: makeStep(order, 'leafB'), // should be skipped
        join: makeStep(order, 'join'),   // should still run via pathA
      },
      branches: {
        branch: {
          predicate: async () => true, // choose A
          trueTargets: ['pathA'],
          falseTargets: ['pathB'],
        },
      },
    };

    const executed = await run(wf);

    expect(executed).toContain('start');
    expect(executed).toContain('branch');
    expect(executed).toContain('pathA');
    expect(executed).toContain('join');
    expect(executed).not.toContain('pathB');
    expect(executed).not.toContain('midB');
    expect(executed).not.toContain('leafB');
    // ordering sanity
    expect(order.indexOf('pathA')).toBeLessThan(order.indexOf('join'));
  });

  it('handles loop with empty items (no body invocations)', async () => {
    const order: string[] = [];
    const wf: Workflow = {
      graph: { loopNode: ['end'], end: [] },
      steps: { end: makeStep(order, 'end') },
      loops: {
        loopNode: {
          items: async () => [],
          body: async () => {
            throw new Error('should not be called');
          },
        },
      },
    };

    const executed = await run(wf);
    expect(executed.filter((n) => n === 'loopNode').length).toBe(0);
    expect(executed[executed.length - 1]).toBe('end');
  });

  it('aborts early when signal is already aborted', async () => {
    const wf: Workflow = {
      graph: { a: ['b'], b: [] },
      steps: {
        a: async () => {
          throw new Error('should not run when aborted');
        },
        b: async () => {
          throw new Error('should not run when aborted');
        },
      },
    };

    const ctrl = new AbortController();
    ctrl.abort();
    await expect(run(wf, { signal: ctrl.signal })).rejects.toThrow(/Aborted/);
  });
});
