import { greedyToTarget } from '@cortex-os/simlab-agents/rule-agent';
import { runScenario } from '@cortex-os/simlab-core/runner';
import { counterEnv } from '@cortex-os/simlab-env/local-counter';
import { expect, it } from 'vitest';

it('reaches target deterministically', async () => {
	const scenario = {
		id: 's1',
		steps: 10,
		seed: { value: 123 },
		agent: { id: 'a', kind: 'rule' },
		env: { id: 'e', kind: 'local-counter' },
	} as any;
	const res = await runScenario(
		scenario,
		counterEnv({ start: 0, target: 3 }),
		greedyToTarget(),
	);
	expect(res.transitions.at(-1)?.done).toBe(true);
	expect(res.totalReward).toBeCloseTo(1, 5);
});

it('produces identical runs for the same seed', async () => {
	const scenario = {
		id: 's1',
		steps: 10,
		seed: { value: 42 },
		agent: { id: 'a', kind: 'rule' },
		env: { id: 'e', kind: 'local-counter' },
	} as any;
	const run1 = await runScenario(
		scenario,
		counterEnv({ start: 0, target: 3 }),
		greedyToTarget(),
	);
	const run2 = await runScenario(
		scenario,
		counterEnv({ start: 0, target: 3 }),
		greedyToTarget(),
	);
	expect(run1).toEqual(run2);
});
