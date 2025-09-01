import { greedyToTarget } from '@cortex-os/simlab-agents/rule-agent';
import { Scenario } from '@cortex-os/simlab-contracts/scenario';
import { runScenario } from '@cortex-os/simlab-core/runner';
import { counterEnv } from '@cortex-os/simlab-env/local-counter';
import { summarize } from '@cortex-os/simlab-metrics/basic';
import { expect, it } from 'vitest';

it('summarize returns contract fields', async () => {
  const scenario = {
    id: 'm1',
    steps: 5,
    seed: { value: 7 },
    agent: { id: 'a', kind: 'rule' },
    env: { id: 'e', kind: 'local-counter' },
  } as any;
  const run = await runScenario(scenario, counterEnv({ start: 0, target: 2 }), greedyToTarget());
  const summary = summarize(run);
  expect(summary).toStrictEqual({
    steps: run.transitions.length,
    totalReward: run.totalReward,
    success: true,
  });
});

it('rejects invalid scenario schema', () => {
  expect(() =>
    Scenario.parse({
      id: 'bad',
      steps: 0,
      seed: { value: -1 },
      agent: { id: 'a', kind: 'rule' },
      env: { id: 'e', kind: 'local-counter' },
    }),
  ).toThrow();
});
