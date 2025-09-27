import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { run, type Workflow } from '../../src/lib/executor.js';
import { commonHooks, HookManager } from '../../src/lib/hooks.js';

describe('brAInwav LangGraph harness logging', () => {
	const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

	beforeEach(() => {
		warnSpy.mockClear();
	});

	afterEach(() => {
		warnSpy.mockClear();
	});

	afterAll(() => {
		warnSpy.mockRestore();
	});

	it('emits brAInwav branded node logs via common hooks', async () => {
		const hooks = new HookManager();
		hooks.addGlobalPreStepHook(commonHooks.logStepStart);
		hooks.addGlobalPostStepHook(commonHooks.logStepComplete);
		hooks.addGlobalPostStepHook(commonHooks.recordStepMetrics);

		const workflow: Workflow = {
			graph: {
				alpha: ['beta'],
				beta: ['omega'],
				omega: [],
			},
			steps: {
				alpha: async () => {
					return;
				},
				beta: async () => {
					return;
				},
				omega: async () => {
					return;
				},
			},
			hooks,
		};

		const executed = await run(workflow, { workflowId: 'brAInwav-harness' });
		expect(executed).toEqual(['alpha', 'beta', 'omega']);

		const startLog = warnSpy.mock.calls.find(
			([message]) =>
				typeof message === 'string' && message.includes('brAInwav starting step: alpha'),
		);
		expect(startLog).toBeDefined();
		const [startMessage, startMetadata] = startLog ?? [];
		expect(startMessage).toContain('brAInwav');
		expect(startMetadata).toMatchObject({ brand: 'brAInwav', workflowId: 'brAInwav-harness' });

		const metricLog = warnSpy.mock.calls.find(
			([message]) =>
				typeof message === 'string' && message.includes('brAInwav metrics: step=alpha'),
		);
		expect(metricLog).toBeDefined();
		const [metricMessage] = metricLog ?? [];
		expect(metricMessage).toContain('brAInwav metrics: step=alpha');
	});
});
