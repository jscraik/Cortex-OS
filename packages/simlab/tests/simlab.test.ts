import { describe, expect, it } from 'vitest';
import { deterministicScheduler, randomizedScheduler } from '../src/scheduler';
import { executeStep } from '../src/failure';
import { runScenario } from '../src/replay';
import { handleSimlab } from '../src/index';
import { Scenario } from '../src/scenario';
import { createStdOutput, createJsonOutput, StructuredError } from '../src/lib/output';
import { createInMemoryStore } from '../src/lib/memory';
import { createMetrics, finish, summary } from '../src/metrics';

const baseScenario: Scenario = {
  name: 'demo',
  seed: 1,
  steps: [
    { agent: 'a1', action: 'ping' },
    { agent: 'a2', action: 'pong', failure: 'latency', delayMs: 5 },
    { agent: 'a1', action: 'drop', failure: 'drop' }
  ]
};

const config = { memory: { maxItems: 2, maxBytes: 1024 } };

describe('scheduler', () => {
  it('deterministic scheduler stable', () => {
    const s1 = deterministicScheduler(baseScenario);
    const s2 = deterministicScheduler(baseScenario);
    expect(s1).toEqual(s2);
  });
  it('randomized scheduler uses seed', () => {
    const o1 = randomizedScheduler(baseScenario).map(s => s.index);
    const o2 = randomizedScheduler(baseScenario).map(s => s.index);
    expect(o1).toEqual(o2);
  });
});

describe('failure injection', () => {
  it('drops steps', async () => {
    const res = await executeStep({ agent: 'x', action: 'y', failure: 'drop', delayMs: 0 });
    expect(res).toBeNull();
  });
  it('crashes', async () => {
    await expect(executeStep({ agent: 'x', action: 'y', failure: 'crash', delayMs: 0 })).rejects.toThrow('Injected crash');
  });
});

describe('utilities', () => {
  it('std and json outputs', () => {
    expect(createStdOutput('hi')).toBe('hi');
    expect(JSON.parse(createJsonOutput({ a: 1 })).data).toEqual({ a: 1 });
  });
  it('structured error serializes', () => {
    const err = new StructuredError('X', 'oops', { d: 1 });
    expect(err.toJSON()).toEqual({ code: 'X', message: 'oops', meta: { d: 1 } });
  });
  it('memory store respects maxItems', () => {
    const store = createInMemoryStore({ maxItems: 1, maxBytes: 10 });
    store.set('a', 1);
    store.set('b', 2);
    expect(store.get('a')).toBeUndefined();
    expect(store.get('b')).toBe(2);
  });
  it('metrics summary handles empty', () => {
    const m = createMetrics();
    finish(m);
    expect(summary(m)).toEqual({ latencyAvg: 0, throughput: 0, fairness: 1 });
  });
});

describe('runScenario and handleSimlab', () => {
  it('collects metrics and events', async () => {
    const res = await runScenario(baseScenario, 'deterministic');
    expect(res.events.length).toBe(2);
    expect(res.metrics.throughput).toBeGreaterThan(0);
  });
  it('supports randomized scheduler', async () => {
    const res = await runScenario(baseScenario, 'randomized');
    expect(res.events.length).toBe(2);
  });
  it('handleSimlab outputs json when flag set', async () => {
    const out = await handleSimlab({ config, scenario: baseScenario, scheduler: 'deterministic', json: true });
    const parsed = JSON.parse(out);
    expect(parsed.data.executed).toBe(true);
    expect(parsed.data.events.length).toBe(2);
  });
  it('handleSimlab outputs std when json flag absent', async () => {
    const out = await handleSimlab({ config, scenario: baseScenario, scheduler: 'deterministic' });
    const parsed = JSON.parse(out);
    expect(parsed.executed).toBe(true);
  });
  it('handleSimlab returns error for invalid input', async () => {
    const out = await handleSimlab({});
    const parsed = JSON.parse(out);
    expect(parsed.data.error.code).toBe('INVALID_INPUT');
  });
});
