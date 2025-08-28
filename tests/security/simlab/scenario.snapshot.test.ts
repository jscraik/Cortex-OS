import { describe, it, expect } from 'vitest';
import { runScenario } from '@cortex-os/simlab-core/runner';
import { counterEnv } from '@cortex-os/simlab-env/local-counter';
import { greedyToTarget } from '@cortex-os/simlab-agents/rule-agent';

describe('scenario snapshots', () => {
  it('matches snapshot for deterministic run', async () => {
    const scenario = {
      id: 'snap',
      steps: 5,
      seed: { value: 2024 },
      agent: { id: 'a', kind: 'rule' },
      env: { id: 'e', kind: 'local-counter' },
    } as any;
    const res = await runScenario(scenario, counterEnv({ start: 0, target: 2 }), greedyToTarget());
    expect(res).toMatchSnapshot();
  });
});
